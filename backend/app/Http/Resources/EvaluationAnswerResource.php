<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EvaluationAnswerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'question_id' => $this->question_id,
            'question_text' => $this->question_text,
            'answer_value' => $this->answer_value,
            'remark' => $this->remark,
            'cluster_id' => $this->question?->cluster_id,
            'cluster_title' => $this->question?->cluster?->title,
        ];
    }
}
