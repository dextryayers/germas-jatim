<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'username',
        'name',
        'email',
        'password',
        'role',
        'instansi_id',
        'instansi_level_id',
        'origin_regency_id',
        'origin_district_id',
        'origin_village_id',
        'admin_code',
        'phone',
        'photo_url',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(Instansi::class);
    }

    public function instansiLevel(): BelongsTo
    {
        return $this->belongsTo(InstansiLevel::class, 'instansi_level_id');
    }

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

    /**
     * Batasi query user yang bisa dilihat admin berdasarkan role & level instansi-nya.
     */
    public function scopeForAdminUser(Builder $query, ?User $admin): Builder
    {
        if (! $admin) {
            // Jika tidak ada informasi admin, jangan kembalikan data apa pun.
            return $query->whereRaw('1 = 0');
        }

        $role = strtolower($admin->role ?? '');
        $levelCode = optional($admin->instansiLevel)->code; // mis. provinsi, kab_kota, kecamatan, kelurahan

        // Super admin atau admin provinsi: dapat melihat semua pengguna
        if (str_contains($role, 'super_admin') || $levelCode === 'provinsi') {
            return $query;
        }

        // Admin / operator di level kabupaten/kota: lihat semua user dalam kab/kota yang sama
        if ($levelCode === 'kab_kota' || str_contains($role, 'admin_kabkota') || str_contains($role, 'operator_wilayah')) {
            $regencyId = $admin->origin_regency_id;
            if (! $regencyId) {
                return $query->whereRaw('1 = 0');
            }

            return $query
                ->where('origin_regency_id', $regencyId);
        }

        // Admin kecamatan: lihat semua user dalam kecamatan yang sama
        if ($levelCode === 'kecamatan' || str_contains($role, 'admin_kecamatan')) {
            $districtId = $admin->origin_district_id;
            if (! $districtId) {
                return $query->whereRaw('1 = 0');
            }

            return $query
                ->where('origin_district_id', $districtId);
        }

        // Admin kelurahan/desa: melihat semua user dengan tingkat kelurahan/desa
        // berdasarkan level instansi ATAU role yang mengandung kata kelurahan/desa.
        if ($levelCode === 'kelurahan' || $levelCode === 'kelurahan_desa' || str_contains($role, 'admin_kelurahan') || str_contains($role, 'admin_desa')) {
            return $query
                ->where(function (Builder $q) {
                    $q->whereHas('instansiLevel', function (Builder $sub) {
                        $sub->where('code', 'kelurahan_desa');
                    })
                    ->orWhere(function (Builder $sub) {
                        $sub->whereNotNull('role')
                            ->where(function (Builder $inner) {
                                $inner->where('role', 'like', '%admin_kelurahan%')
                                      ->orWhere('role', 'like', '%admin_desa%');
                            });
                    });
                });
        }

        // Operator instansi dan role lain: biarkan backend aturan lain yang batasi (jangan tambah filter di sini)
        if (str_contains($role, 'operator_instansi')) {
            return $query;
        }

        return $query;
    }
}
