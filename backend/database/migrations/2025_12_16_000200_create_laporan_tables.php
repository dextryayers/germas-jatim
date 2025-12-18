<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instansi_id')->nullable()->constrained('instansi')->nullOnDelete();
            $table->foreignId('instansi_level_id')->nullable()->constrained('instansi_levels')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->smallInteger('year')->nullable();
            $table->boolean('is_default')->default(true);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('laporan_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('laporan_templates')->cascadeOnDelete();
            $table->string('code', 50)->nullable();
            $table->string('title');
            $table->text('indicator')->nullable();
            $table->boolean('has_target')->default(true);
            $table->boolean('has_budget')->default(true);
            $table->unsignedInteger('sequence')->default(1);
            $table->timestamps();

            $table->unique(['template_id', 'sequence']);
        });

        Schema::create('laporan_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('submission_code', 30)->unique();
            $table->foreignId('template_id')->nullable()->constrained('laporan_templates')->nullOnDelete();
            $table->foreignId('instansi_id')->nullable()->constrained('instansi')->nullOnDelete();
            $table->string('instansi_name');
            $table->foreignId('instansi_level_id')->nullable()->constrained('instansi_levels')->nullOnDelete();
            $table->string('instansi_level_text', 150)->nullable();
            $table->smallInteger('report_year');
            $table->string('report_level', 100)->nullable();
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('submitted_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('report_year');
        });

        Schema::create('laporan_submission_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('laporan_submission_id')->constrained('laporan_submissions')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('laporan_sections')->nullOnDelete();
            $table->string('section_code', 50)->nullable();
            $table->string('section_title');
            $table->string('target_year', 120)->nullable();
            $table->string('target_semester_1', 120)->nullable();
            $table->string('target_semester_2', 120)->nullable();
            $table->string('budget_year', 120)->nullable();
            $table->string('budget_semester_1', 120)->nullable();
            $table->string('budget_semester_2', 120)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['laporan_submission_id', 'section_id'], 'lap_sub_sections_submission_section_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_submission_sections');
        Schema::dropIfExists('laporan_submissions');
        Schema::dropIfExists('laporan_sections');
        Schema::dropIfExists('laporan_templates');
    }
};
