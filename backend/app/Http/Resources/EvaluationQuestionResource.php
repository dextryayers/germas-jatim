<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EvaluationQuestionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'cluster_id' => $this->cluster_id,
            'question_text' => $this->question_text,
            'sequence' => $this->sequence,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
