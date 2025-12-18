<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLaporanSubmissionRequest;
use App\Http\Requests\UpdateLaporanStatusRequest;
use App\Http\Resources\LaporanSubmissionResource;
use App\Models\LaporanSubmission;
use App\Models\SubmissionStatusLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class LaporanSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        $submissions = LaporanSubmission::query()
            ->with([
                'instansi',
                'instansiLevel',
                'template' => fn ($query) => $query->with(['sections' => fn ($builder) => $builder->orderBy('sequence')]),
                'submittedBy',
            ])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('instansi_id'), fn ($query) => $query->where('instansi_id', $request->integer('instansi_id')))
            ->when($request->filled('instansi_level_id'), fn ($query) => $query->where('instansi_level_id', $request->integer('instansi_level_id')))
            ->when($request->filled('report_year'), fn ($query) => $query->where('report_year', $request->integer('report_year')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%' . trim($request->input('search')) . '%';
                $query->where(function ($sub) use ($term) {
                    $sub->where('submission_code', 'like', $term)
                        ->orWhere('instansi_name', 'like', $term)
                        ->orWhere('report_level', 'like', $term);
                });
            })
            ->orderByDesc('submitted_at')
            ->paginate($perPage);

        return LaporanSubmissionResource::collection($submissions)
            ->additional(['status' => 'success'])
            ->response();
    }

    public function store(StoreLaporanSubmissionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $sectionsInput = collect($data['sections'] ?? []);
        unset($data['sections']);

        $userId = optional($request->user())->id;

        $submission = DB::transaction(function () use ($data, $sectionsInput, $userId) {
            $submission = LaporanSubmission::create([
                'submission_code' => $this->generateSubmissionCode('LPR'),
                'template_id' => $data['template_id'] ?? null,
                'instansi_id' => $data['instansi_id'] ?? null,
                'instansi_name' => $data['instansi_name'],
                'instansi_level_id' => $data['instansi_level_id'] ?? null,
                'instansi_level_text' => $data['instansi_level_text'] ?? null,
                'report_year' => $data['report_year'],
                'report_level' => $data['report_level'] ?? null,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'submitted_by' => $userId,
                'submitted_at' => Carbon::now(),
            ]);

            $sectionsPayload = $sectionsInput->map(function ($section) {
                return [
                    'section_id' => $section['section_id'] ?? null,
                    'section_code' => $section['section_code'] ?? null,
                    'section_title' => $section['section_title'],
                    'target_year' => $section['target_year'] ?? null,
                    'target_semester_1' => $section['target_semester_1'] ?? null,
                    'target_semester_2' => $section['target_semester_2'] ?? null,
                    'budget_year' => $section['budget_year'] ?? null,
                    'budget_semester_1' => $section['budget_semester_1'] ?? null,
                    'budget_semester_2' => $section['budget_semester_2'] ?? null,
                    'notes' => $section['notes'] ?? null,
                ];
            })->all();

            $submission->sections()->createMany($sectionsPayload);

            SubmissionStatusLog::create([
                'submission_type' => 'laporan',
                'submission_id' => $submission->id,
                'previous_status' => null,
                'new_status' => 'pending',
                'remarks' => $submission->notes,
                'instansi_id' => $submission->instansi_id,
                'changed_by' => $userId,
            ]);

            return $submission;
        });

        return LaporanSubmissionResource::make($submission->fresh([
            'instansi',
            'instansiLevel',
            'template.sections',
            'sections',
            'statusLogs.changedBy',
        ]))
            ->additional([
                'status' => 'success',
                'message' => 'Laporan kegiatan berhasil disimpan.',
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function show(LaporanSubmission $submission): JsonResponse
    {
        $submission->load([
            'instansi',
            'instansiLevel',
            'template.sections',
            'sections',
            'statusLogs' => fn ($query) => $query->latest(),
            'statusLogs.changedBy',
            'submittedBy',
            'verifiedBy',
        ]);

        return LaporanSubmissionResource::make($submission)
            ->additional(['status' => 'success'])
            ->response();
    }

    public function updateStatus(UpdateLaporanStatusRequest $request, LaporanSubmission $submission): JsonResponse
    {
        $data = $request->validated();
        $previousStatus = $submission->status;
        $newStatus = $data['status'];
        $notes = $data['notes'] ?? null;

        DB::transaction(function () use ($submission, $previousStatus, $newStatus, $notes, $request) {
            $submission->status = $newStatus;
            $submission->notes = $notes;

            if ($newStatus === 'verified' || $newStatus === 'rejected') {
                $submission->verified_by = optional($request->user())->id;
                $submission->verified_at = Carbon::now();
            } elseif ($newStatus === 'pending') {
                $submission->verified_by = null;
                $submission->verified_at = null;
            }

            $submission->save();

            SubmissionStatusLog::create([
                'submission_type' => 'laporan',
                'submission_id' => $submission->id,
                'previous_status' => $previousStatus,
                'new_status' => $newStatus,
                'remarks' => $notes,
                'instansi_id' => $submission->instansi_id,
                'changed_by' => optional($request->user())->id,
            ]);
        });

        return LaporanSubmissionResource::make($submission->fresh([
            'instansi',
            'instansiLevel',
            'template.sections',
            'sections',
            'statusLogs' => fn ($query) => $query->latest(),
            'statusLogs.changedBy',
            'submittedBy',
            'verifiedBy',
        ]))
            ->additional([
                'status' => 'success',
                'message' => 'Status laporan berhasil diperbarui.',
            ])
            ->response();
    }

    public function destroy(LaporanSubmission $submission): JsonResponse
    {
        DB::transaction(function () use ($submission) {
            SubmissionStatusLog::where('submission_type', 'laporan')
                ->where('submission_id', $submission->id)
                ->delete();

            $submission->sections()->delete();
            $submission->delete();
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan kegiatan berhasil dihapus.',
        ]);
    }

    private function generateSubmissionCode(string $prefix): string
    {
        $dateSegment = Carbon::now()->format('ymd');

        do {
            $code = sprintf('%s-%s-%04d', $prefix, $dateSegment, random_int(0, 9999));
        } while (LaporanSubmission::where('submission_code', $code)->exists());

        return $code;
    }
}
