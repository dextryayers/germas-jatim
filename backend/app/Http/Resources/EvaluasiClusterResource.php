<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EvaluasiClusterResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'instansi_level_id' => $this->instansi_level_id,
            'title' => $this->title,
            'sequence' => $this->sequence,
            'is_active' => (bool) $this->is_active,
            'applies_to_all' => (bool) $this->applies_to_all,
            'questions' => EvaluationQuestionResource::collection($this->whenLoaded('questions')),
        ];
    }
}
