<?php

namespace App\Http\Controllers;

use App\Http\Resources\EvaluasiClusterResource;
use App\Http\Resources\LaporanTemplateResource;
use App\Models\EvaluasiCluster;
use App\Models\EvaluasiQuestion;
use App\Models\Instansi;
use App\Models\InstansiLevel;
use App\Models\LaporanTemplate;
use App\Models\LaporanSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TemplateController extends Controller
{
    public function evaluasi(Request $request): JsonResponse
    {
        $levelId = $request->integer('instansi_level_id');

        // Opsional: izinkan frontend mengirim instansi_level_code agar tidak bergantung pada ID numerik
        if (! $levelId) {
            $levelCode = $request->query('instansi_level_code');

            if (is_string($levelCode) && $levelCode !== '') {
                $levelId = InstansiLevel::where('code', $levelCode)->value('id');
            }
        }

        $query = EvaluasiCluster::query()->with(['questions']);

        if ($levelId) {
            $query->where(function ($builder) use ($levelId) {
                $builder->where('instansi_level_id', $levelId)
                    ->orWhere('applies_to_all', true);
            });
        }

        $clusters = $query->orderBy('sequence')->get();

        return response()->json([
            'status' => 'success',
            'data' => EvaluasiClusterResource::collection($clusters),
        ]);
    }

    /**
     * Admin endpoint: simpan konfigurasi klaster & pertanyaan evaluasi secara global.
     * Struktur input yang diharapkan (JSON):
     * {
     *   "clusters": [
     *     {
     *       "id": 1,                // optional, jika null akan dibuat baru
     *       "title": "Judul Klaster",
     *       "questions": [
     *         { "id": 1, "text": "Pertanyaan ..." }, // id optional untuk pertanyaan baru
     *       ]
     *     },
     *     ...
     *   ]
     * }
     */
    public function saveEvaluasi(Request $request): JsonResponse
    {
        $clustersInput = $request->input('clusters', []);
        $levelId = $request->input('instansi_level_id');

        DB::transaction(function () use ($clustersInput, $levelId) {
            // 1) Hapus kluster untuk level ini yang tidak lagi ada di payload
            $incomingClusterIds = collect($clustersInput)
                ->pluck('id')
                ->filter(function ($id) {
                    return $id && is_numeric($id);
                })
                ->map(function ($id) {
                    return (int) $id;
                })
                ->values();

            $clusterQuery = EvaluasiCluster::query();

            if ($levelId) {
                $clusterQuery->where('instansi_level_id', $levelId);
            }

            if ($incomingClusterIds->isNotEmpty()) {
                $clusterQuery->whereNotIn('id', $incomingClusterIds)->delete();
            } else {
                // Jika tidak ada satupun kluster dikirim untuk level ini, hapus semua kluster level tsb
                $clusterQuery->delete();
            }

            // 2) Upsert kluster & pertanyaan
            foreach ($clustersInput as $index => $clusterData) {
                $clusterId = $clusterData['id'] ?? null;

                /** @var EvaluasiCluster|null $cluster */
                $cluster = null;

                if ($clusterId && is_numeric($clusterId)) {
                    $cluster = EvaluasiCluster::find((int) $clusterId);
                }

                if (! $cluster) {
                    $cluster = new EvaluasiCluster();
                }

                if ($levelId) {
                    $cluster->instansi_level_id = $levelId;
                    $cluster->applies_to_all = false;
                }

                $cluster->title = $clusterData['title'] ?? $cluster->title;
                $cluster->sequence = $index + 1;
                $cluster->is_active = true;
                $cluster->save();

                $questionsInput = $clusterData['questions'] ?? [];

                // Kumpulkan id pertanyaan yang dikirim untuk kluster ini
                $incomingQuestionIds = collect($questionsInput)
                    ->pluck('id')
                    ->filter(function ($id) {
                        return $id && is_numeric($id);
                    })
                    ->map(function ($id) {
                        return (int) $id;
                    })
                    ->values();

                if ($incomingQuestionIds->isNotEmpty()) {
                    EvaluasiQuestion::where('cluster_id', $cluster->id)
                        ->whereNotIn('id', $incomingQuestionIds)
                        ->delete();
                } else {
                    EvaluasiQuestion::where('cluster_id', $cluster->id)->delete();
                }

                $sequence = 1;

                foreach ($questionsInput as $questionData) {
                    $questionId = $questionData['id'] ?? null;

                    /** @var EvaluasiQuestion|null $question */
                    $question = null;

                    if ($questionId && is_numeric($questionId)) {
                        $question = EvaluasiQuestion::where('cluster_id', $cluster->id)
                            ->where('id', (int) $questionId)
                            ->first();
                    }

                    if (! $question) {
                        $question = new EvaluasiQuestion();
                        $question->cluster_id = $cluster->id;
                    }

                    $question->question_text = $questionData['text'] ?? $questionData['question_text'] ?? $question->question_text;
                    $question->sequence = $sequence++;
                    $question->is_active = true;
                    $question->save();
                }
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Konfigurasi evaluasi berhasil disimpan.',
        ]);
    }

    public function laporan(Request $request): JsonResponse
    {
        $levelId = $request->integer('instansi_level_id');
        $instansiId = $request->integer('instansi_id');
        $instansiSlug = $request->query('instansi_slug');
        $year = $request->integer('year');

        // Selalu mulai dari template dasar (year = null); tahun hanya opsional.
        $query = LaporanTemplate::query()->with(['sections' => function ($builder) {
            $builder->orderBy('sequence');
        }])->where('is_active', true);

        if ($levelId) {
            $query->where('instansi_level_id', $levelId);
        }

        // Jika frontend mengirim slug instansi, gunakan itu untuk mencari instansi_id
        if (! $instansiId && $instansiSlug) {
            $instansiId = Instansi::where('slug', $instansiSlug)->value('id');
        }

        if ($instansiId) {
            $query->where('instansi_id', $instansiId);
        }

        // Jika frontend mengirim tahun, coba cari template khusus tahun tsb.
        // Namun jika tidak ada, tetap kembalikan template dasar (year = null).
        if ($year) {
            $yearQuery = (clone $query)->where('year', $year);

            $templates = $yearQuery->orderByDesc('is_default')->orderBy('name')->get();

            if ($templates->isEmpty()) {
                // Fallback ke template dasar (tanpa tahun)
                $query->whereNull('year');
                $templates = $query->orderByDesc('is_default')->orderBy('name')->get();
            }
        } else {
            // Tidak ada tahun dikirim: gunakan template dasar saja
            $query->whereNull('year');
            $templates = $query->orderByDesc('is_default')->orderBy('name')->get();
        }

        return response()->json([
            'status' => 'success',
            'data' => LaporanTemplateResource::collection($templates),
        ]);
    }

    /**
     * Simple helper endpoint for frontend: list active instansi, optionally filtered by instansi_level_id.
     */
    public function instansiOptions(Request $request): JsonResponse
    {
        $levelId = $request->integer('instansi_level_id');

        $query = Instansi::query()->where('is_active', true);

        if ($levelId) {
            $query->where('level_id', $levelId);
        }

        $items = $query
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'level_id']);

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    /**
     * Admin endpoint: simpan konfigurasi template laporan dan section-sectionnya.
     * Struktur input yang diharapkan (JSON):
     * {
     *   "name": "Nama Template",
     *   "description": "...",
     *   "year": 2025,
     *   "sections": [
     *     {
     *       "id": 1,           // optional untuk section baru
     *       "code": "A1",     // optional
     *       "title": "Judul Kegiatan",
     *       "indicator": "...",
     *       "has_target": true,
     *       "has_budget": true,
     *     }
     *   ]
     * }
     */
    public function saveLaporan(Request $request, int $id): JsonResponse
    {
        /** @var LaporanTemplate $baseTemplate */
        $baseTemplate = LaporanTemplate::findOrFail($id);

        $name = $request->input('name', $baseTemplate->name);
        $description = $request->input('description', $baseTemplate->description);
        $year = $request->input('year', $baseTemplate->year);

        $instansiLevelId = $request->input('instansi_level_id');
        $instansiId = $request->input('instansi_id');
        $instansiSlug = $request->input('instansi_slug');

        if (! $instansiId && $instansiSlug) {
            $instansiId = Instansi::where('slug', $instansiSlug)->value('id');
        }

        // Tentukan template target berdasarkan kombinasi level + instansi + tahun.
        // Jika tidak ada kombinasi spesifik, gunakan template dasar ($baseTemplate).
        /** @var LaporanTemplate $template */
        $template = $baseTemplate;

        if ($instansiLevelId || $instansiId || $year) {
            $query = LaporanTemplate::query()->where('is_active', true);

            if ($instansiLevelId) {
                $query->where('instansi_level_id', $instansiLevelId);
            }

            if ($instansiId) {
                $query->where('instansi_id', $instansiId);
            }

            if ($year) {
                $query->where('year', $year);
            }

            $existing = $query->first();

            if ($existing) {
                $template = $existing;
            } else {
                // Clone dari template dasar untuk kombinasi baru
                $template = $baseTemplate->replicate([
                    'instansi_id',
                    'instansi_level_id',
                    'year',
                    'name',
                    'description',
                ]);
                $template->instansi_level_id = $instansiLevelId ?: $baseTemplate->instansi_level_id;
                $template->instansi_id = $instansiId ?: $baseTemplate->instansi_id;
                $template->year = $year;
                $template->name = $name;
                $template->description = $description;
                $template->is_default = false;
                $template->save();
            }
        }

        $template->name = $name;
        $template->description = $description;
        $template->year = $year;
        if ($instansiLevelId) {
            $template->instansi_level_id = $instansiLevelId;
        }
        if ($instansiId) {
            $template->instansi_id = $instansiId;
        }
        $template->save();

        $sectionsInput = $request->input('sections', []);

        DB::transaction(function () use ($template, $sectionsInput) {
            $sequence = 1;

            // Kumpulkan ID section yang dikirim dari frontend (hanya yang numeric)
            $incomingIds = collect($sectionsInput)
                ->pluck('id')
                ->filter(function ($id) {
                    return $id && is_numeric($id);
                })
                ->map(function ($id) {
                    return (int) $id;
                })
                ->values();

            // Hapus section yang tidak lagi ada di payload (berarti sudah dihapus di UI)
            if ($incomingIds->isNotEmpty()) {
                LaporanSection::where('template_id', $template->id)
                    ->whereNotIn('id', $incomingIds)
                    ->delete();
            } else {
                // Jika tidak ada satupun section yang dikirim, hapus semua section milik template ini
                LaporanSection::where('template_id', $template->id)->delete();
            }

            foreach ($sectionsInput as $sectionData) {
                $sectionId = $sectionData['id'] ?? null;

                /** @var LaporanSection|null $section */
                $section = null;

                if ($sectionId && is_numeric($sectionId)) {
                    $section = LaporanSection::where('template_id', $template->id)
                        ->where('id', (int) $sectionId)
                        ->first();
                }

                if (!$section) {
                    $section = new LaporanSection();
                    $section->template_id = $template->id;
                }

                $section->code = $sectionData['code'] ?? $section->code;
                $section->title = $sectionData['title'] ?? $section->title;
                $section->indicator = $sectionData['indicator'] ?? $section->indicator;
                $section->has_target = array_key_exists('has_target', $sectionData)
                    ? (bool) $sectionData['has_target']
                    : ($section->has_target ?? true);
                $section->has_budget = array_key_exists('has_budget', $sectionData)
                    ? (bool) $sectionData['has_budget']
                    : ($section->has_budget ?? true);
                $section->sequence = $sequence++;
                $section->save();
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Konfigurasi laporan berhasil disimpan.',
        ]);
    }
}
