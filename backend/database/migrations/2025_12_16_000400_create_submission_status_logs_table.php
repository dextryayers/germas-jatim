<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submission_status_logs', function (Blueprint $table) {
            $table->id();
            $table->enum('submission_type', ['evaluasi', 'laporan']);
            $table->unsignedBigInteger('submission_id');
            $table->enum('previous_status', ['pending', 'verified', 'rejected'])->nullable();
            $table->enum('new_status', ['pending', 'verified', 'rejected']);
            $table->text('remarks')->nullable();
            $table->foreignId('instansi_id')->nullable()->constrained('instansi')->nullOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['submission_type', 'submission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submission_status_logs');
    }
};
