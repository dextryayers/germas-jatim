<?php

namespace App\Console\Commands;

use App\Models\District;
use App\Models\Province;
use App\Models\Regency;
use App\Models\Village;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class ImportEastJavaRegions extends Command
{
    protected $signature = 'regions:import-east-java
        {--force : Hapus data wilayah yang sudah ada sebelum impor}
        {--skip-villages : Lewati impor desa (lebih cepat, data tidak lengkap)}';

    protected $description = 'Mengimpor data kabupaten/kota, kecamatan, dan desa Provinsi Jawa Timur dari wilayah.web.id';

    private const PROVINCE_CODE = '35';
    private const BASE_URL = 'https://wilayah.web.id/api';

    public function handle(): int
    {
        $this->info('Memulai impor data wilayah Jawa Timur...');

        try {
            if ($this->option('force')) {
                $this->truncateTables();
            }

            $province = Province::updateOrCreate(
                ['code' => self::PROVINCE_CODE],
                ['name' => 'Jawa Timur']
            );

            $regencyResponse = $this->fetchJson("/regencies/" . self::PROVINCE_CODE);
            $regencyItems = $regencyResponse['data'] ?? $regencyResponse ?? [];

            if (empty($regencyItems)) {
                $this->error('Tidak ada data kabupaten/kota yang diterima.');
                return self::FAILURE;
            }

            DB::beginTransaction();

            foreach ($regencyItems as $regencyItem) {
                $regency = Regency::updateOrCreate(
                    ['code' => $regencyItem['code']],
                    [
                        'province_id' => $province->id,
                        'name' => $regencyItem['name'],
                        'type' => Str::lower($regencyItem['type'] ?? 'kabupaten'),
                    ]
                );

                $this->line("→ {$regency->name}");

                $districtResponse = $this->fetchJson("/districts/" . $regency->code);
                $districtItems = $districtResponse['data'] ?? $districtResponse ?? [];

                foreach ($districtItems as $districtItem) {
                    $district = District::updateOrCreate(
                        ['code' => $districtItem['code']],
                        [
                            'regency_id' => $regency->id,
                            'name' => $districtItem['name'],
                        ]
                    );

                    $this->line("   ↳ {$district->name}");

                    if ($this->option('skip-villages')) {
                        continue;
                    }

                    $villageResponse = $this->fetchJson("/villages/" . $district->code);
                    $villageItems = $villageResponse['data'] ?? $villageResponse ?? [];

                    foreach ($villageItems as $villageItem) {
                        Village::updateOrCreate(
                            ['code' => $villageItem['code']],
                            [
                                'district_id' => $district->id,
                                'name' => $villageItem['name'],
                            ]
                        );
                    }

                    $this->line("      • " . count($villageItems) . ' desa');
                }
            }

            DB::commit();
            $this->info('Impor selesai.');
            return self::SUCCESS;
        } catch (Throwable $e) {
            DB::rollBack();
            $this->error('Terjadi kesalahan saat impor: ' . $e->getMessage());
            return self::FAILURE;
        }
    }

    private function truncateTables(): void
    {
        $this->warn('Menghapus data wilayah sebelumnya...');
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        Village::query()->truncate();
        District::query()->truncate();
        Regency::query()->truncate();
        Province::query()->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * @return array<int|string, mixed>
     */
    private function fetchJson(string $endpoint): array
    {
        $url = rtrim(self::BASE_URL, '/') . $endpoint;
        $response = Http::timeout(30)->acceptJson()->get($url);

        if (! $response->successful()) {
            throw new \RuntimeException("Gagal mengambil data dari {$url}: " . $response->status());
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new \RuntimeException("Format JSON tidak valid untuk {$url}");
        }

        return $payload;
    }
}
