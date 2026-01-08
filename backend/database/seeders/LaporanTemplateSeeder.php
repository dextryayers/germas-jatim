<?php

namespace Database\Seeders;

use App\Models\Instansi;
use App\Models\InstansiLevel;
use App\Models\LaporanTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LaporanTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // Template dasar laporan per instansi per level, tanpa sections.
        // Detail kegiatan & indikator dikelola melalui manajemen formulir (endpoint saveLaporan).

        $levels = InstansiLevel::whereIn('code', ['provinsi', 'kab_kota'])->get()->keyBy('code');

        if ($levels->isEmpty()) {
            return;
        }

        $years = [2025, 2026];

        foreach (['provinsi', 'kab_kota'] as $code) {
            $level = $levels->get($code);
            if (! $level) {
                continue;
            }

            $instansis = Instansi::where('level_id', $level->id)->where('is_active', true)->get();

            foreach ($instansis as $instansi) {
                // 1) Satu template dasar per instansi per level (tanpa tahun)
                LaporanTemplate::firstOrCreate(
                    [
                        'instansi_id' => $instansi->id,
                        'instansi_level_id' => $level->id,
                        'year' => null,
                        'is_default' => true,
                    ],
                    [
                        'name' => 'Template Laporan Tahunan - ' . $instansi->name,
                        'description' => 'Template dasar laporan tahunan untuk ' . $instansi->name . ' (' . $level->name . ')',
                        'is_active' => true,
                    ]
                );

                // 2) Template per tahun (mis. 2025 dan 2026) yang dapat diedit via manajemen formulir
                foreach ($years as $year) {
                    LaporanTemplate::firstOrCreate(
                        [
                            'instansi_id' => $instansi->id,
                            'instansi_level_id' => $level->id,
                            'year' => $year,
                            'is_default' => true,
                        ],
                        [
                            'name' => 'Template Laporan Tahunan ' . $year . ' - ' . $instansi->name,
                            'description' => 'Template laporan tahunan tahun ' . $year . ' untuk ' . $instansi->name . ' (' . $level->name . ')',
                            'is_active' => true,
                        ]
                    );
                }
            }
        }
    }
}
