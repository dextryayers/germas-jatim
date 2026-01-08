<div align="center">

### SI-PORSI GERMAS
**Sistem Pelaporan dan Evaluasi Gerakan Masyarakat Hidup Sehat (GERMAS) Pada Tatanan Tempat Kerja**  
Dinas Kesehatan Provinsi Jawa Timur

Platform terpadu untuk mengelola pelaporan, evaluasi, dan arsip program GERMAS di tatanan tempat kerja di Provinsi Jawa Timur.

![Laravel](https://img.shields.io/badge/Laravel-11.x-ff2d20?logo=laravel)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript--3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)

</div>

---

# SI-PORSI GERMAS

## Ringkasan Proyek

SI-PORSI GERMAS adalah aplikasi web untuk memfasilitasi **pelaporan** dan **evaluasi** pelaksanaan Gerakan Masyarakat Hidup Sehat (GERMAS) pada tatanan **tempat kerja** di Provinsi Jawa Timur.

Aplikasi ini terdiri dari:

- **Portal publik** untuk pengisian formulir evaluasi dan pelaporan GERMAS oleh instansi.
- **Dashboard admin** untuk Dinas Kesehatan (provinsi / kab/kota) guna memverifikasi data, melihat arsip, dan mengelola pengaturan.
- **Sistem otentikasi** dengan reset password via **OTP email**.
- **Soft maintenance mode** yang memungkinkan admin menutup akses publik sementara tanpa mematikan server sepenuhnya.

Dokumen ini menjelaskan **teknologi yang digunakan**, **kebutuhan sistem**, **langkah instalasi**, dan **panduan deploy ke hosting & domain lain**.

---

## Daftar Isi

1. [Ringkasan Proyek](#ringkasan-proyek)
2. [Arsitektur & Teknologi](#1-arsitektur--teknologi)
3. [Struktur Direktori](#struktur-direktori)
4. [Requirements](#2-requirements)
5. [Setup Backend (Laravel)](#3-setup-backend-laravel)
6. [Setup Frontend (React)](#4-setup-frontend-react)
7. [Soft Maintenance Mode](#5-soft-maintenance-mode-ringkasan)
8. [Fitur Utama](#fitur-utama)
9. [API Utama](#api-utama)
10. [Tips Troubleshooting](#tips-troubleshooting)
11. [Deploy ke Hosting & Domain Lain](#6-deploy-ke-hosting--domain-lain)
12. [Kontak](#7-kontak)

---

## 1. Arsitektur & Teknologi

- **Frontend**
  - React 18 (SPA)
  - React Router DOM 6
  - @tanstack/react-query
  - Tailwind CSS (via CDN)
  - Lucide React (ikon)
  - Framer Motion (animasi)
  - React Hook Form + Zod (validasi form)
  - React Hot Toast (notifikasi)

- **Backend**
  - Laravel (versi 11+)
  - PHP 8.2+
  - MySQL / MariaDB
  - Laravel Sanctum / token-based auth
  - Mailer (SMTP) untuk pengiriman OTP reset password

- **Lainnya**
  - CORS terkonfigurasi untuk memisahkan domain API dan domain frontend
  - Soft maintenance mode via file flag JSON di `storage/framework`

## Struktur Direktori

Struktur project ini kurang lebih:

```text
germas-jatim/
├─ backend/              # Aplikasi Laravel (API, otentikasi, OTP, dsb.)
├─ components/           # Komponen UI frontend (React)
├─ pages/                # Halaman React (Home, Login, Admin, dll.)
├─ utils/                # Helper frontend (apiClient, pdf generator, dsb.)
├─ index.html            # Entry HTML SPA
├─ index.tsx / App.tsx   # Entry React
└─ README.md             # Dokumen ini
```

---

## 2. Requirements

Pastikan environment server/localhost memenuhi:

- **Node.js**: versi LTS terbaru (>= 18 disarankan)
- **npm** atau **yarn**
- **PHP**: 8.2 atau lebih baru
- **Composer**: versi terbaru
- **Database**: MySQL 5.7+ / MariaDB setara
- **Web Server**: Nginx atau Apache (untuk hosting produksi)
- **Ekstensi PHP umum**: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `curl`, `json`, `fileinfo`
- Akses ke SMTP server (untuk fitur email OTP reset password)

---

## 3. Setup Backend (Laravel)

> Lokasi: `backend/`

### 3.1. Install Dependensi

```bash
cd backend
composer install
```

### 3.2. Konfigurasi Environment

1. Duplikasi file `.env.example` menjadi `.env` (jika belum ada):

   ```bash
   cp .env.example .env
   ```

2. Sesuaikan variabel penting di `.env`:

   ```env
   APP_NAME="SI-PORSI GERMAS"
   APP_ENV=production
   APP_KEY=base64:...        # jalankan artisan key:generate
   APP_DEBUG=false
   APP_URL=https://api.domain-anda.com  # URL API

   # Database
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=germas_jatim
   DB_USERNAME=nama_user
   DB_PASSWORD=password

   # Mail (untuk OTP reset password)
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.domain-anda.com
   MAIL_PORT=587
   MAIL_USERNAME=nama_akun
   MAIL_PASSWORD=kata_sandi
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=no-reply@domain-anda.com
   MAIL_FROM_NAME="SI-PORSI GERMAS"

   # CORS / Frontend URL
   FRONTEND_URL=https://domain-frontend-anda.com
   ````

3. Generate app key:

   ```bash
   php artisan key:generate
   ```

### 3.3. Migrasi Database & Seeder (opsional)

```bash
php artisan migrate
# Jika ada seeder:
php artisan db:seed
```

### 3.4. Jalankan Server Backend (Local)

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Sekarang API akan tersedia di `http://localhost:8000`.

> **Catatan:** Pastikan konfigurasi CORS di `config/cors.php` mencantumkan domain frontend Anda pada `allowed_origins` dan path API sesuai (`/api/*`).

---

## 4. Setup Frontend (React)

> Lokasi: root project (`germas-jatim/`)

### 4.1. Install Dependensi

```bash
npm install
```

### 4.2. Konfigurasi Environment Frontend

Frontend membaca konfigurasi dari file `.env` di root (sudah dibuat secara manual di project ini). Jika ingin menyesuaikan:

```env
VITE_API_BASE_URL=https://api.domain-anda.com/api
VITE_MAINTENANCE_BYPASS_KEY=germas-admin   # contoh key bypass soft maintenance
```

Sesuaikan `VITE_API_BASE_URL` dengan URL API Laravel Anda pada environment baru.

### 4.3. Jalankan Frontend (Local)

```bash
npm run dev
```

Secara default aplikasi akan berjalan di `http://localhost:5173` (atau port lain sesuai konfigurasi dev server).

---

## 5. Soft Maintenance Mode (Ringkasan)

SI-PORSI GERMAS menggunakan **soft maintenance mode**, *bukan* `php artisan down`, sehingga:

- Pengguna umum akan diarahkan ke halaman maintenance.
- Admin dengan hak tertentu tetap bisa login dan mematikan maintenance.
- Admin dapat bypass melalui query `?maintenance_key=...` sesuai konfigurasi `VITE_MAINTENANCE_BYPASS_KEY`.

Endpoint backend utama:

- `GET /api/maintenance/status` – status maintenance (public)
- `POST /api/admin/maintenance/enable` – aktifkan soft maintenance (admin)
- `POST /api/admin/maintenance/disable` – matikan soft maintenance (admin)

Pastikan route dan middleware telah terkonfigurasi sesuai pada file:

- `backend/routes/api.php`
- `backend/app/Http/Controllers/MaintenanceController.php`

---

## Fitur Utama

Ringkasan beberapa fitur utama yang tersedia di SI-PORSI GERMAS:

- **Pelaporan & Evaluasi GERMAS**  
  Formulir evaluasi dan pelaporan GERMAS pada tatanan tempat kerja, dengan data yang tersimpan di backend Laravel.

- **Dashboard Admin**  
  Admin provinsi / kabupaten/kota dapat melihat arsip laporan yang sudah diverifikasi, mengunduh PDF, dan mengelola pengaturan tertentu (misalnya maintenance mode).

- **Manajemen Akun & Otentikasi**  
  Sistem login admin dengan penyimpanan token di browser, halaman profil, serta pembatasan akses ke halaman tertentu berdasarkan peran (misalnya akses khusus ke halaman Pengaturan untuk peran tertentu).

- **Reset Password dengan OTP Email**  
  Lupa password ditangani melalui alur OTP yang dikirim ke email instansi. Template email OTP berada di `backend/resources/views/emails/password-otp.blade.php`.

- **Soft Maintenance Mode**  
  Mode pemeliharaan lunak yang memblokir pengguna umum dari aplikasi, namun tetap mengizinkan admin tertentu untuk login dan mematikan maintenance, termasuk dukungan bypass melalui query `maintenance_key`.

---

## API Utama

Beberapa endpoint yang sering digunakan oleh frontend (dengan asumsi prefix dasar `/api` sudah dikonfigurasi di Laravel):

### Autentikasi & Profil

- `POST /auth/login` – login admin, mengembalikan token dan informasi pengguna.
- `GET /auth/me` – mendapatkan profil pengguna yang sedang login.

### Pelaporan & Evaluasi

- `GET /evaluasi/submissions` – daftar pengajuan evaluasi (misalnya untuk arsip terverifikasi).
- `GET /laporan/submissions` – daftar pengajuan laporan.

### Wilayah Asal

- `GET /regions?province_code=35` – mendapatkan daftar kabupaten/kota di Provinsi Jawa Timur.
- `GET /regions/{regencyId}/districts` – mendapatkan kecamatan untuk kabupaten/kota tertentu.
- `GET /districts/{districtId}/villages` – mendapatkan desa/kelurahan untuk kecamatan tertentu.

### Maintenance

- `GET /maintenance/status` – cek status soft maintenance (public, tanpa autentikasi).
- `POST /admin/maintenance/enable` – aktifkan soft maintenance (hanya admin).
- `POST /admin/maintenance/disable` – nonaktifkan soft maintenance (hanya admin).

> **Catatan:** Nama dan struktur endpoint di atas mengikuti pola yang digunakan di kode frontend dan konfigurasi routes Laravel pada project ini. Sesuaikan dokumentasi ini jika nanti ada perubahan pada routes API.

---

## Tips Troubleshooting

Beberapa masalah umum dan cara mengeceknya:

### 1. CORS Error saat memanggil API

**Gejala:** Pesan error di konsol browser seperti *"CORS request did not succeed"* atau *"No 'Access-Control-Allow-Origin' header is present"*.

- Pastikan `APP_URL` di `.env` backend mengarah ke domain API yang benar (misal `https://api.domain-anda.com`).
- Pastikan `FRONTEND_URL` atau daftar `allowed_origins` di `config/cors.php` sudah mencantumkan domain frontend (misal `https://domain-frontend-anda.com`).
- Pastikan `VITE_API_BASE_URL` di `.env` frontend mengarah ke `/api` dari domain backend yang benar.
- Setelah mengubah konfigurasi, jalankan `php artisan config:clear` dan restart server jika perlu.

### 2. Admin ikut terblokir saat Maintenance Aktif

- Pastikan soft maintenance yang digunakan adalah versi “lunak” (bukan `php artisan down`).
- Cek konfigurasi `VITE_MAINTENANCE_BYPASS_KEY` pada `.env` frontend dan gunakan query `?maintenance_key=...` sesuai nilai tersebut saat mengakses aplikasi.
- Pastikan token login admin masih valid (coba login ulang jika perlu).

### 3. OTP Reset Password Tidak Masuk ke Email

- Periksa konfigurasi `MAIL_*` di `.env` backend (host, port, username, password, encryption).
- Coba kirim email uji (misalnya dari Tinker atau route sederhana) untuk memastikan koneksi SMTP benar.
- Periksa folder spam di email penerima.

### 4. Frontend Tidak Bisa Terhubung ke API di Server Baru

- Cek kembali nilai `VITE_API_BASE_URL` di `.env` frontend dan pastikan sudah di-build ulang (`npm run build`) setelah mengubah env.
- Pastikan server backend dapat diakses langsung dari browser dengan membuka `https://api.domain-anda.com/api/status` atau endpoint lain yang publik.
- Pastikan tidak ada blokir firewall atau konfigurasi SSL yang salah.

---

## 6. Deploy ke Hosting & Domain Lain

Berikut gambaran umum untuk deploy di server produksi dengan domain terpisah untuk API dan frontend.

### 6.1. Deploy Backend (Laravel API)

1. **Upload kode** folder `backend` ke server (via git/SSH/FTP).
2. Jalankan perintah di server:

   ```bash
   cd backend
   composer install --no-dev --optimize-autoloader

   cp .env.example .env   # jika belum ada
   php artisan key:generate

   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

3. Pastikan **document root** web server untuk API mengarah ke folder `backend/public`.
4. Set `APP_URL` ke `https://api.domain-anda.com` dan `FRONTEND_URL` ke `https://domain-frontend-anda.com`.
5. Konfigurasi **CORS** di `config/cors.php`:

   - Tambahkan domain frontend di `allowed_origins` (misal `https://domain-frontend-anda.com`).
   - Pastikan `paths` mencakup `/api/*` dan endpoint lain yang diperlukan.

6. Konfigurasikan **cron / supervisor** (jika ada queue email) sesuai kebutuhan.

### 6.2. Deploy Frontend (React SPA)

1. Sesuaikan file `.env` frontend:

   ```env
   VITE_API_BASE_URL=https://api.domain-anda.com/api
   VITE_MAINTENANCE_BYPASS_KEY=germas-admin
   ```

2. Build untuk produksi:

   ```bash
   npm run build
   ```

   Hasil build (misalnya di folder `dist/`) berisi file statis HTML/CSS/JS.

3. Upload isi folder build ke hosting static (misal folder public domain `domain-frontend-anda.com`).

4. Pastikan konfigurasi web server untuk SPA:

   - Semua path (kecuali asset statis) diarahkan ke `index.html`.
   - Contoh Nginx (ilustrasi):

     ```nginx
     location / {
         try_files $uri /index.html;
     }
     ```

5. Setelah deploy, uji:

   - Akses Home, Formulir, dan halaman Admin.
   - Login admin, cek fetch data, dan cek reset password (email OTP).
   - Coba aktifkan & nonaktifkan soft maintenance dari halaman Settings admin.

### 6.3. Checklist Sebelum Go-Live

- **[ ]** APP_URL (backend) dan FRONTEND_URL sudah benar.
- **[ ]** VITE_API_BASE_URL mengarah ke domain API yang benar.
- **[ ]** CORS mengizinkan domain frontend produksi.
- **[ ]** Koneksi database produksi berjalan normal.
- **[ ]** SMTP teruji dan email OTP terkirim.
- **[ ]** Soft maintenance berfungsi: user publik terblokir, admin tetap bisa masuk.


---

## 7. Kontak

Jika terdapat kendala saat setup atau deploy:

- **Instansi**: Dinas Kesehatan Provinsi Jawa Timur
- **Website**: https://dinkes.jatimprov.go.id
- **Email**: dinkes@jatimprov.go.id

---

