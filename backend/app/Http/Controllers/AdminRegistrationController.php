<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\AdminInviteCode;
use App\Models\District;
use App\Models\Instansi;
use App\Models\InstansiLevel;
use App\Models\Regency;
use App\Models\User;
use App\Models\Village;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminRegistrationController extends Controller
{
    public function validateCode(Request $request): JsonResponse
    {
        $code = trim((string) $request->input('code', ''));

        if ($code === '') {
            return response()->json([
                'message' => 'Kode admin wajib diisi.',
            ], 422);
        }

        $pattern = config('registration.code_pattern', '^\\d{6}$');
        $delimitedPattern = sprintf('/%s/u', str_replace('/', '\/', $pattern));

        if (@preg_match($delimitedPattern, '') === false) {
            return response()->json([
                'message' => 'Konfigurasi pola kode admin tidak valid.',
            ], 500);
        }

        if (preg_match($delimitedPattern, $code) !== 1) {
            return response()->json([
                'message' => 'Format kode admin tidak sesuai. Gunakan 6 digit angka.',
            ], 422);
        }

        $staticCodes = config('registration.static_codes', []);
        if (in_array($code, $staticCodes, true)) {
            return response()->json([
                'valid' => true,
                'code' => $code,
                'instansi' => null,
                'instansi_level' => null,
                'description' => config('registration.static_code_description', 'Kode admin registrasi'),
                'expires_at' => null,
                'source' => 'static',
            ]);
        }

        $invite = AdminInviteCode::with(['instansi', 'instansiLevel'])
            ->where('code', $code)
            ->first();

        if (! $invite) {
            return response()->json([
                'message' => 'Kode admin tidak terdaftar. Hubungi Dinas Provinsi untuk mendapatkan kode terbaru.',
            ], 404);
        }

        if ($invite->is_used) {
            return response()->json([
                'message' => 'Kode admin sudah digunakan. Mohon minta kode baru.',
            ], 409);
        }

        if ($invite->expires_at && now()->greaterThan($invite->expires_at)) {
            return response()->json([
                'message' => 'Kode admin sudah kedaluwarsa. Mohon minta kode baru.',
            ], 410);
        }

        return response()->json([
            'valid' => true,
            'code' => $invite->code,
            'instansi' => $invite->instansi?->only(['id', 'name', 'slug', 'category']),
            'instansi_level' => $invite->instansiLevel?->only(['id', 'code', 'name']),
            'description' => $invite->description,
            'expires_at' => optional($invite->expires_at)->toIso8601String(),
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $maxPhotoSizeKb = (int) config('registration.photo_max_size_kb', 2048);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class, 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone' => ['nullable', 'string', 'max:30'],
            'admin_code' => ['required', 'string'],
            'instansi_id' => ['nullable', Rule::exists(Instansi::class, 'id')],
            'instansi_level_id' => ['nullable', Rule::exists(InstansiLevel::class, 'id')],
            'origin_regency_id' => ['nullable', Rule::exists(Regency::class, 'id')],
            'origin_district_id' => ['nullable', Rule::exists(District::class, 'id')],
            'origin_village_id' => ['nullable', Rule::exists(Village::class, 'id')],
            'instansi_name' => ['required_without:instansi_id', 'string', 'max:255'],
            'instansi_level_text' => ['nullable', 'string', 'max:150'],
            'photo' => ['nullable', 'image', "max:{$maxPhotoSizeKb}"],
        ]);

        $instansiName = trim((string) ($data['instansi_name'] ?? ''));
        $instansiLevelText = trim((string) ($data['instansi_level_text'] ?? ''));

        unset($data['instansi_name'], $data['instansi_level_text']);

        $pattern = config('registration.code_pattern', '^\\d{6}$');
        $delimitedPattern = sprintf('/%s/u', str_replace('/', '\/', $pattern));
        if (preg_match($delimitedPattern, $data['admin_code']) !== 1) {
            return response()->json([
                'message' => 'Format kode admin tidak sesuai. Gunakan 6 digit angka.',
            ], 422);
        }

        $staticCodes = config('registration.static_codes', []);
        $isStaticCode = in_array($data['admin_code'], $staticCodes, true);

        $photoPath = null;

        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('admin-photos', 'public');
        }

        try {
            $user = DB::transaction(function () use ($data, $photoPath, $isStaticCode, $instansiName, $instansiLevelText) {
                $invite = null;

                if (! $isStaticCode) {
                    $invite = AdminInviteCode::with(['instansi', 'instansiLevel'])
                        ->where('code', $data['admin_code'])
                        ->lockForUpdate()
                        ->first();

                    if (! $invite) {
                        abort(404, 'Kode admin tidak ditemukan atau sudah tidak berlaku.');
                    }

                    if ($invite->is_used) {
                        abort(409, 'Kode admin sudah digunakan. Mohon ajukan kode baru ke administrator provinsi.');
                    }

                    if ($invite->expires_at && now()->greaterThan($invite->expires_at)) {
                        abort(410, 'Kode admin sudah kedaluwarsa. Mohon ajukan kode baru ke administrator provinsi.');
                    }
                }

                $instansiLevelId = $data['instansi_level_id'] ?? null;
                if (! $instansiLevelId && $instansiLevelText !== '') {
                    $level = InstansiLevel::query()
                        ->where('name', $instansiLevelText)
                        ->first();

                    if (! $level) {
                        $baseCode = Str::upper(Str::slug($instansiLevelText, '_')) ?: 'LEVEL_' . Str::upper(Str::random(4));
                        $codeCandidate = $baseCode;
                        $suffix = 1;

                        while (InstansiLevel::query()->where('code', $codeCandidate)->exists()) {
                            $codeCandidate = sprintf('%s_%d', $baseCode, $suffix++);
                        }

                        $level = InstansiLevel::create([
                            'code' => $codeCandidate,
                            'name' => $instansiLevelText,
                        ]);
                    }

                    $instansiLevelId = $level->id;
                }

                $instansiId = $data['instansi_id'] ?? null;
                if (! $instansiId && $instansiName !== '') {
                    $instansi = Instansi::query()
                        ->where('name', $instansiName)
                        ->first();

                    if (! $instansi) {
                        $baseSlug = Str::slug($instansiName) ?: 'instansi-' . Str::lower(Str::random(8));
                        $slugCandidate = $baseSlug;
                        $suffix = 1;

                        while (Instansi::query()->where('slug', $slugCandidate)->exists()) {
                            $slugCandidate = sprintf('%s-%d', $baseSlug, $suffix++);
                        }

                        $instansi = Instansi::create([
                            'slug' => $slugCandidate,
                            'name' => $instansiName,
                            'category' => 'lain',
                            'level_id' => $instansiLevelId,
                            'is_active' => true,
                        ]);
                    }

                    $instansiId = $instansi->id;
                }

                $resolvedInstansiId = $invite?->instansi_id ?? $instansiId;
                $resolvedInstansiLevelId = $invite?->instansi_level_id ?? $instansiLevelId;

                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'phone' => $data['phone'] ?? null,
                    'role' => 'admin',
                    'instansi_id' => $resolvedInstansiId,
                    'instansi_level_id' => $resolvedInstansiLevelId,
                    'origin_regency_id' => $data['origin_regency_id'] ?? null,
                    'origin_district_id' => $data['origin_district_id'] ?? null,
                    'origin_village_id' => $data['origin_village_id'] ?? null,
                    'admin_code' => $invite->code ?? $data['admin_code'],
                    'photo_url' => $photoPath,
                    'email_verified_at' => now(),
                ]);

                if ($invite) {
                    $invite->fill([
                        'is_used' => true,
                        'used_by' => $user->id,
                        'used_at' => now(),
                    ])->save();
                }

                return $user;
            });
        } catch (\Throwable $e) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }

            throw $e;
        }

        $token = $user->createToken('germas_access_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Registrasi admin berhasil.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => UserResource::make($user->load(['instansi', 'instansiLevel', 'originRegency', 'originDistrict', 'originVillage']))->resolve(),
        ], 201);
    }
}
