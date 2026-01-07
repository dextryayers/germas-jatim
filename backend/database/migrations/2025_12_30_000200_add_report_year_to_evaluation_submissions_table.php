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
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            // Tambah kolom tahun pelaporan sebagai integer
            // Diletakkan setelah submission_date agar berdekatan secara semantik
            $table->integer('report_year')->after('submission_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            $table->dropColumn('report_year');
        });
    }
};
