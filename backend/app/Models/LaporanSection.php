<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LaporanSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'template_id',
        'code',
        'title',
        'indicator',
        'has_target',
        'has_budget',
        'sequence',
    ];

    protected $casts = [
        'has_target' => 'boolean',
        'has_budget' => 'boolean',
        'sequence' => 'integer',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(LaporanTemplate::class, 'template_id');
    }

    public function submissionSections(): HasMany
    {
        return $this->hasMany(LaporanSubmissionSection::class, 'section_id');
    }
}
