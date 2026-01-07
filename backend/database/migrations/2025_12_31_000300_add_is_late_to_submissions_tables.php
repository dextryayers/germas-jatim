<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->boolean('is_late')->default(false)->after('report_year');
        });

        Schema::table('laporan_submissions', function (Blueprint $table) {
            $table->boolean('is_late')->default(false)->after('report_year');
        });
    }

    public function down(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->dropColumn('is_late');
        });

        Schema::table('laporan_submissions', function (Blueprint $table) {
            $table->dropColumn('is_late');
        });
    }
};
