<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\ReportingSetting;

class ReportingSettingsController extends Controller
{
    public function show()
    {
        $setting = ReportingSetting::query()->latest('id')->first();

        if (! $setting) {
            return response()->json([
                'reporting_year' => (int) date('Y'),
                'reporting_deadline' => null,
                'last_backup_at' => null,
            ]);
        }

        return response()->json([
            'reporting_year' => $setting->reporting_year,
            'reporting_deadline' => $setting->reporting_deadline ? $setting->reporting_deadline->format('Y-m-d') : null,
            'last_backup_at' => $setting->last_backup_at ? $setting->last_backup_at->toIso8601String() : null,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reporting_year' => ['required', 'integer', 'between:2000,2100'],
            'reporting_deadline' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $setting = ReportingSetting::create([
            'reporting_year' => $data['reporting_year'],
            'reporting_deadline' => $data['reporting_deadline'] ?? null,
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Pengaturan periode pelaporan berhasil disimpan.',
            'data' => [
                'reporting_year' => $setting->reporting_year,
                'reporting_deadline' => $setting->reporting_deadline ? $setting->reporting_deadline->format('Y-m-d') : null,
                'last_backup_at' => $setting->last_backup_at ? $setting->last_backup_at->toIso8601String() : null,
            ],
        ]);
    }
}
