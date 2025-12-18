<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstansiLevel extends Model
{
    use HasFactory;

    protected $table = 'instansi_levels';

    protected $fillable = [
        'code',
        'name',
        'description',
    ];

    public function instansi(): HasMany
    {
        return $this->hasMany(Instansi::class, 'level_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'instansi_level_id');
    }
}
