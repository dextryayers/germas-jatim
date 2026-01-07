<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reporting_settings', function (Blueprint $table) {
            $table->timestamp('last_backup_at')->nullable()->after('reporting_deadline');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reporting_settings', function (Blueprint $table) {
            $table->dropColumn('last_backup_at');
        });
    }
};
