<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLaporanSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'template_id' => ['nullable', 'integer', Rule::exists('laporan_templates', 'id')],
            'instansi_id' => ['nullable', 'integer', Rule::exists('instansi', 'id')],
            'instansi_name' => ['required', 'string', 'max:255'],
            'instansi_level_id' => ['nullable', 'integer', Rule::exists('instansi_levels', 'id')],
            'instansi_level_text' => ['nullable', 'string', 'max:150'],
            'origin_regency_id' => ['nullable', 'integer'],
            'origin_regency_name' => ['nullable', 'string', 'max:255'],
            'report_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'report_level' => ['nullable', 'string', 'max:120'],
            'is_late' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'sections' => ['required', 'array', 'min:1'],
            'sections.*.section_id' => ['nullable'],
            'sections.*.section_code' => ['nullable', 'string', 'max:50'],
            'sections.*.section_title' => ['required', 'string', 'max:255'],
            'sections.*.target_year' => ['nullable', 'string', 'max:120'],
            'sections.*.target_semester_1' => ['nullable', 'string', 'max:120'],
            'sections.*.target_semester_2' => ['nullable', 'string', 'max:120'],
            'sections.*.budget_year' => ['nullable', 'string', 'max:120'],
            'sections.*.budget_semester_1' => ['nullable', 'string', 'max:120'],
            'sections.*.budget_semester_2' => ['nullable', 'string', 'max:120'],
            'sections.*.notes' => ['nullable', 'string'],
        ];
    }
}
