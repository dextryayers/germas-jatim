<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use App\Models\ReportingSetting;

class MaintenanceController extends Controller
{
    public function status()
    {
        // Soft maintenance mode: baca status dari flag yang disimpan di storage
        $flagPath = storage_path('framework/maintenance-soft.json');
        $enabled = false;

        if (File::exists($flagPath)) {
            try {
                $data = json_decode(File::get($flagPath), true, 512, JSON_THROW_ON_ERROR);
                $enabled = (bool) ($data['enabled'] ?? false);
            } catch (\Throwable $e) {
                $enabled = false;
            }
        }

        return response()->json([
            'enabled' => $enabled,
            'mode' => 'soft',
        ]);
    }

    public function enable()
    {
        // Soft maintenance mode: simpan flag di storage tanpa mematikan seluruh aplikasi (tanpa Artisan down)
        $flagPath = storage_path('framework/maintenance-soft.json');

        try {
            File::ensureDirectoryExists(dirname($flagPath));
            File::put($flagPath, json_encode(['enabled' => true], JSON_THROW_ON_ERROR));
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengaktifkan soft maintenance mode.',
            ], 500);
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Soft maintenance mode enabled',
        ]);
    }

    public function disable()
    {
        $flagPath = storage_path('framework/maintenance-soft.json');

        try {
            if (File::exists($flagPath)) {
                File::delete($flagPath);
            }
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menonaktifkan soft maintenance mode.',
            ], 500);
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Soft maintenance mode disabled',
        ]);
    }

    public function backup()
    {
        try {
            // Jalankan proses backup database menggunakan Spatie Laravel Backup
            // Pastikan paket dan konfigurasi sudah benar di config/backup.php
            Artisan::call('backup:run', [
                '--only-db' => true,
                '--disable-notifications' => true,
            ]);

            // Lokasi default backup pada disk "local" (sesuai konfigurasi Spatie)
            $backupPath = storage_path('app/private/Web Germas');

            if (! File::exists($backupPath)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Folder backup tidak ditemukan. Periksa konfigurasi backup.',
                ], 500);
            }

            $files = collect(File::files($backupPath))
                ->sortByDesc(function ($file) {
                    return $file->getMTime();
                })
                ->values();

            if ($files->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'File backup tidak ditemukan. Periksa konfigurasi backup.',
                ], 500);
            }

            $latestBackup = $files->first();
            $absolutePath = $latestBackup->getRealPath();
            $filename = $latestBackup->getFilename();

            $projectRoot = base_path();
            $relativePath = str_starts_with($absolutePath, $projectRoot)
                ? ltrim(substr($absolutePath, strlen($projectRoot)), DIRECTORY_SEPARATOR)
                : $absolutePath;

            // Catat waktu backup terakhir ke konfigurasi global bila tersedia
            $setting = ReportingSetting::query()->latest('id')->first();
            if ($setting) {
                $setting->last_backup_at = now();
                $setting->save();
            }

            return response()->json([
                'status' => 'ok',
                'message' => 'Backup database berhasil dibuat.',
                'filename' => $filename,
                'absolute_path' => $absolutePath,
                'relative_path' => $relativePath,
                'last_backup_at' => $setting && $setting->last_backup_at ? $setting->last_backup_at->toIso8601String() : null,
            ]);
        } catch (\Throwable $e) {
            // Pastikan selalu mengembalikan JSON agar frontend tidak gagal parse karena HTML error page
            report($e);

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat membuat backup database. Periksa log server untuk detail lebih lanjut.',
            ], 500);
        }
    }
}