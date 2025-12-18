<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProvinceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'regency_count' => $this->regencies_count ?? $this->whenCounted('regencies'),
            'district_count' => $this->districts_count ?? null,
            'village_count' => $this->villages_count ?? null,
        ];
    }
}
