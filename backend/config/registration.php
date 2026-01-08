<?php

return [
    'code_pattern' => '^\d{6}$',
    'photo_max_size_kb' => 2048,
    'static_codes' => [
        '135791',
        '246802',
        '231107',
    ],
    'static_code_description' => 'Kode admin registrasi',
    'admin_codes_per_level' => [
        // Sesuaikan kode berikut dengan kebutuhan dan konfigurasi instansi level
        // Key sebaiknya mengikuti kolom InstansiLevel::code, misalnya: PROVINSI, KABKOTA, KECAMATAN, KELDESA
        'PROVINSI' => env('ADMIN_CODE_PROV', '352067'),
        'KABKOTA' => env('ADMIN_CODE_KABKOTA', '352075'),
        'KECAMATAN' => env('ADMIN_CODE_KECAMATAN', '352083'),
        'KELDESA' => env('ADMIN_CODE_KELDESA', '352091'),
    ],
];
