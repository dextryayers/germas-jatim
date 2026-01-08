<?php

namespace Database\Seeders;

use App\Models\EvaluasiCluster;
use App\Models\EvaluasiQuestion;
use App\Models\InstansiLevel;
use Illuminate\Database\Seeder;

class EvaluasiTemplateImportSeeder extends Seeder
{
    /**
     * Struktur JSON yang diharapkan (evaluasi_templates.json):
     * [
     *   {
     *     "level_code": "provinsi" | "kab_kota" | "kecamatan" | "kelurahan_desa" | "perusahaan",
     *     "clusters": [
     *       {
     *         "title": "...",
     *         "questions": ["pertanyaan 1", "pertanyaan 2", ...]
     *       }
     *     ]
     *   }
     * ]
     */
    public function run(): void
    {
        $path = storage_path('app/evaluasi_templates.json');

        if (! file_exists($path)) {
            $this->command?->warn('File JSON evaluasi tidak ditemukan: ' . $path);
            return;
        }

        $raw = file_get_contents($path);
        $data = json_decode($raw, true);

        if (! is_array($data)) {
            $this->command?->error('Format JSON evaluasi tidak valid. Harus berupa array di level teratas.');
            return;
        }

        $levels = InstansiLevel::whereIn('code', ['provinsi', 'kab_kota', 'kecamatan', 'kelurahan_desa', 'perusahaan'])
            ->get()
            ->keyBy('code');

        foreach ($data as $entry) {
            $levelCode = $entry['level_code'] ?? null;
            $clusters = $entry['clusters'] ?? [];

            if (! $levelCode || ! is_array($clusters)) {
                $this->command?->warn('Entry evaluasi dilewati karena field wajib tidak lengkap: ' . json_encode($entry));
                continue;
            }

            $level = $levels->get($levelCode);
            if (! $level) {
                $this->command?->warn('InstansiLevel dengan code ' . $levelCode . ' tidak ditemukan. Entry evaluasi dilewati.');
                continue;
            }

            // Hapus semua cluster & question untuk level ini terlebih dahulu
            $existingClusters = EvaluasiCluster::where('instansi_level_id', $level->id)->get();
            foreach ($existingClusters as $cluster) {
                EvaluasiQuestion::where('cluster_id', $cluster->id)->delete();
                $cluster->delete();
            }

            $sequence = 1;
            foreach ($clusters as $clusterData) {
                $title = $clusterData['title'] ?? null;
                $questions = $clusterData['questions'] ?? [];

                if (! $title || ! is_array($questions)) {
                    $this->command?->warn('Cluster evaluasi dilewati karena tidak punya title/questions: ' . json_encode($clusterData));
                    continue;
                }

                $cluster = EvaluasiCluster::create([
                    'instansi_level_id' => $level->id,
                    'title' => $title,
                    'sequence' => $sequence++,
                    'is_active' => true,
                    'applies_to_all' => false,
                ]);

                $qSequence = 1;
                foreach ($questions as $qText) {
                    if (! $qText) {
                        continue;
                    }

                    EvaluasiQuestion::create([
                        'cluster_id' => $cluster->id,
                        'question_text' => $qText,
                        'sequence' => $qSequence++,
                        'is_active' => true,
                    ]);
                }

                $this->command?->info('Berhasil mengimpor ' . ($qSequence - 1) . ' pertanyaan untuk klaster "' . $title . '" (' . $levelCode . ').');
            }
        }
    }
}
