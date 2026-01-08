<?php

namespace Database\Seeders;

use App\Models\Instansi;
use App\Models\InstansiLevel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class InstansiSeeder extends Seeder
{
    public function run(): void
    {
        // Pastikan level instansi sudah ada (provinsi)
        $provLevel = InstansiLevel::where('code', 'provinsi')->first();

        if (! $provLevel) {
            $provLevel = InstansiLevel::create([
                'code' => 'provinsi',
                'name' => 'Instansi Tingkat Provinsi',
            ]);
        }

        // Level khusus untuk instansi tingkat kabupaten/kota
        $kabKotaLevel = InstansiLevel::where('code', 'kab_kota')->first();
        if (! $kabKotaLevel) {
            $kabKotaLevel = InstansiLevel::create([
                'code' => 'kab_kota',
                'name' => 'Instansi Tingkat Kabupaten/Kota',
            ]);
        }

        // Level tambahan untuk kebutuhan evaluasi (tanpa daftar instansi khusus)
        $kecamatanLevel = InstansiLevel::firstOrCreate(
            ['code' => 'kecamatan'],
            ['name' => 'Instansi Tingkat Kecamatan']
        );

        $kelDesLevel = InstansiLevel::firstOrCreate(
            ['code' => 'kelurahan_desa'],
            ['name' => 'Instansi Tingkat Kelurahan/Desa']
        );

        $perusahaanLevel = InstansiLevel::firstOrCreate(
            ['code' => 'perusahaan'],
            ['name' => 'Instansi Tingkat Perusahaan']
        );

        // Daftar instansi level provinsi, diselaraskan dengan dokumen kegiatan & indikator
        $itemsProv = [
            'Badan Perencanaan Pembangunan Daerah',
            'Dinas Kesehatan',
            'Dinas Kepemudaan dan Olahraga',
            'Dinas Pendidikan',
            'Dinas Perkebunan',
            'Dinas Peternakan',
            'Dinas Pekerjaan Umum Sumber Daya Air',
            'Dinas Energi dan Sumberdaya Mineral',
            'Biro  Kesejahteraan Rakyat',
            'Biro Organisasi Sekda Provinsi',
            'Dinas Kehutanan',
            'Dinas Pertanian dan Ketahanan Pangan',
            'Dinas Perikanan dan Kelautan',
            'Dinas Perumahan Rakyat, Kawasan Perrukiman dan Cipta Karya',
            'Dinas Perhubungan',
            'Dinas Lingkungan Hidup',
            'Dinas Perindustrian dan Perdagangan',
            'Dinas Tenaga Kerja dan Transmigrasi',
            'Dinas Komunikasi dan Informatika',
            'Dinas Pemberdayaan Perempuan, Perlindungan Anak, dan Kependudukan',
            'Balai Besar POM di Surabaya',
            'BPJS Kesehatan',
            'BKKBN',
            'Dinas Kebudayaan dan Pariwisata',
            'Dinas Sosial',
            'Lembaga Layanan Pendidikan Tinggi Wilayah VII',
            'Dinas Pemberdayaan Masyarakat dan Desa',
            'BUMN (PT PLN )',
            'TNI',
            'POLRI',
            'BNN',
            'Kanwil Agama',
            'FKM UNAIR',
        ];

        foreach ($itemsProv as $name) {
            $slug = Str::slug($name, '-');

            // Pastikan 1 instansi per slug + level provinsi, dan update nama sesuai sumber terbaru (JSON)
            Instansi::updateOrCreate(
                [
                    'slug' => $slug,
                    'level_id' => $provLevel->id,
                ],
                [
                    'name' => $name,
                    'category' => 'dinas',
                    'is_active' => true,
                ]
            );
        }

        // Daftar instansi khusus untuk tingkat kabupaten/kota
        $itemsKabKota = [
            'Badan Perencanaan Pembangunan Daerah',
            'Dinas Kesehatan',
            'Dinas Kepemudaan dan Olahraga',
            'Dinas Pendidikan dan Kebudayaan',
            'Kanwil Agama',
            'Dinas Pertanian dan Ketahanan Pangan',
            'Dinas Perikanan dan Kelautan',
            'Dinas Perumahan Rakyat, kawasan permukiman dan Cipta Karya',
            // diselaraskan dengan JSON: tanpa suffix "Kabupaten/Kota"
            'Dinas Perhubungan',
            'Dinas  Lingkungan Hidup',
            'Dinas Perindustrian dan Perdagangan',
            'Dinas Tenaga Kerja dan Transmigrasi',
            'Dinas Komunikasi dan Informatika',
            'Dinas Pemberdayaan Perempuan, Perlindungan Anak, dan Kependudukan',
            'BPJS Kesehatan',
            'Bupati/Walikota',
            'Badan Kependudukan dan Keluarga Berencana Nasional (BKKBN)',
            'Dinas Kebudayaan dan Pariwisata',
            'Dinas Sosial',
            'BUMN',
            'Dinas Pemberdayaan Masyarakat dan Desa',
            'TNI',
            'POLRI',
            'BNN',
        ];

        foreach ($itemsKabKota as $name) {
            // Tambah suffix pada slug agar tidak berbenturan dengan instansi level provinsi
            $baseSlug = Str::slug($name, '-');
            $slug = $baseSlug . '-kabkota';

            Instansi::updateOrCreate(
                [
                    'slug' => $slug,
                    'level_id' => $kabKotaLevel->id,
                ],
                [
                    'name' => $name,
                    'category' => 'dinas',
                    'is_active' => true,
                ]
            );
        }
    }
}
