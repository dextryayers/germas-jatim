<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\District;
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
        $delimitedPattern = sprintf('/%s/u', str_replace('/', '\\/', $pattern));

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

        // Validasi berdasarkan konfigurasi kode per level saja
        $codesPerLevel = config('registration.admin_codes_per_level', []);

        if (in_array($code, $codesPerLevel, true)) {
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

        return response()->json([
            'message' => 'Kode admin tidak terdaftar. Hubungi Dinas Provinsi untuk mendapatkan kode terbaru.',
        ], 404);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:50', Rule::unique(User::class, 'username')],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class, 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'admin_code' => ['required', 'string'],
            'level_code' => ['required', 'string', 'max:100'],
            'origin_regency_id' => ['nullable', Rule::exists(Regency::class, 'id')],
            'origin_district_id' => ['nullable', Rule::exists(District::class, 'id')],
            'origin_village_id' => ['nullable', Rule::exists(Village::class, 'id')],
        ]);

        // Validasi format kode admin (6 digit) dan kecocokan dengan level
        $pattern = config('registration.code_pattern', '^\\d{6}$');
        $delimitedPattern = sprintf('/%s/u', str_replace('/', '\\/', $pattern));
        if (preg_match($delimitedPattern, $data['admin_code']) !== 1) {
            return response()->json([
                'message' => 'Format kode admin tidak sesuai. Gunakan 6 digit angka.',
            ], 422);
        }

        // level_code dari frontend diharapkan sama persis dengan kolom instansi_levels.code
        $levelCode = trim($data['level_code']);
        $level = InstansiLevel::query()->where('code', $levelCode)->first();
        if (! $level) {
            return response()->json([
                'message' => 'Tingkat instansi tidak dikenali.',
            ], 422);
        }

        $codesPerLevel = config('registration.admin_codes_per_level', []);
        // Pemetaan eksplisit dari kode di database ke key konfigurasi.
        // Database: provinsi, kab_kota, kecamatan, kelurahan
        // Config:   PROVINSI, KABKOTA, KECAMATAN, KELDESA
        $levelKeyMap = [
            'provinsi' => 'PROVINSI',
            'kab_kota' => 'KABKOTA',
            'kecamatan' => 'KECAMATAN',
            'kelurahan' => 'KELDESA',
        ];

        $levelKey = $levelKeyMap[$level->code] ?? strtoupper($level->code);
        $expectedCode = $codesPerLevel[$levelKey] ?? null;

        if ($expectedCode === null || $data['admin_code'] !== $expectedCode) {
            return response()->json([
                'message' => 'Kode admin tidak sesuai untuk tingkat instansi yang dipilih.',
            ], 422);
        }

        // Tentukan role berdasarkan tingkat instansi
        $roleByLevelCode = [
            'provinsi' => 'admin_provinsi',
            'kab_kota' => 'admin_kabkota',
            'kecamatan' => 'admin_kecamatan',
            'kelurahan' => 'admin_kelurahan', // mencakup desa/kelurahan
        ];

        $resolvedRole = $roleByLevelCode[$level->code] ?? 'admin';

        $user = User::create([
            'username' => $data['username'],
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $resolvedRole,
            'instansi_id' => null,
            'instansi_level_id' => $level->id,
            'origin_regency_id' => $data['origin_regency_id'] ?? null,
            'origin_district_id' => $data['origin_district_id'] ?? null,
            'origin_village_id' => $data['origin_village_id'] ?? null,
            'admin_code' => $data['admin_code'],
            'phone' => null,
            'photo_url' => null,
            'email_verified_at' => now(),
        ]);

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
