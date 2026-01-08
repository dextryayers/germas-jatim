<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'origin_regency_id',
        'origin_district_id',
        'origin_village_id',
        'instansi_address',
        'pejabat_nama',
        'pejabat_jabatan',
        'employee_male_count',
        'employee_female_count',
        'evaluation_date',
        'submission_date',
        'report_year',
        'is_late',
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
        'report_year' => 'integer',
        'is_late' => 'boolean',
    ];

    public function originRegency(): BelongsTo
    {
        return $this->belongsTo(Regency::class, 'origin_regency_id');
    }

    public function originDistrict(): BelongsTo
    {
        return $this->belongsTo(District::class, 'origin_district_id');
    }

    public function originVillage(): BelongsTo
    {
        return $this->belongsTo(Village::class, 'origin_village_id');
    }

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

    /**
     * Batasi query evaluasi berdasarkan admin yang sedang login.
     *
     * Aturan:
     * - Provinsi  (code: provinsi)  : bisa melihat semua evaluasi di seluruh Jatim.
     * - Kab/Kota  (kab_kota)        : hanya evaluasi dengan origin_regency_id sama.
     * - Kecamatan (kecamatan)       : origin_regency_id & origin_district_id sama.
     * - Kelurahan (kelurahan)       : origin_regency_id, origin_district_id, origin_village_id sama.
     */
    public function scopeForAdminUser(Builder $query, ?User $user): Builder
    {
        if (! $user || $user->role !== 'admin') {
            return $query;
        }

        $levelCode = optional($user->instansiLevel)->code;

        return match ($levelCode) {
            'provinsi' => $query,
            'kab_kota' => $query->where('origin_regency_id', $user->origin_regency_id),
            'kecamatan' => $query
                ->where('origin_regency_id', $user->origin_regency_id)
                ->where('origin_district_id', $user->origin_district_id),
            'kelurahan' => $query
                ->where('origin_regency_id', $user->origin_regency_id)
                ->where('origin_district_id', $user->origin_district_id)
                ->where('origin_village_id', $user->origin_village_id),
            default => $query,
        };
    }
}
