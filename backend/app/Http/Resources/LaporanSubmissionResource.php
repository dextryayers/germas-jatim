<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LaporanSubmissionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'submission_code' => $this->submission_code,
            'template_id' => $this->template_id,
            'instansi_id' => $this->instansi_id,
            'instansi_name' => $this->instansi_name,
            'instansi_level_id' => $this->instansi_level_id,
            'instansi_level_text' => $this->instansi_level_text,
            'origin_regency_id' => $this->origin_regency_id,
            'origin_regency_name' => $this->origin_regency_name,
            'report_year' => $this->report_year,
            'report_level' => $this->report_level,
            'status' => $this->status,
            'notes' => $this->notes,
            'submitted_at' => optional($this->submitted_at)->toIso8601String(),
            'verified_at' => optional($this->verified_at)->toIso8601String(),
            'submitted_by' => $this->whenLoaded('submittedBy', fn () => UserResource::make($this->submittedBy)->resolve()),
            'verified_by' => $this->whenLoaded('verifiedBy', fn () => UserResource::make($this->verifiedBy)->resolve()),
            'instansi' => $this->whenLoaded('instansi', fn () => $this->instansi?->only(['id', 'name', 'slug', 'category'])),
            'instansi_level' => $this->whenLoaded('instansiLevel', fn () => $this->instansiLevel?->only(['id', 'code', 'name'])),
            'template' => $this->whenLoaded('template', fn () => LaporanTemplateResource::make($this->template)->resolve()),
            'sections' => LaporanSubmissionSectionResource::collection($this->whenLoaded('sections')),
            'status_logs' => SubmissionStatusLogResource::collection($this->whenLoaded('statusLogs')),
        ];
    }
}
