<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LaporanSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_code',
        'template_id',
        'instansi_id',
        'instansi_name',
        'instansi_level_id',
        'instansi_level_text',
        'origin_regency_id',
        'origin_regency_name',
        'report_year',
        'report_level',
        'status',
        'notes',
        'submitted_by',
        'verified_by',
        'submitted_at',
        'verified_at',
    ];

    protected $casts = [
        'report_year' => 'integer',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(LaporanTemplate::class, 'template_id');
    }

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(Instansi::class);
    }

    public function instansiLevel(): BelongsTo
    {
        return $this->belongsTo(InstansiLevel::class, 'instansi_level_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(LaporanSubmissionSection::class, 'laporan_submission_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(SubmissionStatusLog::class, 'submission_id')->where('submission_type', 'laporan');
    }
}
