<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->foreignId('origin_regency_id')->nullable()->after('instansi_level_id')->constrained('regencies')->nullOnDelete();
            $table->foreignId('origin_district_id')->nullable()->after('origin_regency_id')->constrained('districts')->nullOnDelete();
            $table->foreignId('origin_village_id')->nullable()->after('origin_district_id')->constrained('villages')->nullOnDelete();
        });

        Schema::table('laporan_submissions', function (Blueprint $table) {
            $table->foreignId('origin_regency_id')->nullable()->after('instansi_level_id')->constrained('regencies')->nullOnDelete();
            $table->string('origin_regency_name', 255)->nullable()->after('origin_regency_id');
        });
    }

    public function down(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('origin_village_id');
            $table->dropConstrainedForeignId('origin_district_id');
            $table->dropConstrainedForeignId('origin_regency_id');
        });

        Schema::table('laporan_submissions', function (Blueprint $table) {
            $table->dropColumn('origin_regency_name');
            $table->dropConstrainedForeignId('origin_regency_id');
        });
    }
};
