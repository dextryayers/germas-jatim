<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LaporanSectionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'template_id' => $this->template_id,
            'code' => $this->code,
            'title' => $this->title,
            'indicator' => $this->indicator,
            'has_target' => (bool) $this->has_target,
            'has_budget' => (bool) $this->has_budget,
            'sequence' => $this->sequence,
        ];
    }
}
