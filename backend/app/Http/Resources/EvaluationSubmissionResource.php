<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EvaluationSubmissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'submission_code' => $this->submission_code,
            'instansi_id' => $this->instansi_id,
            'instansi_name' => $this->instansi_name,
            'instansi_level_id' => $this->instansi_level_id,
            'instansi_level_text' => $this->instansi_level_text,
            'instansi_address' => $this->instansi_address,
            'origin_regency_id' => $this->origin_regency_id,
            'origin_district_id' => $this->origin_district_id,
            'origin_village_id' => $this->origin_village_id,
            'origin_regency_name' => optional($this->whenLoaded('originRegency', function () {
                return $this->originRegency;
            }) ?? $this->originRegency)->name,
            'origin_district_name' => optional($this->whenLoaded('originDistrict', function () {
                return $this->originDistrict;
            }) ?? $this->originDistrict)->name,
            'origin_village_name' => optional($this->whenLoaded('originVillage', function () {
                return $this->originVillage;
            }) ?? $this->originVillage)->name,
            'pejabat_nama' => $this->pejabat_nama,
            'pejabat_jabatan' => $this->pejabat_jabatan,
            'employee_male_count' => $this->employee_male_count,
            'employee_female_count' => $this->employee_female_count,
            'evaluation_date' => optional($this->evaluation_date)->format('Y-m-d'),
            'submission_date' => optional($this->submission_date)->toIso8601String(),
            'report_year' => $this->report_year,
            'is_late' => $this->is_late,
            'score' => $this->score,
            'category' => $this->whenLoaded('category', function () {
                return [
                    'id' => $this->category?->id,
                    'label' => $this->category?->label,
                    'slug' => $this->category?->slug,
                    'color_class' => $this->category?->color_class,
                ];
            }),
            'category_label' => $this->category_label,
            'status' => $this->status,
            'remarks' => $this->remarks,
            'submitted_by' => $this->whenLoaded('submittedBy', function () {
                return UserResource::make($this->submittedBy)->resolve();
            }),
            'verified_by' => $this->whenLoaded('verifiedBy', function () {
                return UserResource::make($this->verifiedBy)->resolve();
            }),
            'verified_at' => optional($this->verified_at)->toIso8601String(),
            'answers' => EvaluationAnswerResource::collection($this->whenLoaded('answers')),
            'status_logs' => SubmissionStatusLogResource::collection($this->whenLoaded('statusLogs')),
        ];
    }
}
