<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluasiQuestion extends Model
{
    use HasFactory;

    protected $table = 'evaluasi_questions';

    protected $fillable = [
        'cluster_id',
        'question_text',
        'sequence',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'is_active' => 'boolean',
    ];

    public function cluster(): BelongsTo
    {
        return $this->belongsTo(EvaluasiCluster::class, 'cluster_id');
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
