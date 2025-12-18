<div align="center">

# Germas Jawa Timur – Sistem Evaluasi & Pelaporan

Platform terpadu untuk mengelola evaluasi, pelaporan, dan analitik program Gerakan Masyarakat Hidup Sehat (GERMAS) di Provinsi Jawa Timur.

![Tech](https://img.shields.io/badge/Laravel-11.x-ff2d20?logo=laravel) ![React](https://img.shields.io/badge/React-19-61dafb?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)

</div>

## Daftar Isi

1. [Ringkasan Proyek](#ringkasan-proyek)
2. [Teknologi Utama](#teknologi-utama)
3. [Struktur Direktori](#struktur-direktori)
4. [Prasyarat](#prasyarat)
5. [Konfigurasi Lingkungan](#konfigurasi-lingkungan)
6. [Langkah Instalasi](#langkah-instalasi)
7. [Konfigurasi Role & Data Awal](#konfigurasi-role--data-awal)
8. [Perintah Harian](#perintah-harian)
9. [Arsitektur Sistem](#arsitektur-sistem)
10. [Alur Data & Integrasi Wilayah](#alur-data--integrasi-wilayah)
11. [API Utama](#api-utama)
12. [Fitur Utama](#fitur-utama)
13. [Testing](#testing)
14. [Panduan Deployment](#panduan-deployment)
15. [Monitoring & Maintenance](#monitoring--maintenance)
16. [Tips Troubleshooting](#tips-troubleshooting)
17. [Roadmap & Ide Pengembangan](#roadmap--ide-pengembangan)
18. [Lisensi](#lisensi)

---

## Ringkasan Proyek

Sistem ini menyediakan backend API dan antarmuka admin terpadu untuk:

- Mengelola data instansi, laporan, dan evaluasi.
- Menyajikan analitik (grafik, KPI, metrik pengunjung).
- Mengintegrasikan hierarki wilayah Jawa Timur (provinsi, kabupaten/kota, kecamatan, desa) secara otomatis dari API [wilayah.web.id](https://wilayah.web.id/api/regencies/35).
- Memberikan pengalaman administrasi yang responsif dan dinamis memanfaatkan React + Tailwind.

Arsitektur yang digunakan memisahkan backend Laravel dan frontend React/Vite sehingga mudah dikembangkan dan di-deploy secara independen.

## Teknologi Utama

| Layer        | Teknologi | Keterangan |
|--------------|-----------|------------|
| Backend      | Laravel 11, PHP 8.2, Sanctum | REST API, autentikasi token, Artisan command untuk import wilayah |
| Frontend     | React 19, TypeScript, Vite, Tailwind CSS | Dashboard admin, chart (Chart.js + react-chartjs-2), animasi (Framer Motion) |
| Data & Util  | MySQL/PostgreSQL (disarankan), utility HTTP custom | Penyimpanan data GER-MAS dan hierarki wilayah |
| DevOps       | npm, Composer | Manajemen dependency dan script dev |

## Struktur Direktori

```
germas/
├── backend/                 # Aplikasi Laravel (API & konsol)
│   ├── app/
│   │   ├── Console/Commands/ImportEastJavaRegions.php
│   │   ├── Http/Controllers/RegionController.php
│   │   └── Http/Resources/{Province,Regency}Resource.php
│   ├── database/migrations/2025_12_17_000600_create_regions_tables.php
│   ├── routes/api.php
│   └── ... (struktur standar Laravel)
├── pages/                   # Halaman React (tanpa Next.js)
│   └── admin/Regions.tsx    # Halaman Wilayah dinamis
├── components/, utils/      # Komponen UI dan helper frontend
├── public/, src/            # Entry Vite, konfigurasi Tailwind, dll.
├── package.json             # Dependensi frontend + script Vite
├── composer.json            # Dependensi backend Laravel
└── README.md                # Dokumen ini
```

> **Catatan:** folder `backend` berjalan sebagai aplikasi Laravel penuh; direktori root berisi codebase React/Vite yang mengonsumsi API backend.

### Struktur Database Wilayah

```
provinces
├── regencies
│   ├── districts
│   │   └── villages
```

Masing-masing tabel memiliki kolom `code` sesuai kode resmi Kemendagri, sehingga mudah dihubungkan dengan sistem eksternal lain yang membutuhkan kode wilayah.

## Prasyarat

- **Node.js** ≥ 20 (disarankan LTS terbaru)
- **npm** ≥ 10
- **PHP** ≥ 8.2
- **Composer** ≥ 2.6
- **Database** MySQL 8 atau PostgreSQL 14 (pilih salah satu)
- Ekstensi PHP yang umum (pdo, mbstring, openssl, dll.)
- Git untuk version control (opsional tapi direkomendasikan)

## Konfigurasi Lingkungan

### Backend (`backend/.env`)

Salin `.env.example` menjadi `.env` kemudian sesuaikan konfigurasi berikut:

```env
APP_NAME="Germas Jatim"
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=[dbname]
DB_USERNAME=root
DB_PASSWORD=[pass]

SANCTUM_STATEFUL_DOMAINS=localhost:5173
FRONTEND_URL=http://localhost:5173
```

Jangan lupa set `QUEUE_CONNECTION`, `MAIL_*`, atau konfigurasi lain sesuai kebutuhan produksi.

Tambahkan konfigurasi tambahan bila menggunakan fitur lanjutan (mis. storage S3, SMTP, broadcast) sesuai dokumentasi Laravel.

### Frontend (`.env` di root)

Jika diperlukan, buat file `.env` dengan variabel berikut:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Sesuaikan URL berdasarkan lingkungan deploy.

### Variabel Lingkungan Tambahan (Opsional)

| Variabel | Contoh Nilai | Fungsi |
|----------|--------------|--------|
| `VITE_APP_NAME` | Germas Admin | Menampilkan nama aplikasi di UI |
| `QUEUE_CONNECTION` | database | Mengatur koneksi queue Laravel |
| `LOG_CHANNEL` | stack | Channel log utama |
| `LOG_SLACK_WEBHOOK_URL` | https://hooks.slack.com/... | Notifikasi error ke Slack |

## Langkah Instalasi

### 1. Kloning repositori

```bash
git clone https://github.com/dextryayers/germas-jatim.git
cd germas-jatim
```

### 2. Instal dependensi frontend

```bash
npm install
```

### 3. Instal dependensi backend

```bash
cd backend
composer install
```

### 4. Siapkan file .env

```bash
cp backend/.env.example backend/.env
cp .env.example .env        # jika tersedia untuk frontend
```

Edit nilai variabel sesuai prasyarat.

### 5. Generate key & migrasi database

```bash
php artisan key:generate
php artisan migrate
```

### 6. Import data wilayah Jawa Timur

```bash
php artisan regions:import-east-java --force
```

Perintah ini akan menarik data dari `wilayah.web.id` dan menyimpannya ke tabel `provinces`, `regencies`, `districts`, `villages`.

### 7. Jalankan server pengembangan

Frontend (Vite):

```bash
npm run dev
```

Backend (Laravel):

```bash
php artisan serve
```

Secara default, frontend berjalan di `http://localhost:5173` dan backend di `http://127.0.0.1:8000`.

## Konfigurasi Role & Data Awal

1. Buat akun admin pertama melalui endpoint registrasi admin atau seeding manual.
2. Jika menggunakan seeder:
   ```bash
   php artisan db:seed --class=AdminSeeder
   ```
3. Masuk ke panel admin, periksa data instansi, dan gunakan fitur import wilayah untuk memastikan hierarki terisi.
4. Sesuaikan level instansi/roles melalui menu administrasi sesuai struktur organisasi.

## Perintah Harian

```bash
# Menjalankan kedua stack sekaligus (opsional via composer)
composer run dev

# Menjalankan queue listener (jika menggunakan job)
php artisan queue:listen

# Membersihkan cache konfigurasi
php artisan config:clear
php artisan route:clear

# Build frontend untuk produksi
npm run build
```

## Arsitektur Sistem

```
┌───────────────┐       ┌──────────────────┐       ┌────────────────────┐
│ React (Vite)  │  API  │ Laravel Sanctum   │  DB   │ MySQL/PostgreSQL    │
│ pages/admin   │ <───► │ Controllers +     │ <───► │ provinces/regencies │
│ components UI │       │ Resources         │       │ districts/villages  │
└───────────────┘       └──────────────────┘       └────────────────────┘
```

- **Frontend**: SPA React dengan routing manual (React Router). Konsumsi API via `utils/apiClient.ts` yang menangani CSRF & auth token.
- **Backend**: Laravel API dengan Sanctum untuk SPA auth, Resource classes untuk formatting JSON, Artisan command untuk import, dan migrasi custom wilayah.
- **Database**: Relasi berjenjang memudahkan query statistik (menggunakan eager loading dan aggregate counts).

## Alur Data & Integrasi Wilayah

1. **Import** – `php artisan regions:import-east-java` menarik seluruh hirarki kabupaten/kota → kecamatan → desa dan menyimpannya ke database lokal.
2. **API** – Endpoint Laravel (`/api/regions`, `/api/regions/{regency}/districts`, `/api/districts/{district}/villages`) menyajikan data terstruktur untuk frontend.
3. **Frontend** – Halaman `pages/admin/Regions.tsx` memanggil API melalui `utils/apiClient.ts`, menerapkan filter (tipe kab/kota, pencarian teks), dan menampilkan statistik + chart + detail yang dapat diperluas.

Diagram sederhana:

```
wilayah.web.id API → Artisan Import Command → Database Lokal → REST API Laravel → React Admin UI
```

## API Utama

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/regions` | GET | Mendapatkan daftar kab/kota di provinsi kode 35 (Jawa Timur) beserta ringkasan jumlah kecamatan/desa |
| `/api/regions/{regency}/districts` | GET | Mendapatkan kecamatan dan desa dalam kab/kota tertentu |
| `/api/districts/{district}/villages` | GET | Mendapatkan seluruh desa untuk kecamatan tertentu |
| `/api/dashboard` | GET | Data KPI dashboard (laporan, evaluasi, pengunjung, dll.) |

> Semua endpoint berada di balik middleware Sanctum. Pastikan frontend melakukan autentikasi sebelum memanggil API.

## Fitur Utama

- **Dashboard Analitik**: Grafik pengunjung, KPI laporan/evaluasi, histori aktivitas.
- **Manajemen Instansi**: Registrasi admin, pengelolaan level instansi.
- **Pelaporan Evaluasi**: Input, verifikasi, dan ekspor format PDF/Excel.
- **Wilayah Jawa Timur Dinamis**: Integrasi penuh dari provinsi hingga desa termasuk statistik jumlah kecamatan/desa per kabupaten/kota.
- **Autentikasi Aman**: Laravel Sanctum dengan dukungan SPA.
- **UI Modern**: Tailwind + Framer Motion untuk interaksi yang halus.

### Fitur Wilayah Jawa Timur

- Filter kab/kota berdasarkan tipe (kabupaten/kota) dan kata kunci.
- Grafik perbandingan jumlah kecamatan dan desa tiap kab/kota.
- Panel detail dengan lazy-loading kecamatan & desa untuk efisiensi.
- Penghitungan statistik total yang selalu sinkron dengan filter aktif.

## Testing

### Backend

- Unit & Feature Test (PHPUnit):
  ```bash
  php artisan test
  ```
- Pastikan membuat database testing (`DB_DATABASE` khusus) dan jalankan migrasi menggunakan `php artisan migrate --env=testing` jika diperlukan.

### Frontend

- Tambahkan testing dengan Vitest/React Testing Library (belum diset). Rekomendasi skrip:
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom
  npm run test
  ```
- Gunakan script `npm run lint` (jika eslint dikonfigurasi) untuk menjaga kualitas kode.

## Panduan Deployment

### Backend

1. Upload folder `backend` ke server PHP (Laravel-friendly) atau gunakan container Docker.
2. Jalankan `composer install --optimize-autoloader --no-dev`.
3. Set variabel lingkungan di `.env` produksi, termasuk `APP_ENV=production`, `APP_DEBUG=false`.
4. Jalankan `php artisan migrate --force`.
5. Import atau perbarui data wilayah: `php artisan regions:import-east-java --force` (jadwalkan via cron jika perlu pembaruan berkala).
6. Konfigurasi queue dan schedule (opsional) lewat `crontab`.

### Frontend

1. Di root proyek, jalankan `npm run build`.
2. Deploy folder `dist/` ke web server static (Nginx/Apache) atau layanan hosting static (Netlify, Vercel, dsb).
3. Pastikan environment `VITE_API_BASE_URL` mengarah ke domain backend produksi.

### Integrasi

- Jika frontend dan backend berada pada domain berbeda, pastikan CORS dan Sanctum stateful domains sudah diatur.
- Gunakan HTTPS di kedua sisi untuk menghindari masalah cookie/security.

## Monitoring & Maintenance

- **Log Monitoring**: Gunakan `storage/logs/laravel.log` atau integrasikan dengan log central (ELK, Sentry).
- **Backup Database**: Jadwalkan backup harian/mingguan. Contoh cron:
  ```bash
  0 2 * * * mysqldump -u root -pPASSWORD germas > /backup/germas_$(date +\%F).sql
  ```
- **Job Scheduler**: Tambahkan ke `crontab` untuk menjalankan `php artisan schedule:run` setiap menit.
- **Pembaruan Wilayah**: Jika API eksternal memperbarui data, jalankan ulang `regions:import-east-java` secara berkala.
- **Security Patch**: Rutin jalankan `composer update` dan `npm update` setiap sprint, kemudian regression test.

## Tips Troubleshooting

| Masalah | Penyebab Umum | Solusi |
|---------|----------------|--------|
| **Migrasi gagal** | Tabel sudah ada / DB kosong | Jalankan migrasi spesifik: `php artisan migrate --path=database/migrations/2025_12_17_000600_create_regions_tables.php --force` |
| **Import wilayah gagal** | API eksternal tidak merespon | Pastikan koneksi internet server stabil, coba ulang perintah atau gunakan opsi `--skip-villages` bila perlu |
| **Frontend tidak menampilkan data** | `VITE_API_BASE_URL` salah / token tidak valid | Cek konfigurasi env, pastikan backend berjalan dan akses token Sanctum diberikan |
| **Grafik kosong** | Backend mengembalikan data 0 | Frontend memiliki fallback, namun pastikan data agregat tersedia di API Dashboard |
| **CORS error** | Konfigurasi SANCTUM_STATEFUL_DOMAINS belum benar | Sesuaikan domain frontend & backend, jalankan `php artisan config:clear`

## Roadmap & Ide Pengembangan

- Mode offline untuk input laporan ketika koneksi terbatas.
- Dashboard publik dengan statistik ringkas yang dapat diembed.
- Integrasi Single Sign-On (SSO) untuk instansi pemerintah daerah.
- Mekanisme sinkronisasi incremental jika sumber data wilayah berubah.
- Penerapan automated testing penuh (CI/CD pipeline, coverage metrics).

## Lisensi

Proyek ini menggunakan lisensi **MIT** (mengikuti lisensi default Laravel). Silakan modifikasi sesuai kebutuhan organisasi Anda.

---

**Dukungan & Kontribusi**

- Buat issue atau pull request untuk perbaikan/fitur baru.
- Dokumentasikan perubahan besar di README atau `CHANGELOG.md` (buat baru bila diperlukan).

Selamat menggunakan Sistem Evaluasi & Pelaporan Germas Jawa Timur!
