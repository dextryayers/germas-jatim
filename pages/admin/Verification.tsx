import React, { useState, useEffect } from 'react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Check, X, Eye, FileText, Search, Download, ChevronDown, Calendar, Building2, User, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SubmissionStore, SubmissionRecord } from '../../utils/submissionStore';

import { generateEvaluasiPDF, generateLaporanPDF } from '../../utils/pdfGenerator';
import { showConfirmation } from '../../utils/alerts';
import { apiClient } from '../../utils/apiClient';

const Verification: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterInstansiLevel, setFilterInstansiLevel] = useState<string>('all');
  
  // Filter asal wilayah
  const [regencyOptions, setRegencyOptions] = useState<{ id: number; name: string }[]>([]);
  const [districtOptions, setDistrictOptions] = useState<{ id: number; name: string }[]>([]);
  const [villageOptions, setVillageOptions] = useState<{ id: number; name: string }[]>([]);

  const [filterRegencyId, setFilterRegencyId] = useState<string>('');
  const [filterDistrictId, setFilterDistrictId] = useState<string>('');
  const [filterVillageId, setFilterVillageId] = useState<string>('');

  const [reports, setReports] = useState<SubmissionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [evaluasiPage, setEvaluasiPage] = useState<number>(1);
  const [evaluasiPageSize, setEvaluasiPageSize] = useState<number>(10);
  const [laporanPage, setLaporanPage] = useState<number>(1);
  const [laporanPageSize, setLaporanPageSize] = useState<number>(10);

  // Modal State
  const [selectedRecord, setSelectedRecord] = useState<SubmissionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async (record: SubmissionRecord) => {
    try {
      const backendData: any = (record.payload as any)?.backend?.data ?? null;
      const backendId = backendData?.id;

      if (backendId) {
        const basePath = record.type === 'evaluasi' ? '/evaluasi/submissions' : '/laporan/submissions';
        await apiClient.delete(`${basePath}/${backendId}`);
      }

      // Hapus juga dari penyimpanan lokal dan state frontend
      SubmissionStore.remove(record.id);
      setReports((prev) => prev.filter((r) => r.id !== record.id));

      if (selectedRecord && selectedRecord.id === record.id) {
        setSelectedRecord(null);
        setIsModalOpen(false);
      }

      toast.success(<b>Surat laporan berhasil dihapus.</b>);
    } catch (error: any) {
      const message = error?.data?.message || 'Gagal menghapus data di server. Coba lagi.';
      toast.error(message);
    }
  };

  // Load data from backend so admin melihat data global, bukan hanya localStorage perangkat
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [evalResp, lapResp] = await Promise.all([
          apiClient.get<any>('/evaluasi/submissions', { query: { per_page: 100 } }),
          apiClient.get<any>('/laporan/submissions', { query: { per_page: 100 } }),
        ]);

        if (cancelled) return;

        const evalItems: any[] = (evalResp as any)?.data?.data ?? (evalResp as any)?.data ?? [];
        const lapItems: any[] = (lapResp as any)?.data?.data ?? (lapResp as any)?.data ?? [];

        const evalRecords: SubmissionRecord[] = evalItems.map((item: any) => {
          const submissionDate = item.submission_date ?? item.created_at ?? null;
          const yearFromEvaluation = item.evaluation_date ? new Date(item.evaluation_date).getFullYear() : null;
          const yearFromSubmission = submissionDate ? new Date(submissionDate).getFullYear() : new Date().getFullYear();

          return {
            id: item.submission_code ?? String(item.id),
            type: 'evaluasi',
            instansiName: item.instansi_name ?? 'Instansi tidak dikenal',
            submitDate: submissionDate ?? new Date().toISOString(),
            year: yearFromEvaluation ?? yearFromSubmission,
            status: item.status ?? 'pending',
            payload: {
              backend: { data: item },
            },
          };
        });

        const laporanRecords: SubmissionRecord[] = lapItems.map((item: any) => {
          const submittedAt = item.submitted_at ?? item.created_at ?? null;
          const year = item.report_year ?? (submittedAt ? new Date(submittedAt).getFullYear() : new Date().getFullYear());

          return {
            id: item.submission_code ?? String(item.id),
            type: 'laporan',
            instansiName: item.instansi_name ?? 'Instansi tidak dikenal',
            submitDate: submittedAt ?? new Date().toISOString(),
            year,
            status: item.status ?? 'pending',
            payload: {
              backend: { data: item },
            },
          };
        });

        setReports([...evalRecords, ...laporanRecords]);
      } catch (error) {
        console.error('Gagal memuat data untuk verifikasi', error);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 15000); // Polling berkala untuk update status
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // --- LOAD REGION OPTIONS FOR FILTERS ---
  useEffect(() => {
    if (regencyOptions.length > 0) return;

    apiClient
      .get<any>('/regions', { query: { province_code: '35' } })
      .then((response) => {
        const raw = (response as any)?.regencies ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setRegencyOptions(
          items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') }))
        );
      })
      .catch(() => {
        setRegencyOptions([]);
      });
  }, [regencyOptions.length]);

  useEffect(() => {
    setFilterDistrictId('');
    setFilterVillageId('');
    setDistrictOptions([]);
    setVillageOptions([]);

    if (!filterRegencyId) return;

    apiClient
      .get<any>(`/regions/${filterRegencyId}/districts`)
      .then((response) => {
        const raw = (response as any)?.districts ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setDistrictOptions(
          items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') }))
        );
      })
      .catch(() => {
        setDistrictOptions([]);
      });
  }, [filterRegencyId]);

  useEffect(() => {
    setFilterVillageId('');
    setVillageOptions([]);

    if (!filterDistrictId) return;

    apiClient
      .get<any>(`/districts/${filterDistrictId}/villages`)
      .then((response) => {
        const raw = (response as any)?.villages ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setVillageOptions(
          items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') }))
        );
      })
      .catch(() => {
        setVillageOptions([]);
      });
  }, [filterDistrictId]);

  const handleVerify = async (record: SubmissionRecord, newStatus: 'verified' | 'rejected') => {
    try {
      const backendData = (record.payload as any)?.backend?.data;

      if (backendData && backendData.id) {
        const basePath = record.type === 'evaluasi' ? '/evaluasi/submissions' : '/laporan/submissions';
        await apiClient.patch(`${basePath}/${backendData.id}/status`, {
          status: newStatus,
          remarks: null,
        });
      }

      // Opsional: update juga status di local SubmissionStore jika ada catatan lokal
      SubmissionStore.updateStatus(record.id, newStatus);

      setReports(prev => prev.map(r => r.id === record.id ? { ...r, status: newStatus } : r));

      if (selectedRecord && selectedRecord.id === record.id) {
        setSelectedRecord(prev => prev ? { ...prev, status: newStatus } : null);
      }

      if (newStatus === 'verified') {
        toast.success(<b>Laporan berhasil diverifikasi!</b>);
      } else {
        toast.error(<b>Laporan ditolak.</b>);
      }
    } catch (error: any) {
      const message = error?.data?.message || 'Gagal memperbarui status di server. Coba lagi.';
      toast.error(message);
    }
  };

  const handleDownloadPDF = (submission: SubmissionRecord) => {
    try {
      if (submission.type === 'evaluasi') {
        const backendData: any = (submission.payload as any)?.backend?.data ?? null;

        if (!backendData) {
          toast.error('Data evaluasi tidak lengkap untuk diunduh.');
          return;
        }

        const score = typeof backendData?.score === 'number' ? backendData.score : null;
        const categoryLabel: string | undefined =
          backendData?.category?.label ?? backendData?.category_label ?? undefined;
        const category = categoryLabel
          ? { label: categoryLabel, color: 'text-emerald-600' }
          : undefined;

        const instansiData = {
          nama: backendData?.instansi_name ?? 'Instansi tidak dikenal',
          alamat: backendData?.instansi_address ?? '-',
          pejabat: backendData?.pejabat_nama ?? '-',
          jmlLaki: backendData?.employee_male_count ?? 0,
          jmlPerempuan: backendData?.employee_female_count ?? 0,
        };

        const answersFromBackend: any[] = backendData?.answers ?? [];

        const clustersMap: Record<string, { id: number; title: string; questions: { id: number; text: string }[] }> = {};
        let clusterIndex = 1;

        answersFromBackend.forEach((a) => {
          const clusterTitle: string = a.cluster_title || 'Rincian Jawaban';
          const key = String(a.cluster_id ?? clusterTitle);

          if (!clustersMap[key]) {
            clustersMap[key] = {
              id: typeof a.cluster_id === 'number' ? a.cluster_id : clusterIndex++,
              title: clusterTitle,
              questions: [],
            };
          }

          clustersMap[key].questions.push({
            id: a.question_id,
            text: a.question_text,
          });
        });

        const clusters = Object.values(clustersMap) as any;

        const answers: Record<number, number> = {};
        const remarks: Record<number, string> = {};
        answersFromBackend.forEach((a) => {
          if (a && typeof a.question_id !== 'undefined') {
            answers[a.question_id] = a.answer_value;
            if (a.remark) {
              remarks[a.question_id] = a.remark;
            }
          }
        });

        const instansiForPdf = {
          ...instansiData,
          originRegencyName: backendData?.origin_regency_name ?? null,
          originDistrictName: backendData?.origin_district_name ?? null,
          originVillageName: backendData?.origin_village_name ?? null,
        };

        generateEvaluasiPDF(instansiForPdf, score ?? 0, category, clusters, answers, remarks);
      } else {
        // LAPORAN: rekonstruksi template & input dari data backend
        const backendData: any = (submission.payload as any)?.backend?.data ?? null;

        if (!backendData) {
          toast.error('Data laporan tidak lengkap untuk diunduh.');
          return;
        }

        const rawTemplate = backendData?.template;
        const submittedSections: any[] = backendData?.sections ?? [];
        const year: string = String(backendData?.report_year ?? new Date().getFullYear());

        const effectiveTemplate: any =
          rawTemplate && Array.isArray(rawTemplate.sections) && rawTemplate.sections.length > 0
            ? rawTemplate
            : {
                instansiName: backendData?.instansi_name ?? 'Instansi tidak dikenal',
                sections: submittedSections.map((sec) => ({
                  id: sec.section_id ?? sec.id,
                  title: sec.section_title ?? 'Indikator',
                  indicator: sec.section_title ?? '',
                  hasTarget: true,
                  hasBudget: true,
                })),
              };

        if (!Array.isArray(effectiveTemplate.sections) || effectiveTemplate.sections.length === 0) {
          toast.error('Template atau daftar indikator laporan belum tersedia.');
          return;
        }

        const laporanInputs: Record<string, any> = {};
        submittedSections.forEach((sec) => {
          const sectionId = sec.section_id ?? sec.section_code ?? sec.id ?? null;
          if (!sectionId) return;
          const key = String(sectionId);

          laporanInputs[`${key}-target-year`] = sec.target_year ?? '';
          laporanInputs[`${key}-target-sem1`] = sec.target_semester_1 ?? '';
          laporanInputs[`${key}-target-sem2`] = sec.target_semester_2 ?? '';

          laporanInputs[`${key}-budget-year`] = sec.budget_year ?? '';
          laporanInputs[`${key}-budget-sem1`] = sec.budget_semester_1 ?? '';
          laporanInputs[`${key}-budget-sem2`] = sec.budget_semester_2 ?? '';
        });

        // Label asal wilayah untuk judul PDF
        const instansiLevelText: string | null =
          backendData?.instansi_level_text ??
          backendData?.instansi_level?.name ??
          null;

        const isProvinsiLevel = !!instansiLevelText && instansiLevelText.toUpperCase().includes('PROVINSI');
        let originLabel: string | undefined;
        if (isProvinsiLevel) {
          originLabel = 'Provinsi Jawa Timur';
        } else if (backendData?.origin_regency_name) {
          originLabel = backendData.origin_regency_name as string;
        }

        generateLaporanPDF(effectiveTemplate, originLabel, laporanInputs, year);
      }

      toast.success('PDF berhasil diunduh');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengunduh PDF: Data tidak lengkap');
    }
  };

  const openDetail = (record: SubmissionRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  // Filter Logic
  const filteredReports = reports.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesYear = filterYear === 'all' || r.year.toString() === filterYear;
    const matchesSearch =
      r.instansiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    let instansiLevelText: string | null = null;
    if (r.type === 'evaluasi') {
      const backendData: any = (r.payload as any)?.backend?.data ?? null;
      instansiLevelText =
        backendData?.instansi_level_text ??
        backendData?.instansi_level?.name ??
        (r.payload as any)?.instansiData?.level ?? null;
    } else if (r.type === 'laporan') {
      const backendData: any = (r.payload as any)?.backend?.data ?? null;
      instansiLevelText =
        backendData?.instansi_level_text ??
        backendData?.instansi_level?.name ??
        (r.payload as any)?.level ?? null;
    }

    const matchesInstansiLevel =
      filterInstansiLevel === 'all' ||
      (instansiLevelText && instansiLevelText.toLowerCase() === filterInstansiLevel.toLowerCase());

    // Filter asal wilayah hanya jika bukan provinsi
    let matchesOrigin = true;
    if (instansiLevelText && !instansiLevelText.toUpperCase().includes('PROVINSI')) {
      const upper = instansiLevelText.toUpperCase();

      const backendData: any = (r.payload as any)?.backend?.data ?? null;

      const originRegencyId = backendData?.origin_regency_id ?? null;
      const originDistrictId = backendData?.origin_district_id ?? null;
      const originVillageId = backendData?.origin_village_id ?? null;

      if (upper.includes('KABUPATEN') || upper.includes('KOTA') || upper.includes('PERUSAHAAN')) {
        if (filterRegencyId) {
          matchesOrigin = String(originRegencyId) === filterRegencyId;
        }
      }

      if (upper.includes('KECAMATAN')) {
        if (filterRegencyId) {
          matchesOrigin = matchesOrigin && String(originRegencyId) === filterRegencyId;
        }
        if (filterDistrictId) {
          matchesOrigin = matchesOrigin && String(originDistrictId) === filterDistrictId;
        }
      }

      if (upper.includes('KELURAHAN') || upper.includes('DESA')) {
        if (filterRegencyId) {
          matchesOrigin = matchesOrigin && String(originRegencyId) === filterRegencyId;
        }
        if (filterDistrictId) {
          matchesOrigin = matchesOrigin && String(originDistrictId) === filterDistrictId;
        }
        if (filterVillageId) {
          matchesOrigin = matchesOrigin && String(originVillageId) === filterVillageId;
        }
      }
    }

    return matchesStatus && matchesYear && matchesSearch && matchesInstansiLevel && matchesOrigin;
  });

  // Split Data
  const evaluasiList = filteredReports.filter((r) => r.type === 'evaluasi');
  const laporanList = filteredReports.filter((r) => r.type === 'laporan');

  // Reset halaman ketika filter/search berubah agar tidak keluar range
  useEffect(() => {
    setEvaluasiPage(1);
    setLaporanPage(1);
  }, [
    filterStatus,
    filterYear,
    filterInstansiLevel,
    filterRegencyId,
    filterDistrictId,
    filterVillageId,
    searchTerm,
  ]);

  // Pagination helpers
  const evaluasiTotal = evaluasiList.length;
  const evaluasiTotalPages = Math.max(1, Math.ceil(evaluasiTotal / evaluasiPageSize));
  const safeEvaluasiPage = Math.min(evaluasiPage, evaluasiTotalPages);
  const evaluasiStartIndex = (safeEvaluasiPage - 1) * evaluasiPageSize;
  const evaluasiEndIndex = evaluasiStartIndex + evaluasiPageSize;
  const evaluasiPaginated = evaluasiList.slice(evaluasiStartIndex, evaluasiEndIndex);

  const laporanTotal = laporanList.length;
  const laporanTotalPages = Math.max(1, Math.ceil(laporanTotal / laporanPageSize));
  const safeLaporanPage = Math.min(laporanPage, laporanTotalPages);
  const laporanStartIndex = (safeLaporanPage - 1) * laporanPageSize;
  const laporanEndIndex = laporanStartIndex + laporanPageSize;
  const laporanPaginated = laporanList.slice(laporanStartIndex, laporanEndIndex);

  const availableYears = Array.from(new Set(reports.map((r) => r.year))).sort(
    (a: number, b: number) => b - a,
  );

  const rawInstansiLevels: string[] = reports
    .map((r) => {
      if (r.type === 'evaluasi') {
        const backendData: any = (r.payload as any)?.backend?.data ?? null;
        return (
          backendData?.instansi_level_text ??
          backendData?.instansi_level?.name ??
          (r.payload as any)?.instansiData?.level ?? null
        );
      }

      if (r.type === 'laporan') {
        const backendData: any = (r.payload as any)?.backend?.data ?? null;
        return (
          backendData?.instansi_level_text ??
          backendData?.instansi_level?.name ??
          (r.payload as any)?.level ?? null
        );
      }

      return null;
    })
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const availableInstansiLevels: string[] = Array.from(new Set<string>(rawInstansiLevels)).sort();

  const formatInstansiLevelLabel = (raw: string | null | undefined): string => {
    if (!raw) return '-';
    const upper = raw.toUpperCase();

    if (upper.includes('PROVINSI')) return 'Tingkat Provinsi';
    if (upper.includes('KABUPATEN') || upper.includes('KOTA')) return 'Tingkat Kabupaten/Kota';
    if (upper.includes('KECAMATAN')) return 'Tingkat Kecamatan';
    if (upper.includes('KELURAHAN') || upper.includes('DESA')) return 'Tingkat Kelurahan/Desa';
    if (upper.includes('PERUSAHAAN')) return 'Tingkat Perusahaan';

    return `Tingkat ${raw}`;
  };

  // --- RENDER MODAL CONTENT ---
  const renderDetailContent = () => {
    if (!selectedRecord) return null;
    const { payload, type } = selectedRecord;

    if (type === 'evaluasi') {
      const backendData: any = (payload as any)?.backend?.data ?? null;
      const scoreFromPayload = (payload as any)?.score;
      const categoryFromPayload = (payload as any)?.category;

      const resolvedScore: number | null =
        typeof scoreFromPayload === 'number'
          ? scoreFromPayload
          : typeof backendData?.score === 'number'
            ? backendData.score
            : null;

      const backendCategoryLabel: string | undefined =
        categoryFromPayload?.label ?? backendData?.category?.label ?? backendData?.category_label ?? undefined;

      const categoryLabel = backendCategoryLabel || 'Belum Dinilai';

      const backendInstansiData = {
        nama: backendData?.instansi_name ?? 'Instansi tidak dikenal',
        alamat: backendData?.instansi_address ?? '-',
        pejabat: backendData?.pejabat_nama ?? '-',
        jmlLaki: backendData?.employee_male_count ?? 0,
        jmlPerempuan: backendData?.employee_female_count ?? 0,
      };

      const instansiData = (payload as any)?.instansiData ?? backendInstansiData;

      const answersFromBackend: any[] = backendData?.answers ?? [];

      // Grupkan jawaban per kluster untuk tampilan modal
      const clustersMap: Record<string, { id: number; title: string; questions: { id: number; text: string }[] }> = {};
      let clusterIndex = 1;

      answersFromBackend.forEach((a) => {
        const clusterTitle: string = a.cluster_title || 'Rincian Jawaban';
        const key = String(a.cluster_id ?? clusterTitle);

        if (!clustersMap[key]) {
          clustersMap[key] = {
            id: typeof a.cluster_id === 'number' ? a.cluster_id : clusterIndex++,
            title: clusterTitle,
            questions: [],
          };
        }

        clustersMap[key].questions.push({
          id: a.question_id,
          text: a.question_text,
        });
      });

      const clustersFromBackend = Object.values(clustersMap);

      const clusters = (payload as any)?.clusters ?? clustersFromBackend;

      const answersPayload = (payload as any)?.answers ?? {};
      const remarksPayload = (payload as any)?.remarks ?? {};

      const answers: Record<number, number> = { ...answersPayload };
      const remarks: Record<number, string> = { ...remarksPayload };

      answersFromBackend.forEach((a) => {
        if (a && typeof a.question_id !== 'undefined') {
          if (typeof answers[a.question_id] === 'undefined') {
            answers[a.question_id] = a.answer_value;
          }
          if (a.remark && typeof remarks[a.question_id] === 'undefined') {
            remarks[a.question_id] = a.remark;
          }
        }
      });

      const originRegencyName: string | null = backendData?.origin_regency_name ?? null;
      const originDistrictName: string | null = backendData?.origin_district_name ?? null;
      const originVillageName: string | null = backendData?.origin_village_name ?? null;

      return (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Instansi</p>
              <p className="font-semibold text-slate-800">{instansiData.nama}</p>
              <p className="text-xs text-slate-600 mt-1">{instansiData.alamat}</p>
              {(originRegencyName || originDistrictName || originVillageName) && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Asal Wilayah:
                  {originRegencyName && ` Kab/Kota ${originRegencyName}`}
                  {originDistrictName && `, Kec ${originDistrictName}`}
                  {originVillageName && `, Desa/Kel ${originVillageName}`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-bold">Pejabat</p>
              <p className="font-semibold text-slate-800">{instansiData.pejabat}</p>
              <p className="text-xs text-slate-600 mt-1">
                Jml Pegawai: L {instansiData.jmlLaki} / P {instansiData.jmlPerempuan}
              </p>
            </div>
          </div>

          {/* Score Card */}
          <div className="flex items-center justify-between bg-green-50 p-6 rounded-xl border border-green-100">
            <div>
              <p className="text-sm text-green-800 font-bold mb-1">SKOR AKHIR</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-green-700">{resolvedScore ?? '-'}</span>
                <span className="text-sm text-green-600 font-medium">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded-lg text-sm font-bold ${categoryLabel === 'Baik' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                Kategori: {categoryLabel}
              </span>
            </div>
          </div>

          {/* Detail Jawaban */}
          <div className="space-y-6">
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Rincian Jawaban</h4>
            {clusters && clusters.length > 0 ? (
              clusters.map((cluster: any, idx: number) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 font-semibold text-xs text-slate-700 uppercase">
                    {cluster.title}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {cluster.questions.map((q: any) => (
                      <div key={q.id} className="p-3 flex items-start gap-4 text-sm">
                        <div className="flex-1 text-slate-700">{q.text}</div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          {answers && answers[q.id] === 1 ? (
                            <span className="flex items-center text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">
                              <Check className="w-3 h-3 mr-1" /> Ya
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">
                              <X className="w-3 h-3 mr-1" /> Tidak
                            </span>
                          )}
                          {remarks && remarks[q.id] && (
                            <span className="text-[10px] text-slate-400 italic">{remarks[q.id]}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-slate-500 italic">
                Data rincian tidak tersedia untuk laporan ini.
              </div>
            )}
          </div>
        </div>
      );
    }

    // LAPORAN TYPE: gunakan data dari backend (template + sections), dengan fallback dari sections jika template null
    const backendData: any = (payload as any)?.backend?.data ?? null;

    if (!backendData) {
      return (
        <div className="text-center text-slate-500 italic">Data laporan belum tersedia dari server.</div>
      );
    }

    const rawTemplate = backendData?.template;
    const year: string = String(backendData?.report_year ?? new Date().getFullYear());
    const submittedSections: any[] = backendData?.sections ?? [];

    // Hitung label asal wilayah untuk modal laporan
    const instansiLevelText: string | null =
      backendData?.instansi_level_text ??
      backendData?.instansi_level?.name ??
      null;

    let originLabel: string | null = null;
    if (instansiLevelText) {
      const upper = instansiLevelText.toUpperCase();
      if (upper.includes('PERUSAHAAN')) {
        // Untuk perusahaan, gunakan label tingkat
        originLabel = formatInstansiLevelLabel(instansiLevelText);
      } else if (upper.includes('PROVINSI')) {
        originLabel = 'Provinsi Jawa Timur';
      } else if (backendData?.origin_regency_name) {
        originLabel = String(backendData.origin_regency_name);
      }
    }

    const effectiveTemplate: any =
      rawTemplate && Array.isArray(rawTemplate.sections) && rawTemplate.sections.length > 0
        ? rawTemplate
        : {
            instansiName: backendData?.instansi_name ?? 'Instansi tidak dikenal',
            sections: submittedSections.map((sec) => ({
              id: sec.section_id ?? sec.id,
              title: sec.section_title ?? 'Indikator',
              indicator: sec.section_title ?? '',
              hasTarget: true,
              hasBudget: true,
            })),
          };

    if (!Array.isArray(effectiveTemplate.sections) || effectiveTemplate.sections.length === 0) {
      return (
        <div className="text-center text-slate-500 italic">
          Template atau daftar indikator laporan belum tersedia.
        </div>
      );
    }

    const laporanInputs: Record<string, any> = {};
    submittedSections.forEach((sec) => {
      const sectionId = sec.section_id ?? sec.section_code ?? sec.id ?? null;
      if (!sectionId) return;
      const key = String(sectionId);

      laporanInputs[`${key}-target-year`] = sec.target_year ?? '';
      laporanInputs[`${key}-target-sem1`] = sec.target_semester_1 ?? '';
      laporanInputs[`${key}-target-sem2`] = sec.target_semester_2 ?? '';

      laporanInputs[`${key}-budget-year`] = sec.budget_year ?? '';
      laporanInputs[`${key}-budget-sem1`] = sec.budget_semester_1 ?? '';
      laporanInputs[`${key}-budget-sem2`] = sec.budget_semester_2 ?? '';
    });

    return (
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 uppercase font-bold">Instansi Pelapor</p>
          <p className="font-semibold text-slate-800 text-lg">{effectiveTemplate?.instansiName}</p>
          {originLabel && (
            <p className="text-xs text-slate-500 mt-1">{originLabel}</p>
          )}
          <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Tahun Laporan: {year}
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">
            Indikator Kinerja & Capaian
          </h4>
          {effectiveTemplate?.sections.map((section: any, idx: number) => (
            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <p className="font-bold text-slate-800 text-sm">{section.title}</p>
                <p className="text-xs text-slate-500 mt-1 italic">{section.indicator}</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                {section.hasTarget && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-green-600 uppercase border-b border-green-100 pb-1">
                      Target & Realisasi Fisik
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-slate-500">Target Tahunan:</span>
                      <span className="font-mono font-medium">
                        {laporanInputs?.[`${section.id}-target-year`] || '-'}
                      </span>
                      <span className="text-slate-500">Sem 1:</span>
                      <span className="font-mono font-medium">
                        {laporanInputs?.[`${section.id}-target-sem1`] || '-'}
                      </span>
                      <span className="text-slate-500">Sem 2:</span>
                      <span className="font-mono font-medium">
                        {laporanInputs?.[`${section.id}-target-sem2`] || '-'}
                      </span>
                    </div>
                  </div>
                )}
                {section.hasBudget && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-blue-600 uppercase border-b border-blue-100 pb-1">
                      Anggaran
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-slate-500">Pagu:</span>
                      <span className="font-mono font-medium">
                        {laporanInputs?.[`${section.id}-budget-year`] || '-'}
                      </span>
                      <span className="text-slate-500">Realisasi S1:</span>
                      <span className="font-mono font-medium">
                        {laporanInputs?.[`${section.id}-budget-sem1`] || '-'}
                      </span>
                      <span className="text-slate-500">Realisasi S2:</span>
                      <span className="font-mono font-medium">
                        {laporanInputs?.[`${section.id}-budget-sem2`] || '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-slate-50 z-10 py-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Verifikasi Laporan</h1>
          <p className="text-slate-500 text-sm">Validasi data laporan masuk dari instansi dan wilayah</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Status Filter Tabs */}
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
             {['all', 'pending', 'verified', 'rejected'].map(status => (
                <button
                   key={status}
                   onClick={() => setFilterStatus(status)}
                   className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                      filterStatus === status ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                   }`}
                >
                   {status === 'all' ? 'Semua' : status}
                </button>
             ))}
          </div>

          <div className="relative">
             <select 
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm cursor-pointer font-medium text-slate-700"
             >
                <option value="all">Semua Tahun</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
             <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>

          {availableInstansiLevels.length > 0 && (
            <div className="relative">
              <select
                value={filterInstansiLevel}
                onChange={(e) => setFilterInstansiLevel(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm cursor-pointer font-medium text-slate-700"
              >
                <option value="all">Semua Tingkat</option>
                {availableInstansiLevels.map((level) => (
                  <option key={level} value={level}>
                    {formatInstansiLevelLabel(level)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Dynamic origin region filters */}
          {filterInstansiLevel !== 'all' && (
            (() => {
              const upper = filterInstansiLevel.toUpperCase();
              const showRegency =
                upper.includes('KABUPATEN') ||
                upper.includes('KOTA') ||
                upper.includes('PERUSAHAAN') ||
                upper.includes('KECAMATAN') ||
                upper.includes('KELURAHAN') ||
                upper.includes('DESA');
              const showDistrict =
                upper.includes('KECAMATAN') ||
                upper.includes('KELURAHAN') ||
                upper.includes('DESA');
              const showVillage = upper.includes('KELURAHAN') || upper.includes('DESA');

              return (
                <>
                  {showRegency && (
                    <div className="relative">
                      <select
                        value={filterRegencyId}
                        onChange={(e) => setFilterRegencyId(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-xl text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm cursor-pointer font-medium text-slate-700"
                      >
                        <option value="">Semua Kab/Kota</option>
                        {regencyOptions.map((r) => (
                          <option key={r.id} value={String(r.id)}>{r.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {showDistrict && (
                    <div className="relative">
                      <select
                        value={filterDistrictId}
                        onChange={(e) => setFilterDistrictId(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-xl text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm cursor-pointer font-medium text-slate-700"
                      >
                        <option value="">Semua Kecamatan</option>
                        {districtOptions.map((d) => (
                          <option key={d.id} value={String(d.id)}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {showVillage && (
                    <div className="relative">
                      <select
                        value={filterVillageId}
                        onChange={(e) => setFilterVillageId(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-xl text-sm py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm cursor-pointer font-medium text-slate-700"
                      >
                        <option value="">Semua Desa/Kel</option>
                        {villageOptions.map((v) => (
                          <option key={v.id} value={String(v.id)}>{v.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </>
              );
            })()
          )}

          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-48 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: EVALUASI LIST */}
      <section>
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 text-green-700 rounded-lg">
               <Check className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Data Evaluasi Mandiri</h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{evaluasiTotal}</span>
          </div>
         
         <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-green-100/50 ring-1 ring-slate-100 rounded-2xl">
            {evaluasiTotal > 0 ? (
               <>
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs font-semibold text-slate-500 bg-slate-50/50 border-b border-slate-100">
                        <tr>
                           <th className="px-6 py-4">Instansi</th>
                           <th className="px-6 py-4">Skor & Kategori</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {evaluasiPaginated.map((row) => {
                           const backendData: any = (row.payload as any)?.backend?.data ?? null;
                           const scoreFromPayload = (row.payload as any)?.score;
                           const categoryFromPayload = (row.payload as any)?.category;

                           const resolvedScore: number | null =
                             typeof scoreFromPayload === 'number'
                               ? scoreFromPayload
                               : typeof backendData?.score === 'number'
                                 ? backendData.score
                                 : null;

                           const categoryLabel: string | undefined =
                             categoryFromPayload?.label ?? backendData?.category?.label ?? backendData?.category_label ?? undefined;

                           const instansiLevelText: string | null =
                             backendData?.instansi_level_text ??
                             backendData?.instansi_level?.name ??
                             (row.payload as any)?.instansiData?.level ??
                             null;

                           // Tentukan label asal wilayah untuk tampilan list evaluasi
                           let originLabel: string | null = null;
                           if (instansiLevelText) {
                             const upper = instansiLevelText.toUpperCase();
                             if (upper.includes('PERUSAHAAN')) {
                               // Untuk perusahaan, tetap tampilkan label tingkat
                               originLabel = formatInstansiLevelLabel(instansiLevelText);
                             } else if (upper.includes('PROVINSI')) {
                               originLabel = 'Provinsi Jawa Timur';
                             } else if (backendData?.origin_regency_name) {
                               originLabel = String(backendData.origin_regency_name);
                             }
                           }

                           return (
                           <tr key={row.id} className="group hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">E</div>
                                    <div>
                                       <div className="font-semibold text-slate-800">{row.instansiName}</div>
                                       <div className="flex flex-col gap-0.5 mt-0.5">
                                         <div className="text-xs text-slate-400 font-mono">
                                           {new Date(row.submitDate).toLocaleDateString('id-ID')}
                                         </div>
                                         {originLabel && (
                                           <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                                             {originLabel}
                                           </span>
                                         )}
                                       </div>
                                    </div>
                                 </div>
                              </td>

                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-slate-700">{resolvedScore ?? '-'}</span>
                                    <Badge variant={categoryLabel === 'Baik' ? 'success' : 'warning'} size="sm">
                                       {categoryLabel || '-'}
                                    </Badge>
                                 </div>
                              </td>

                              <td className="px-6 py-4">
                                 <Badge variant={row.status === 'verified' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>
                                    {row.status === 'verified' ? 'Terverifikasi' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                 </Badge>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2">
                                    <button 
                                       onClick={() => openDetail(row)}
                                       className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-green-600 transition-colors text-xs font-semibold shadow-sm"
                                    >
                                       <Eye className="w-3.5 h-3.5" /> Detail
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        );})}
                     </tbody>
                  </table>
               </div>

               <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-600">
                 <div className="flex items-center gap-2">
                   <span>Tampil</span>
                   <select
                     className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-xs"
                     value={evaluasiPageSize}
                     onChange={(e) => {
                       setEvaluasiPageSize(Number(e.target.value));
                       setEvaluasiPage(1);
                     }}
                   >
                     {[10, 25, 50, 100].map((size) => (
                       <option key={size} value={size}>{size}</option>
                     ))}
                   </select>
                   <span>data per halaman</span>
                   <span className="ml-3">
                     Menampilkan {evaluasiTotal === 0 ? 0 : evaluasiStartIndex + 1}
                     {' - '}
                     {Math.min(evaluasiEndIndex, evaluasiTotal)} dari {evaluasiTotal} data
                   </span>
                 </div>

                 <div className="flex items-center gap-2">
                   <button
                     className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                     disabled={safeEvaluasiPage <= 1}
                     onClick={() => setEvaluasiPage((p) => Math.max(1, p - 1))}
                   >
                     Sebelumnya
                   </button>
                   <span>
                     Halaman {safeEvaluasiPage} / {evaluasiTotalPages}
                   </span>
                   <button
                     className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                     disabled={safeEvaluasiPage >= evaluasiTotalPages}
                     onClick={() => setEvaluasiPage((p) => Math.min(evaluasiTotalPages, p + 1))}
                   >
                     Selanjutnya
                   </button>
                 </div>
               </div>
               </>
            ) : (
               <div className="p-8 text-center text-slate-400 text-sm bg-slate-50/30 border-t border-slate-100">
                  Tidak ada data evaluasi.
               </div>
            )}
         </Card>
      </section>

      {/* SECTION 2: LAPORAN LIST */}
      <section>
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
               <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Data Laporan Semesteran</h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{laporanTotal}</span>
         </div>

         <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-blue-100/50 ring-1 ring-slate-100 rounded-2xl">
            {laporanTotal > 0 ? (
               <>
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs font-semibold text-slate-500 bg-slate-50/50 border-b border-slate-100">
                        <tr>
                           <th className="px-6 py-4">Instansi</th>
                           <th className="px-6 py-4">Tingkat & Tahun</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {laporanPaginated.map((row) => (
                           <tr key={row.id} className="group hover:bg-slate-50/80 transition-colors">
                             <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">L</div>
                                 <div>
                                   <div className="font-semibold text-slate-800">{row.instansiName}</div>
                                   <div className="text-xs text-slate-400 font-mono mt-0.5">{new Date(row.submitDate).toLocaleDateString('id-ID')}</div>
                                 </div>
                               </div>
                             </td>

                             <td className="px-6 py-4">
                               {(() => {
                                 const backendData: any = (row.payload as any)?.backend?.data ?? null;
                                 const rawLevel: string | null =
                                   backendData?.instansi_level_text ??
                                   backendData?.instansi_level?.name ??
                                   (row.payload as any)?.level ??
                                   null;

                                 let originLabel: string | null = null;
                                 if (rawLevel) {
                                   const upper = rawLevel.toUpperCase();
                                   if (upper.includes('PERUSAHAAN')) {
                                     // Perusahaan: tetap tampilkan label tingkat
                                     originLabel = formatInstansiLevelLabel(rawLevel);
                                   } else if (upper.includes('PROVINSI')) {
                                     originLabel = 'Provinsi Jawa Timur';
                                   } else if (backendData?.origin_regency_name) {
                                     originLabel = String(backendData.origin_regency_name);
                                   }
                                 }

                                 return (
                                   <>
                                     <div className="text-slate-700 font-medium">{originLabel || '-'}</div>
                                     <div className="text-xs text-slate-500 mt-0.5">Tahun {row.year}</div>
                                   </>
                                 );
                               })()}
                             </td>

                             <td className="px-6 py-4">
                               <Badge variant={row.status === 'verified' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>
                                 {row.status === 'verified' ? 'Terverifikasi' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                               </Badge>
                             </td>
                             <td className="px-6 py-4">
                               <div className="flex items-center justify-center gap-2">
                                 <button
                                   onClick={() => openDetail(row)}
                                   className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors text-xs font-semibold shadow-sm"
                                 >
                                   <Eye className="w-3.5 h-3.5" /> Detail
                                 </button>
                               </div>
                             </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-600">
                 <div className="flex items-center gap-2">
                   <span>Tampil</span>
                   <select
                     className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-xs"
                     value={laporanPageSize}
                     onChange={(e) => {
                       setLaporanPageSize(Number(e.target.value));
                       setLaporanPage(1);
                     }}
                   >
                     {[10, 25, 50, 100].map((size) => (
                       <option key={size} value={size}>{size}</option>
                     ))}
                   </select>
                   <span>data per halaman</span>
                   <span className="ml-3">
                     Menampilkan {laporanTotal === 0 ? 0 : laporanStartIndex + 1}
                     {' - '}
                     {Math.min(laporanEndIndex, laporanTotal)} dari {laporanTotal} data
                   </span>
                 </div>

                 <div className="flex items-center gap-2">
                   <button
                     className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                     disabled={safeLaporanPage <= 1}
                     onClick={() => setLaporanPage((p) => Math.max(1, p - 1))}
                   >
                     Sebelumnya
                   </button>
                   <span>
                     Halaman {safeLaporanPage} / {laporanTotalPages}
                   </span>
                   <button
                     className="px-2 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                     disabled={safeLaporanPage >= laporanTotalPages}
                     onClick={() => setLaporanPage((p) => Math.min(laporanTotalPages, p + 1))}
                   >
                     Selanjutnya
                   </button>
                 </div>
               </div>
               </>
            ) : (
               <div className="p-8 text-center text-slate-400 text-sm bg-slate-50/30 border-t border-slate-100">
                  Tidak ada data laporan.
               </div>
            )}
         </Card>
      </section>

      {/* DETAIL MODAL */}
      <Modal 
         isOpen={isModalOpen} 
         onClose={() => setIsModalOpen(false)}
         title={`Detail ${selectedRecord?.type === 'evaluasi' ? 'Evaluasi Mandiri' : 'Laporan Kegiatan'}`}
         size="xl"
         footer={
            <div className="flex justify-between w-full">
                <Button 
                   variant="outline" 
                   onClick={() => selectedRecord && handleDownloadPDF(selectedRecord)}
                   leftIcon={<FileText className="w-4 h-4 text-red-500"/>}
                   className="border-slate-300 text-slate-600"
                >
                   Unduh PDF
                </Button>
                
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!selectedRecord) return;

                      const result = await showConfirmation(
                        'Hapus Surat?',
                        'Tindakan ini akan menghapus data laporan secara permanen.',
                        'Ya, hapus',
                        'Batal'
                      );

                      if (result.isConfirmed) {
                        await handleDelete(selectedRecord);
                      }
                    }}
                    leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </Button>

                  {selectedRecord?.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (selectedRecord) void handleVerify(selectedRecord, 'rejected');
                          setIsModalOpen(false);
                        }}
                      >
                        Tolak
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (selectedRecord) void handleVerify(selectedRecord, 'verified');
                          setIsModalOpen(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Verifikasi
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-slate-500 text-sm font-medium">
                      {selectedRecord?.status === 'verified' ? (
                        <><Check className="w-4 h-4 text-green-600" /> Sudah Diverifikasi</>
                      ) : (
                        <><X className="w-4 h-4 text-red-600" /> Sudah Ditolak</>
                      )}
                    </div>
                  )}
                </div>
            </div>
         }
      >
         {renderDetailContent()}
      </Modal>
    </div>
  );
};

export default Verification;