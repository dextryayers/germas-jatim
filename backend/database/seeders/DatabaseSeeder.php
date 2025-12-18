<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\InstansiLevel;
use App\Models\Instansi;
use App\Models\EvaluationCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $levels = [
            ['code' => 'provinsi', 'name' => 'Instansi Tingkat Provinsi'],
            ['code' => 'kab_kota', 'name' => 'Instansi Tingkat Kabupaten / Kota'],
            ['code' => 'kecamatan', 'name' => 'Instansi Tingkat Kecamatan'],
            ['code' => 'kelurahan', 'name' => 'Instansi Tingkat Kelurahan / Desa'],
            ['code' => 'perusahaan', 'name' => 'Instansi Tingkat Perusahaan'],
        ];

        $levelMap = collect($levels)->mapWithKeys(function ($item) {
            $level = InstansiLevel::firstOrCreate(
                ['code' => $item['code']],
                ['name' => $item['name']]
            );

            return [$item['code'] => $level->id];
        });

        $instansiList = [
            ['name' => 'Dinas Kesehatan Provinsi Jawa Timur', 'category' => 'dinas', 'level_code' => 'provinsi'],
            ['name' => 'Badan Perencanaan Pembangunan Daerah', 'category' => 'badan', 'level_code' => 'provinsi'],
            ['name' => 'Dinas Pendidikan Provinsi Jawa Timur', 'category' => 'dinas', 'level_code' => 'provinsi'],
        ];

        $instansiMap = collect($instansiList)->mapWithKeys(function ($item) use ($levelMap) {
            $slug = Str::slug($item['name']);
            $instansi = Instansi::firstOrCreate(
                ['slug' => $slug],
                [
                    'name' => $item['name'],
                    'category' => $item['category'],
                    'level_id' => $levelMap[$item['level_code']] ?? null,
                    'is_active' => true,
                ]
            );

            return [$item['name'] => $instansi->id];
        });

        $categories = [
            ['slug' => 'baik', 'label' => 'Baik', 'min_score' => 76, 'max_score' => 100, 'color_class' => 'text-emerald-600'],
            ['slug' => 'cukup', 'label' => 'Cukup', 'min_score' => 50, 'max_score' => 75, 'color_class' => 'text-yellow-600'],
            ['slug' => 'kurang', 'label' => 'Kurang', 'min_score' => 0, 'max_score' => 49, 'color_class' => 'text-red-600'],
        ];

        foreach ($categories as $category) {
            EvaluationCategory::firstOrCreate(
                ['slug' => $category['slug']],
                [
                    'label' => $category['label'],
                    'description' => $category['label'],
                    'min_score' => $category['min_score'],
                    'max_score' => $category['max_score'],
                    'color_class' => $category['color_class'],
                ]
            );
        }

        User::firstOrCreate(
            ['email' => 'superadmin@germas.jatim.id'],
            [
                'name' => 'Super Admin Germas',
                'password' => Hash::make('Germas#2025'),
                'role' => 'super_admin',
                'instansi_id' => $instansiMap['Dinas Kesehatan Provinsi Jawa Timur'] ?? null,
                'instansi_level_id' => $levelMap['provinsi'] ?? null,
                'email_verified_at' => now(),
            ]
        );
    }
}
