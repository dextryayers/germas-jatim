<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('origin_regency_id')->nullable()->after('instansi_level_id')->constrained('regencies')->nullOnDelete();
            $table->foreignId('origin_district_id')->nullable()->after('origin_regency_id')->constrained('districts')->nullOnDelete();
            $table->foreignId('origin_village_id')->nullable()->after('origin_district_id')->constrained('villages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('origin_village_id');
            $table->dropConstrainedForeignId('origin_district_id');
            $table->dropConstrainedForeignId('origin_regency_id');
        });
    }
};
