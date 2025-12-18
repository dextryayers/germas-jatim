<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegencyResource extends JsonResource
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
            'type' => $this->type,
            'district_count' => $this->districts_count ?? $this->whenCounted('districts'),
            'village_count' => $this->villages_count ?? $this->whenCounted('villages'),
        ];
    }
}
