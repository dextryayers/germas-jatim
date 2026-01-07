<?php

namespace Database\Seeders;

use App\Models\Instansi;
use App\Models\InstansiLevel;
use App\Models\LaporanSection;
use App\Models\LaporanTemplate;
use Illuminate\Database\Seeder;

class LaporanSectionImportSeeder extends Seeder
{
    /**
     * Struktur JSON yang diharapkan (contoh):
     * [
     *   {
     *     "level_code": "provinsi",           // "provinsi" atau "kab_kota"
     *     "instansi_name": "Dinas Kesehatan",
     *     "year": 2025,                        // informasi tahun (dipakai untuk log),
     *                                           // namun section akan dimasukkan ke template dasar (year = null)
     *     "sections": [
     *       {
     *         "code": "DKES-1",              // optional
     *         "title": "Kabupaten Kota yang melakukan kampanye kesehatan (Pembudayaan Germas)",
     *         "indicator": "Persentase kabupaten/kota yang melakukan kampanye kesehatan (Pembudayaan Germas)",
     *         "has_target": true,             // optional, default true
     *         "has_budget": true              // optional, default true
     *       }
     *     ]
     *   }
     * ]
     */
    public function run(): void
    {
        $path = storage_path('app/laporan_sections.json');

        if (! file_exists($path)) {
            $this->command?->warn('File JSON tidak ditemukan: ' . $path);
            return;
        }

        $raw = file_get_contents($path);
        $data = json_decode($raw, true);

        if (! is_array($data)) {
            $this->command?->error('Format JSON tidak valid. Harus berupa array di level teratas.');
            return;
        }

        $levels = InstansiLevel::whereIn('code', ['provinsi', 'kab_kota'])->get()->keyBy('code');

        foreach ($data as $entry) {
            $levelCode = $entry['level_code'] ?? null;
            $instansiName = $entry['instansi_name'] ?? null;
            $year = $entry['year'] ?? null;
            $sections = $entry['sections'] ?? [];

            if (! $levelCode || ! $instansiName || ! $year || ! is_array($sections)) {
                $this->command?->warn('Entry dilewati karena field wajib tidak lengkap: ' . json_encode($entry));
                continue;
            }

            $level = $levels->get($levelCode);
            if (! $level) {
                $this->command?->warn('InstansiLevel dengan code ' . $levelCode . ' tidak ditemukan. Entry dilewati.');
                continue;
            }

            $instansi = Instansi::where('name', $instansiName)
                ->where('level_id', $level->id)
                ->first();

            if (! $instansi) {
                $this->command?->warn('Instansi "' . $instansiName . '" untuk level ' . $levelCode . ' tidak ditemukan. Entry dilewati.');
                continue;
            }

            /** @var LaporanTemplate|null $template */
            // Import section ke template dasar (year = null) agar kegiatan/indikator bisa dipakai lintas tahun.
            $template = LaporanTemplate::where('instansi_id', $instansi->id)
                ->where('instansi_level_id', $level->id)
                ->whereNull('year')
                ->first();

            if (! $template) {
                $this->command?->warn('Template dasar laporan (year = null) untuk ' . $instansiName . ' tidak ditemukan. Pastikan LaporanTemplateSeeder sudah dijalankan.');
                continue;
            }

            // Hapus semua section lama milik template ini, lalu isi ulang dari JSON
            LaporanSection::where('template_id', $template->id)->delete();

            $sequence = 1;
            foreach ($sections as $sectionData) {
                $title = $sectionData['title'] ?? null;
                $indicator = $sectionData['indicator'] ?? null;

                if (! $title || ! $indicator) {
                    $this->command?->warn('Section dilewati karena tidak punya title/indicator: ' . json_encode($sectionData));
                    continue;
                }

                LaporanSection::create([
                    'template_id' => $template->id,
                    'code' => $sectionData['code'] ?? null,
                    'title' => $title,
                    'indicator' => $indicator,
                    'has_target' => array_key_exists('has_target', $sectionData)
                        ? (bool) $sectionData['has_target']
                        : true,
                    'has_budget' => array_key_exists('has_budget', $sectionData)
                        ? (bool) $sectionData['has_budget']
                        : true,
                    'sequence' => $sequence++,
                ]);
            }

            $this->command?->info('Berhasil mengimpor ' . ($sequence - 1) . ' section untuk ' . $instansiName . ' (' . $levelCode . ') ke template dasar (year = null), sumber data tahun ' . $year . '.');
        }
    }
}
