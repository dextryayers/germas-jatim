<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SubmissionStatusLogResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'submission_type' => $this->submission_type,
            'submission_id' => $this->submission_id,
            'previous_status' => $this->previous_status,
            'new_status' => $this->new_status,
            'remarks' => $this->remarks,
            'instansi_id' => $this->instansi_id,
            'changed_by' => $this->changed_by,
            'changed_by_name' => $this->whenLoaded('changedBy', fn () => $this->changedBy?->name),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
