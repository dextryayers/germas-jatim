<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('instansi_levels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('description', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('instansi', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('name', 200);
            $table->string('category', 50)->default('dinas');
            $table->foreignId('level_id')->nullable()->constrained('instansi_levels')->nullOnDelete();
            $table->string('address', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Data kredensial & identitas dasar yang diinput saat registrasi admin
            $table->string('username')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // Role disesuaikan dengan seluruh varian yang digunakan di aplikasi
            $table->enum('role', [
                'super_admin',
                'admin',
                'admin_provinsi',
                'admin_kabkota',
                'admin_kecamatan',
                'admin_kelurahan',
                'admin_desa'
            ])->default('admin');

            // Keterkaitan dengan instansi & level instansi
            $table->foreignId('instansi_id')->nullable()->constrained('instansi')->nullOnDelete();
            $table->foreignId('instansi_level_id')->nullable()->constrained('instansi_levels')->nullOnDelete();

            // Asal wilayah admin (diisi sesuai pilihan Kab/Kota, Kecamatan, Desa/Kelurahan pada registrasi)
            $table->foreignId('origin_regency_id')->nullable()->constrained('regencies')->nullOnDelete();
            $table->foreignId('origin_district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('origin_village_id')->nullable()->constrained('villages')->nullOnDelete();

            // Informasi tambahan yang sudah digunakan di aplikasi (kode admin, kontak, foto, last login)
            $table->string('admin_code', 10)->nullable()->index();
            $table->string('phone', 30)->nullable();
            $table->string('photo_url')->nullable();
            $table->timestamp('last_login_at')->nullable();

            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('instansi');
        Schema::dropIfExists('instansi_levels');
    }
};
