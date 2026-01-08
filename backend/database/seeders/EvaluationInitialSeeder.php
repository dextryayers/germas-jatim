<?php

namespace Database\Seeders;

use App\Models\EvaluasiQuestion;
use App\Models\EvaluasiCluster;
use App\Models\EvaluationCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EvaluationInitialSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // 1. Seed kategori nilai (jika belum ada)
            if (EvaluationCategory::count() === 0) {
                EvaluationCategory::insert([
                    [
                        'slug'         => 'kurang',
                        'label'        => 'Kurang',
                        'description'  => 'Nilai < 50',
                        'min_score'    => 0,
                        'max_score'    => 49,
                        'color_class'  => 'text-red-600',
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ],
                    [
                        'slug'         => 'cukup',
                        'label'        => 'Cukup',
                        'description'  => 'Nilai 50–75',
                        'min_score'    => 50,
                        'max_score'    => 75,
                        'color_class'  => 'text-yellow-600',
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ],
                    [
                        'slug'         => 'baik',
                        'label'        => 'Baik',
                        'description'  => 'Nilai > 75',
                        'min_score'    => 76,
                        'max_score'    => 100,
                        'color_class'  => 'text-emerald-600',
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ],
                ]);
            }

            // 2. Bersihkan data lama jika perlu (opsional, hati-hati di production)
            // EvaluasiQuestion::truncate();
            // EvaluasiCluster::truncate();

            // 3. Seed clusters dan questions sesuai DEFAULT_EVALUASI_CLUSTERS di frontend
            $clustersData = [
                1 => [
                    'title' => 'A. Kluster Peningkatan Aktifitas Fisik',
                    'questions' => [
                        1  => 'Melakukan gerakan "Ayo Bergerak" atau senam bersama di tempat kerja secara rutin',
                        2  => 'Menyediakan dan memanfaatkan fasilitas olahraga di tempat kerja',
                        3  => 'Melaksanakan peregangan setiap jam 10.00 WIB dan jam 14.00 WIB minimal 5 menit',
                        4  => 'Menganjurkan penggunaan tangga daripada lift/eskalator (untuk tempat kerja yang memiliki lebih dari 1 lantai)',
                    ],
                ],
                2 => [
                    'title' => 'B. Kluster Peningkatan Perilaku Hidup Sehat',
                    'questions' => [
                        5  => 'Menyediakan sarana dan menerapkan PHBS (Perilaku Hidup Bersih dan Sehat) di tempat kerja;',
                        6  => 'Menerapkan Kawasan Tanpa Rokok (KTR);',
                        7  => 'Menyediakan ruang laktasi di tempat kerja',
                        8  => 'Menyediakan sarana dan fasilitas yang ergonomis di tempat kerja;',
                    ],
                ],
                3 => [
                    'title' => 'PENGELOLAAN PELAKSANAAN GERMAS',
                    'questions' => [
                        9  => 'Adakah Komitmen Pimpinan',
                        10 => 'Adanya Koordinator/Tim Pelaksana tertuang dalam bentuk SK',
                        11 => 'Adanya Perencanaan terintegrasi',
                        12 => 'Adanya Monitoring & Evaluasi',
                    ],
                ],
                4 => [
                    'title' => 'PEMANTAUAN DAN EVALUASI',
                    'questions' => [
                        13 => 'Adakah Komitmen Pimpinan',
                        14 => 'Adanya Koordinator/Tim Pelaksana tertuang dalam bentuk SK',
                        15 => 'Adanya Perencanaan terintegrasi',
                        16 => 'Adanya Monitoring & Evaluasi',
                    ],
                ],
            ];

            foreach ($clustersData as $clusterId => $clusterInfo) {
                // Pastikan cluster dengan ID ini ada (atau buat baru)
                $cluster = EvaluasiCluster::firstOrCreate(
                    ['id' => $clusterId],
                    [
                        'instansi_level_id' => null,
                        'title'             => $clusterInfo['title'],
                        'sequence'          => $clusterId,
                        'is_active'         => true,
                        'applies_to_all'    => true,
                    ]
                );

                foreach ($clusterInfo['questions'] as $questionId => $text) {
                    EvaluasiQuestion::updateOrCreate(
                        ['id' => $questionId],
                        [
                            'cluster_id'    => $cluster->id,
                            'question_text' => $text,
                            'sequence'      => $questionId,
                            'is_active'     => true,
                        ]
                    );
                }
            }
        });
    }
}