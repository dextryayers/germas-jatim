<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_code',
        'instansi_id',
        'instansi_name',
        'instansi_level_id',
        'instansi_level_text',
        'instansi_address',
        'pejabat_nama',
        'pejabat_jabatan',
        'employee_male_count',
        'employee_female_count',
        'evaluation_date',
        'submission_date',
        'score',
        'category_id',
        'category_label',
        'status',
        'remarks',
        'submitted_by',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'submission_date' => 'datetime',
        'evaluation_date' => 'date',
        'verified_at' => 'datetime',
        'employee_male_count' => 'integer',
        'employee_female_count' => 'integer',
        'score' => 'integer',
    ];

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(Instansi::class);
    }

    public function instansiLevel(): BelongsTo
    {
        return $this->belongsTo(InstansiLevel::class, 'instansi_level_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EvaluationCategory::class, 'category_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(EvaluationAnswer::class, 'submission_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(SubmissionStatusLog::class, 'submission_id')->where('submission_type', 'evaluasi');
    }
}
