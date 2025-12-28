<?php

namespace App\Http\Controllers;

use App\Models\EvaluationSubmission;
use App\Models\Instansi;
use App\Models\LaporanSubmission;
use App\Models\SubmissionStatusLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function metrics(Request $request): JsonResponse
    {
        $reportStatusTotals = LaporanSubmission::selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $evaluationStatusTotals = EvaluationSubmission::selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Hitung total laporan (laporan kegiatan + evaluasi) agar kartu "Laporan Masuk"
        // dan "Perlu Verifikasi" mencerminkan seluruh pengajuan yang masuk.
        $laporanTotal = (int) ($reportStatusTotals['pending'] ?? 0)
            + (int) ($reportStatusTotals['verified'] ?? 0)
            + (int) ($reportStatusTotals['rejected'] ?? 0);

        $evaluationsTotal = (int) ($evaluationStatusTotals['pending'] ?? 0)
            + (int) ($evaluationStatusTotals['verified'] ?? 0)
            + (int) ($evaluationStatusTotals['rejected'] ?? 0);

        $reportsTotal = $laporanTotal + $evaluationsTotal;

        $averageScore = EvaluationSubmission::whereNotNull('score')->avg('score');
        $averageScore = $averageScore !== null ? round((float) $averageScore, 1) : null;

        $instansiTotal = Instansi::count();

        $cards = [
            [
                'id' => 'reports_total',
                'label' => 'Laporan Masuk',
                'value' => $reportsTotal,
                'description' => 'Total laporan yang direkam',
            ],
            [
                'id' => 'reports_pending',
                'label' => 'Perlu Verifikasi',
                'value' => (int) ($reportStatusTotals['pending'] ?? 0) + (int) ($evaluationStatusTotals['pending'] ?? 0),
                'description' => 'Laporan menunggu aksi',
            ],
            [
                'id' => 'instansi_total',
                'label' => 'Instansi Terdaftar',
                'value' => (int) $instansiTotal,
                'description' => 'Instansi aktif dalam sistem',
            ],
            [
                'id' => 'average_score',
                'label' => 'Rata-rata Skor Evaluasi',
                'value' => $averageScore ?? 0,
                'description' => $averageScore === null ? 'Belum ada evaluasi' : 'Nilai rerata seluruh evaluasi',
            ],
        ];

        $historyItems = $this->resolveRecentSubmissions();

        $analytics = $this->resolveAnalytics();

        $recentActivity = $this->resolveRecentActivity();

        return response()->json([
            'status' => 'success',
            'data' => [
                'summary' => [
                    'reports' => [
                        'total' => $reportsTotal,
                        'pending' => (int) ($reportStatusTotals['pending'] ?? 0) + (int) ($evaluationStatusTotals['pending'] ?? 0),
                        'verified' => (int) ($reportStatusTotals['verified'] ?? 0) + (int) ($evaluationStatusTotals['verified'] ?? 0),
                        'rejected' => (int) ($reportStatusTotals['rejected'] ?? 0) + (int) ($evaluationStatusTotals['rejected'] ?? 0),
                    ],
                    'evaluations' => [
                        'total' => $evaluationsTotal,
                        'pending' => (int) ($evaluationStatusTotals['pending'] ?? 0),
                        'verified' => (int) ($evaluationStatusTotals['verified'] ?? 0),
                        'rejected' => (int) ($evaluationStatusTotals['rejected'] ?? 0),
                        'average_score' => $averageScore,
                    ],
                    'instansi' => [
                        'total' => (int) $instansiTotal,
                    ],
                ],
                'cards' => $cards,
                'history' => $historyItems->values(),
                'analytics' => $analytics,
                'recent_activity' => $recentActivity,
            ],
        ]);
    }

    private function resolveRecentSubmissions()
    {
        $laporan = LaporanSubmission::query()
            ->with(['instansi', 'instansiLevel', 'verifiedBy'])
            ->orderByDesc('submitted_at')
            ->limit(25)
            ->get()
            ->map(function (LaporanSubmission $submission) {
                return [
                    'submission_db_id' => $submission->id,
                    'id' => $submission->submission_code,
                    'type' => 'laporan',
                    'title' => $submission->instansi_name ? 'Laporan ' . $submission->instansi_name : 'Laporan #' . $submission->submission_code,
                    'instansi' => $submission->instansi_name ?? optional($submission->instansi)->name ?? 'Instansi tidak dikenal',
                    'instansi_level' => $submission->instansi_level_text ?? optional($submission->instansiLevel)->name,
                    'status' => $submission->status,
                    'score' => null,
                    'reviewer' => optional($submission->verifiedBy)->name,
                    'submitted_at' => optional($submission->submitted_at)->toIso8601String(),
                ];
            });

        $evaluations = EvaluationSubmission::query()
            ->with(['instansi', 'instansiLevel', 'verifiedBy'])
            ->orderByDesc('submission_date')
            ->limit(25)
            ->get()
            ->map(function (EvaluationSubmission $submission) {
                return [
                    'submission_db_id' => $submission->id,
                    'id' => $submission->submission_code,
                    'type' => 'evaluasi',
                    'title' => 'Evaluasi ' . ($submission->instansi_name ?? $submission->submission_code),
                    'instansi' => $submission->instansi_name ?? optional($submission->instansi)->name ?? 'Instansi tidak dikenal',
                    'instansi_level' => $submission->instansi_level_text ?? optional($submission->instansiLevel)->name,
                    'status' => $submission->status,
                    'score' => $submission->score,
                    'reviewer' => optional($submission->verifiedBy)->name,
                    'submitted_at' => optional($submission->submission_date)->toIso8601String(),
                ];
            });

        return $laporan->merge($evaluations)
            ->filter(fn ($item) => $item['submitted_at'] !== null)
            ->sortByDesc('submitted_at')
            ->values()
            ->take(30);
    }

    private function resolveAnalytics(): array
    {
        $days = 14;
        $startDate = Carbon::now()->subDays($days - 1)->startOfDay();

        $raw = SubmissionStatusLog::query()
            ->selectRaw('DATE(created_at) as event_date, COUNT(*) as total')
            ->where('created_at', '>=', $startDate)
            ->groupBy('event_date')
            ->orderBy('event_date')
            ->get()
            ->keyBy('event_date');

        $series = [];
        $totalVisits = 0;
        $todayVisits = 0;
        $weekVisits = 0;

        for ($i = 0; $i < $days; $i++) {
            $date = (clone $startDate)->addDays($i);
            $key = $date->toDateString();
            $value = (int) optional($raw->get($key))->total;

            $series[] = [
                'date' => $key,
                'label' => $date->isoFormat('DD MMM'),
                'total' => $value,
            ];

            $totalVisits += $value;

            if ($date->isSameDay(Carbon::today())) {
                $todayVisits = $value;
            }

            if ($date->greaterThanOrEqualTo(Carbon::now()->subDays(6)->startOfDay())) {
                $weekVisits += $value;
            }
        }

        return [
            'series' => $series,
            'total' => $totalVisits,
            'today' => $todayVisits,
            'week' => $weekVisits,
        ];
    }

    private function resolveRecentActivity(): array
    {
        return SubmissionStatusLog::query()
            ->with(['instansi', 'changedBy'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function (SubmissionStatusLog $log) {
                $instansiName = optional($log->instansi)->name;
                $actor = optional($log->changedBy)->name;

                $type = match ($log->new_status) {
                    'verified' => 'verify',
                    'rejected' => 'alert',
                    'pending' => $log->previous_status === null ? 'submit' : 'update',
                    default => 'update',
                };

                $description = match ($type) {
                    'verify' => ($instansiName ? $instansiName . ' ' : '') . 'laporan diverifikasi',
                    'alert' => ($instansiName ? $instansiName . ' ' : '') . 'perlu revisi',
                    'submit' => ($instansiName ? $instansiName . ' ' : '') . 'mengirim pengajuan baru',
                    default => ($instansiName ? $instansiName . ' ' : '') . 'memperbarui data',
                };

                if ($actor) {
                    $description = $actor . ' · ' . $description;
                }

                return [
                    'id' => $log->id,
                    'type' => $type,
                    'instansi' => $instansiName,
                    'description' => $description,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }
}
