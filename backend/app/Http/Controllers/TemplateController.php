<?php

namespace App\Http\Controllers;

use App\Http\Resources\EvaluasiClusterResource;
use App\Http\Resources\LaporanTemplateResource;
use App\Models\EvaluasiCluster;
use App\Models\LaporanTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function evaluasi(Request $request): JsonResponse
    {
        $levelId = $request->integer('instansi_level_id');
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

    public function laporan(Request $request): JsonResponse
    {
        $levelId = $request->integer('instansi_level_id');
        $instansiId = $request->integer('instansi_id');
        $year = $request->integer('year');

        $query = LaporanTemplate::query()->with(['sections' => function ($builder) {
            $builder->orderBy('sequence');
        }])->where('is_active', true);

        if ($levelId) {
            $query->where(function ($builder) use ($levelId) {
                $builder->whereNull('instansi_level_id')
                    ->orWhere('instansi_level_id', $levelId);
            });
        }

        if ($instansiId) {
            $query->where(function ($builder) use ($instansiId) {
                $builder->whereNull('instansi_id')
                    ->orWhere('instansi_id', $instansiId);
            });
        }

        if ($year) {
            $query->where(function ($builder) use ($year) {
                $builder->whereNull('year')->orWhere('year', $year);
            });
        }

        $templates = $query->orderByDesc('is_default')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'data' => LaporanTemplateResource::collection($templates),
        ]);
    }
}
