<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEvaluationSubmissionRequest;
use App\Http\Requests\UpdateEvaluationStatusRequest;
use App\Http\Resources\EvaluationSubmissionResource;
use App\Models\EvaluasiQuestion;
use App\Models\EvaluationCategory;
use App\Models\EvaluationSubmission;
use App\Models\SubmissionStatusLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EvaluationSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        $submissions = EvaluationSubmission::query()
            ->with([
                'instansi',
                'instansiLevel',
                'category',
                'submittedBy',
                'answers.question.cluster',
                'originRegency',
                'originDistrict',
                'originVillage',
            ])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('instansi_id'), fn ($query) => $query->where('instansi_id', $request->integer('instansi_id')))
            ->when($request->filled('instansi_level_id'), fn ($query) => $query->where('instansi_level_id', $request->integer('instansi_level_id')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%' . trim($request->input('search')) . '%';
                $query->where(function ($sub) use ($term) {
                    $sub->where('submission_code', 'like', $term)
                        ->orWhere('instansi_name', 'like', $term)
                        ->orWhere('pejabat_nama', 'like', $term);
                });
            })
            ->orderByDesc('submission_date')
            ->paginate($perPage);

        return EvaluationSubmissionResource::collection($submissions)
            ->additional(['status' => 'success'])
            ->response();
    }

    public function store(StoreEvaluationSubmissionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $answersInput = collect($data['answers'] ?? []);
        unset($data['answers']);

        // Hitung skor langsung dari jawaban yang dikirim frontend
        $totalQuestions = max($answersInput->count(), 1);
        $totalScore = $answersInput->sum('answer_value');
        $score = (int) round(($totalScore / $totalQuestions) * 100);

        $category = EvaluationCategory::query()
            ->where('min_score', '<=', $score)
            ->where('max_score', '>=', $score)
            ->first();

        $userId = optional($request->user())->id;

        $submission = DB::transaction(function () use ($data, $answersInput, $category, $score, $userId) {
            $submission = EvaluationSubmission::create([
                'submission_code' => $this->generateSubmissionCode('EVL'),
                'instansi_id' => $data['instansi_id'] ?? null,
                'instansi_name' => $data['instansi_name'],
                'instansi_level_id' => $data['instansi_level_id'] ?? null,
                'instansi_level_text' => $data['instansi_level_text'] ?? null,
                'origin_regency_id' => $data['origin_regency_id'] ?? null,
                'origin_district_id' => $data['origin_district_id'] ?? null,
                'origin_village_id' => $data['origin_village_id'] ?? null,
                'instansi_address' => $data['instansi_address'] ?? null,
                'pejabat_nama' => $data['pejabat_nama'] ?? null,
                'pejabat_jabatan' => $data['pejabat_jabatan'] ?? null,
                'employee_male_count' => $data['employee_male_count'] ?? null,
                'employee_female_count' => $data['employee_female_count'] ?? null,
                'evaluation_date' => $data['evaluation_date'] ?? null,
                'submission_date' => Carbon::now(),
                'score' => $score,
                'category_id' => $category?->id,
                'category_label' => $category?->label,
                'status' => 'pending',
                'remarks' => $data['remarks'] ?? null,
                'submitted_by' => $userId,
            ]);

            $answersPayload = $answersInput->map(function ($answer) {
                return [
                    'question_id' => (int) $answer['question_id'],
                    'question_text' => $answer['question_text'],
                    'answer_value' => (int) $answer['answer_value'],
                    'remark' => $answer['remark'] ?? null,
                ];
            })->all();

            $submission->answers()->createMany($answersPayload);

            SubmissionStatusLog::create([
                'submission_type' => 'evaluasi',
                'submission_id' => $submission->id,
                'previous_status' => null,
                'new_status' => 'pending',
                'remarks' => $data['remarks'] ?? null,
                'instansi_id' => $submission->instansi_id,
                'changed_by' => $userId,
            ]);

            return $submission;
        });

        return EvaluationSubmissionResource::make($submission->fresh([
            'instansi',
            'instansiLevel',
            'category',
            'answers',
            'statusLogs.changedBy',
            'originRegency',
            'originDistrict',
            'originVillage',
        ]))
            ->additional([
                'status' => 'success',
                'message' => 'Pengajuan evaluasi berhasil disimpan.',
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function show(EvaluationSubmission $submission): JsonResponse
    {
        $submission->load([
            'instansi',
            'instansiLevel',
            'category',
            'answers',
            'statusLogs' => fn ($query) => $query->latest(),
            'statusLogs.changedBy',
            'submittedBy',
            'verifiedBy',
        ]);

        return EvaluationSubmissionResource::make($submission->load([
            'originRegency',
            'originDistrict',
            'originVillage',
        ]))
            ->additional(['status' => 'success'])
            ->response();
    }

    public function updateStatus(UpdateEvaluationStatusRequest $request, EvaluationSubmission $submission): JsonResponse
    {
        $data = $request->validated();
        $previousStatus = $submission->status;
        $newStatus = $data['status'];
        $remarks = $data['remarks'] ?? null;

        DB::transaction(function () use ($submission, $previousStatus, $newStatus, $remarks, $request) {
            $submission->status = $newStatus;
            $submission->remarks = $remarks;

            if ($newStatus === 'verified' || $newStatus === 'rejected') {
                $submission->verified_by = optional($request->user())->id;
                $submission->verified_at = Carbon::now();
            } elseif ($newStatus === 'pending') {
                $submission->verified_by = null;
                $submission->verified_at = null;
            }

            $submission->save();

            SubmissionStatusLog::create([
                'submission_type' => 'evaluasi',
                'submission_id' => $submission->id,
                'previous_status' => $previousStatus,
                'new_status' => $newStatus,
                'remarks' => $remarks,
                'instansi_id' => $submission->instansi_id,
                'changed_by' => optional($request->user())->id,
            ]);
        });

        return EvaluationSubmissionResource::make($submission->fresh([
            'category',
            'instansi',
            'instansiLevel',
            'answers',
            'statusLogs' => fn ($query) => $query->latest(),
            'statusLogs.changedBy',
            'submittedBy',
            'verifiedBy',
            'originRegency',
            'originDistrict',
            'originVillage',
        ]))
            ->additional([
                'status' => 'success',
                'message' => 'Status evaluasi berhasil diperbarui.',
            ])
            ->response();
    }

    public function destroy(EvaluationSubmission $submission): JsonResponse
    {
        DB::transaction(function () use ($submission) {
            SubmissionStatusLog::where('submission_type', 'evaluasi')
                ->where('submission_id', $submission->id)
                ->delete();

            $submission->delete();
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan evaluasi berhasil dihapus.',
        ]);
    }

    private function generateSubmissionCode(string $prefix): string
    {
        $dateSegment = Carbon::now()->format('ymd');

        do {
            $code = sprintf('%s-%s-%04d', $prefix, $dateSegment, random_int(0, 9999));
        } while (EvaluationSubmission::where('submission_code', $code)->exists());

        return $code;
    }
}
