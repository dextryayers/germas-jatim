<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEvaluationSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'instansi_id' => ['nullable', 'integer', Rule::exists('instansi', 'id')],
            'instansi_name' => ['required', 'string', 'max:255'],
            'instansi_level_id' => ['nullable', 'integer', Rule::exists('instansi_levels', 'id')],
            'instansi_level_text' => ['nullable', 'string', 'max:150'],
            'instansi_address' => ['nullable', 'string', 'max:255'],
            'origin_regency_id' => ['nullable', 'integer'],
            'origin_district_id' => ['nullable', 'integer'],
            'origin_village_id' => ['nullable', 'integer'],
            'pejabat_nama' => ['nullable', 'string', 'max:255'],
            'pejabat_jabatan' => ['nullable', 'string', 'max:150'],
            'employee_male_count' => ['nullable', 'integer', 'min:0'],
            'employee_female_count' => ['nullable', 'integer', 'min:0'],
            'evaluation_date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.question_text' => ['required', 'string', 'max:500'],
            'answers.*.answer_value' => ['required', 'integer', 'between:0,1'],
            'answers.*.remark' => ['nullable', 'string'],
        ];
    }
}
