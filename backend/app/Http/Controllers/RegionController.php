<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProvinceResource;
use App\Http\Resources\RegencyResource;
use App\Models\District;
use App\Models\Province;
use App\Models\Regency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $provinceCode = $request->input('province_code', '35');
        $search = $request->input('search');
        $type = $request->input('type');

        $province = Province::query()
            ->where('code', $provinceCode)
            ->withCount(['regencies', 'districts', 'villages'])
            ->firstOrFail();

        $regenciesQuery = $province->regencies()->withCount(['districts', 'villages'])->orderBy('name');

        if ($search) {
            $regenciesQuery->where('name', 'like', '%' . $search . '%');
        }

        if ($type && in_array($type, ['kabupaten', 'kota'], true)) {
            $regenciesQuery->where('type', $type);
        }

        $regencies = $regenciesQuery->get();

        $regencyCount = $regencies->count();
        $districtCount = $regencies->sum('districts_count');
        $villageCount = $regencies->sum('villages_count');

        return response()->json([
            'province' => new ProvinceResource($province),
            'regencies' => RegencyResource::collection($regencies),
            'summary' => [
                'regencies' => $regencyCount,
                'districts' => $districtCount,
                'villages' => $villageCount,
            ],
        ]);
    }

    public function districts(Regency $regency): JsonResponse
    {
        $regency->loadCount(['districts', 'villages']);
        $regency->load(['districts' => function ($query) {
            $query->orderBy('name')->withCount('villages')->with(['villages' => function ($villageQuery) {
                $villageQuery->orderBy('name');
            }]);
        }]);

        return response()->json([
            'regency' => new RegencyResource($regency),
            'districts' => $regency->districts->map(function (District $district) {
                return [
                    'id' => $district->id,
                    'code' => $district->code,
                    'name' => $district->name,
                    'village_count' => $district->villages_count,
                    'villages' => $district->villages->map(fn ($village) => [
                        'id' => $village->id,
                        'code' => $village->code,
                        'name' => $village->name,
                    ])->toArray(),
                ];
            })->toArray(),
        ]);
    }

    public function villages(District $district): JsonResponse
    {
        $district->load(['regency', 'villages' => function ($query) {
            $query->orderBy('name');
        }]);

        return response()->json([
            'district' => [
                'id' => $district->id,
                'code' => $district->code,
                'name' => $district->name,
                'regency' => [
                    'id' => $district->regency->id,
                    'name' => $district->regency->name,
                    'code' => $district->regency->code,
                ],
            ],
            'villages' => $district->villages->map(fn ($village) => [
                'id' => $village->id,
                'code' => $village->code,
                'name' => $village->name,
            ])->toArray(),
        ]);
    }
}
