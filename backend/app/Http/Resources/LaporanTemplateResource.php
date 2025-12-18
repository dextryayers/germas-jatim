<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LaporanTemplateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'year' => $this->year,
            'is_default' => (bool) $this->is_default,
            'instansi_id' => $this->instansi_id,
            'instansi_level_id' => $this->instansi_level_id,
            'sections' => LaporanSectionResource::collection($this->whenLoaded('sections')),
        ];
    }
}
