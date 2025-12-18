<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LaporanSubmissionSectionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'laporan_submission_id' => $this->laporan_submission_id,
            'section_id' => $this->section_id,
            'section_code' => $this->section_code,
            'section_title' => $this->section_title,
            'target_year' => $this->target_year,
            'target_semester_1' => $this->target_semester_1,
            'target_semester_2' => $this->target_semester_2,
            'budget_year' => $this->budget_year,
            'budget_semester_1' => $this->budget_semester_1,
            'budget_semester_2' => $this->budget_semester_2,
            'notes' => $this->notes,
        ];
    }
}
