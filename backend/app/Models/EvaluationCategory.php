<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'label',
        'description',
        'min_score',
        'max_score',
        'color_class',
    ];

    protected $casts = [
        'min_score' => 'integer',
        'max_score' => 'integer',
    ];

    public function submissions(): HasMany
    {
        return $this->hasMany(EvaluationSubmission::class, 'category_id');
    }
}
