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
        Schema::create('evaluation_categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('label', 60);
            $table->string('description', 255)->nullable();
            $table->unsignedInteger('min_score');
            $table->unsignedInteger('max_score');
            $table->string('color_class', 60)->nullable();
            $table->timestamps();
        });

        Schema::create('evaluasi_clusters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instansi_level_id')->nullable()->constrained('instansi_levels')->nullOnDelete();
            $table->string('title');
            $table->unsignedInteger('sequence')->default(1);
            $table->boolean('is_active')->default(true);
            $table->boolean('applies_to_all')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['instansi_level_id', 'sequence']);
        });

        Schema::create('evaluasi_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cluster_id')->constrained('evaluasi_clusters')->cascadeOnDelete();
            $table->text('question_text');
            $table->unsignedInteger('sequence')->default(1);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['cluster_id', 'sequence']);
        });

        Schema::create('evaluation_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('submission_code', 30)->unique();
            $table->foreignId('instansi_id')->nullable()->constrained('instansi')->nullOnDelete();
            $table->string('instansi_name');
            $table->foreignId('instansi_level_id')->nullable()->constrained('instansi_levels')->nullOnDelete();
            $table->string('instansi_level_text', 150)->nullable();
            $table->string('instansi_address', 255)->nullable();
            $table->string('pejabat_nama', 255)->nullable();
            $table->string('pejabat_jabatan', 150)->nullable();
            $table->unsignedInteger('employee_male_count')->nullable();
            $table->unsignedInteger('employee_female_count')->nullable();
            $table->date('evaluation_date')->nullable();
            $table->dateTime('submission_date');
            $table->unsignedInteger('score')->default(0);
            $table->foreignId('category_id')->nullable()->constrained('evaluation_categories')->nullOnDelete();
            $table->string('category_label', 60)->nullable();
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('remarks')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('instansi_level_id');
            $table->index('submission_date');
        });

        Schema::create('evaluation_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('evaluation_submissions')->cascadeOnDelete();
            $table->foreignId('question_id')->nullable()->constrained('evaluasi_questions')->nullOnDelete();
            $table->text('question_text');
            $table->tinyInteger('answer_value')->nullable();
            $table->text('remark')->nullable();
            $table->timestamps();

            $table->index(['submission_id', 'question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_answers');
        Schema::dropIfExists('evaluation_submissions');
        Schema::dropIfExists('evaluasi_questions');
        Schema::dropIfExists('evaluasi_clusters');
        Schema::dropIfExists('evaluation_categories');
    }
};
