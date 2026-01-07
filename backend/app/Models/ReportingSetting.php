<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportingSetting extends Model
{
    use HasFactory;

    protected $table = 'reporting_settings';

    protected $fillable = [
        'reporting_year',
        'reporting_deadline',
        'last_backup_at',
    ];

    protected $casts = [
        'reporting_deadline' => 'date',
        'last_backup_at' => 'datetime',
    ];
}
