<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanSubmissionSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'laporan_submission_id',
        'section_id',
        'section_code',
        'section_title',
        'target_year',
        'target_semester_1',
        'target_semester_2',
        'budget_year',
        'budget_semester_1',
        'budget_semester_2',
        'notes',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(LaporanSubmission::class, 'laporan_submission_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(LaporanSection::class, 'section_id');
    }
}
