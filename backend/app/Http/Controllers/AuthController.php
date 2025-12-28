<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 3;
    private const BLOCK_DURATION = 1800; // seconds

    private $motivationalQuotes = [
        'Tetap semangat, setiap tantangan adalah peluang untuk tumbuh.',
        'Bangkit lagi, kerja baikmu sangat berarti bagi banyak orang.',
        'Istirahat sebentar, lalu kembali dengan strategi yang lebih kuat.',
        'Kamu hebat! Kegagalan hanyalah bagian dari proses belajar.',
        'Percaya diri, hari ini masih bisa jadi luar biasa.',
        'Tetaplah jadi diri sendiri walaupun badai mengguncang duniamu',
        'heyy, haloo, siapa kamu?, balik sekarang tumbuhkan skillmu itu lagi',
    ];

    public function login(Request $request): JsonResponse
    {
        $ip = $request->ip();
        $blockKey = $this->blockKey($ip);

        if (Cache::has($blockKey)) {
            return $this->forbiddenResponse($ip, Cache::get($blockKey));
        }

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = $this->attemptLogin($credentials);

        if (! $user) {
            $attemptState = $this->storeFailedAttempt($ip);

            if ($attemptState['blocked']) {
                return $this->forbiddenResponse($ip, $attemptState['payload']);
            }

            return response()->json([
                'status' => 'unauthorized',
                'message' => 'Kombinasi email / password tidak sesuai.',
                'remaining_attempts' => max(self::MAX_ATTEMPTS - $attemptState['attempts'], 0),
            ], 401);
        }

        $this->resetAttempts($ip);

        $token = $user->createToken('germas_access_token')->plainTextToken;
        $user->forceFill(['last_login_at' => Carbon::now()])->save();

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => UserResource::make($user->fresh(['instansi', 'instansiLevel', 'originRegency', 'originDistrict', 'originVillage']))->resolve(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['instansi', 'instansiLevel', 'originRegency', 'originDistrict', 'originVillage']);

        return response()->json([
            'status' => 'success',
            'user' => UserResource::make($user)->resolve(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $token = $user->currentAccessToken();

            if ($token) {
                $token->delete();
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Token berhasil dicabut.',
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user = $request->user();
        $user->forceFill([
            'name' => $payload['name'],
            'phone' => $payload['phone'] ?? null,
        ])->save();

        $user = $user->fresh(['instansi', 'instansiLevel', 'originRegency', 'originDistrict', 'originVillage']);

        return response()->json([
            'status' => 'success',
            'message' => 'Profil berhasil diperbarui.',
            'user' => UserResource::make($user)->resolve(),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (! Hash::check($payload['current_password'], $user->password)) {
            return response()->json([
                'status' => 'unprocessable_entity',
                'message' => 'Password lama tidak sesuai.',
                'errors' => [
                    'current_password' => ['Password lama tidak sesuai.'],
                ],
            ], 422);
        }

        $user->forceFill([
            'password' => $payload['password'],
        ])->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Password berhasil diubah.',
        ]);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'photo' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $file = $payload['photo'];

        $path = $file->storePublicly('profile-photos', ['disk' => 'public']);

        $old = $user->photo_url;
        if ($old && ! str_starts_with($old, 'http://') && ! str_starts_with($old, 'https://') && ! str_starts_with($old, '//')) {
            if (Storage::disk('public')->exists($old)) {
                Storage::disk('public')->delete($old);
            }
        }

        $user->forceFill(['photo_url' => $path])->save();
        $user = $user->fresh(['instansi', 'instansiLevel', 'originRegency', 'originDistrict', 'originVillage']);

        return response()->json([
            'status' => 'success',
            'message' => 'Foto profil berhasil diperbarui.',
            'user' => UserResource::make($user)->resolve(),
        ]);
    }

    private function blockKey(string $ip): string
    {
        return sprintf('auth:block:%s', $ip);
    }

    private function attemptsKey(string $ip): string
    {
        return sprintf('auth:attempts:%s', $ip);
    }

    private function attemptsCount(string $ip): int
    {
        return Cache::get($this->attemptsKey($ip), 0);
    }

    private function storeFailedAttempt(string $ip): array
    {
        $attemptsKey = $this->attemptsKey($ip);
        Cache::add($attemptsKey, 0, self::BLOCK_DURATION);
        $attempts = Cache::increment($attemptsKey);

        Cache::put($attemptsKey, $attempts, self::BLOCK_DURATION);

        if ($attempts >= self::MAX_ATTEMPTS) {
            $blockedAt = Carbon::now();
            $blockedUntil = (clone $blockedAt)->addSeconds(self::BLOCK_DURATION);
            $motivation = $this->motivationalQuotes[array_rand($this->motivationalQuotes)];

            $payload = [
                'message' => $motivation,
                'blocked_at' => $blockedAt->toIso8601String(),
                'blocked_until' => $blockedUntil->toIso8601String(),
                'retry_after_seconds' => self::BLOCK_DURATION,
            ];

            Cache::put($this->blockKey($ip), $payload, self::BLOCK_DURATION);

            return [
                'blocked' => true,
                'attempts' => $attempts,
                'payload' => $payload,
            ];
        }

        return [
            'blocked' => false,
            'attempts' => $attempts,
        ];
    }

    private function resetAttempts(string $ip): void
    {
        Cache::forget($this->attemptsKey($ip));
        Cache::forget($this->blockKey($ip));
    }

    private function forbiddenResponse(string $ip, array $payload): JsonResponse
    {
        $blockedUntilIso = $payload['blocked_until'] ?? null;
        $blockedUntil = $blockedUntilIso ? Carbon::parse($blockedUntilIso) : Carbon::now()->addSeconds(self::BLOCK_DURATION);
        $retryAfter = Carbon::now()->diffInSeconds($blockedUntil, false);
        if ($retryAfter < 0) {
            $retryAfter = 0;
        }

        return response()->json([
            'status' => 'blocked',
            'message' => 'Percobaan login melebihi batas. Akses dibatasi sementara.',
            'context' => [
                'ip' => $ip,
                'message' => $payload['message'] ?? 'Akses dibatasi sementara.',
                'blocked_at' => $payload['blocked_at'] ?? Carbon::now()->toIso8601String(),
                'blocked_until' => $blockedUntil->toIso8601String(),
                'retry_after_seconds' => $retryAfter,
            ],
        ], 403);
    }

    private function attemptLogin(array $credentials): ?User
    {
        $user = User::with(['instansi', 'instansiLevel'])
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return null;
        }

        return $user;
    }
}
