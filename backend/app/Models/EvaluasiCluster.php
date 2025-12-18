<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluasiCluster extends Model
{
    use HasFactory;

    protected $table = 'evaluasi_clusters';

    protected $fillable = [
        'instansi_level_id',
        'title',
        'sequence',
        'is_active',
        'applies_to_all',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'is_active' => 'boolean',
        'applies_to_all' => 'boolean',
    ];

    public function instansiLevel(): BelongsTo
    {
        return $this->belongsTo(InstansiLevel::class, 'instansi_level_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(EvaluasiQuestion::class, 'cluster_id')->orderBy('sequence');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
