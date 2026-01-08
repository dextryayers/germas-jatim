<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'is_late',
    ];

    protected $casts = [
        'report_year' => 'integer',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
        'is_late' => 'boolean',
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

    /**
     * Batasi query laporan berdasarkan admin yang sedang login.
     *
     * Sesuai requirement: laporan hanya memiliki 2 tingkat pelaporan
     * (provinsi dan kab/kota). Admin kecamatan dan kelurahan/desa
     * tidak boleh melihat laporan apa pun.
     */
    public function scopeForAdminUser(Builder $query, ?User $user): Builder
    {
        if (! $user) {
            return $query->whereRaw('1 = 0');
        }

        $role = strtolower($user->role ?? '');
        $levelCode = optional($user->instansiLevel)->code; // provinsi, kab_kota, kecamatan, kelurahan

        // Super admin atau admin provinsi: bisa melihat semua laporan
        if (str_contains($role, 'super_admin') || $levelCode === 'provinsi') {
            return $query;
        }

        // Admin / operator di level kabupaten/kota: hanya laporan di kabupaten/kota sendiri
        if ($levelCode === 'kab_kota' || str_contains($role, 'admin_kabkota') || str_contains($role, 'operator_wilayah')) {
            $regencyId = $user->origin_regency_id;
            if (! $regencyId) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where('origin_regency_id', $regencyId);
        }

        // Admin kecamatan / kelurahan/desa: tidak boleh melihat laporan apa pun
        if ($levelCode === 'kecamatan' || $levelCode === 'kelurahan' || $levelCode === 'kelurahan_desa' ||
            str_contains($role, 'admin_kecamatan') || str_contains($role, 'admin_kelurahan') || str_contains($role, 'admin_desa')) {
            return $query->whereRaw('1 = 0');
        }

        // Role lain (mis. operator_instansi) tidak digunakan untuk verifikasi laporan,
        // amankan dengan tidak mengembalikan apa pun.
        return $query->whereRaw('1 = 0');
    }
}
