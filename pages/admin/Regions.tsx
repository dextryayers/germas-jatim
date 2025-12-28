import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AnimatePresence, motion } from 'framer-motion';
import { AlignLeft, Building2, ChevronRight, MapPin, Search } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

type ProvinceSummary = {
  id: number;
  code: string;
  name: string;
  regency_count: number | null;
  district_count: number | null;
  village_count: number | null;
};

type RegencySummary = {
  id: number;
  code: string;
  name: string;
  type: 'kabupaten' | 'kota';
  district_count: number;
  village_count: number;
};

type RegionsResponse = {
  province: ProvinceSummary;
  regencies: RegencySummary[];
  summary: {
    regencies: number;
    districts: number;
    villages: number;
  };
};

type Village = {
  id: number;
  code: string;
  name: string;
};

type DistrictDetail = {
  id: number;
  code: string;
  name: string;
  village_count: number;
  villages: Village[];
};

type RegencyDetailResponse = {
  regency: {
    id: number;
    code: string;
    name: string;
    type: 'kabupaten' | 'kota';
  };
  districts: DistrictDetail[];
};

type RegencyDetailState = {
  loading: boolean;
  error: string | null;
  districts: DistrictDetail[];
};

const Regions: React.FC = () => {
  const [province, setProvince] = useState<ProvinceSummary | null>(null);
  const [regencies, setRegencies] = useState<RegencySummary[]>([]);
  const [summary, setSummary] = useState<RegionsResponse['summary'] | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'kabupaten' | 'kota'>('all');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [regencyDetails, setRegencyDetails] = useState<Record<string, RegencyDetailState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 400);

    return () => window.clearTimeout(handler);
  }, [searchValue]);

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: Record<string, string> = { province_code: '35' };
    if (debouncedSearch) {
      query.search = debouncedSearch;
    }
    if (activeType !== 'all') {
      query.type = activeType;
    }

    try {
      const response = await apiClient.get<RegionsResponse>('/regions', { query });
      setProvince(response.province);
      setRegencies(response.regencies);
      setSummary(response.summary);
      setExpanded((prev) => prev.filter((id) => response.regencies.some((regency) => String(regency.id) === id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tidak dapat memuat data wilayah.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeType, debouncedSearch]);

  useEffect(() => {
    void fetchRegions();
  }, [fetchRegions]);

  const loadRegencyDetail = useCallback(async (regencyId: number) => {
    const key = String(regencyId);
    setRegencyDetails((prev) => ({
      ...prev,
      [key]: {
        loading: true,
        error: null,
        districts: prev[key]?.districts ?? [],
      },
    }));

    try {
      const response = await apiClient.get<RegencyDetailResponse>(`/regions/${regencyId}/districts`);
      setRegencyDetails((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          error: null,
          districts: response.districts,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tidak dapat memuat detail wilayah.';
      setRegencyDetails((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          error: message,
          districts: prev[key]?.districts ?? [],
        },
      }));
    }
  }, []);

  const toggleExpand = useCallback(
    (regencyId: number) => {
      const key = String(regencyId);
      const isExpanded = expanded.includes(key);
      const nextExpanded = isExpanded ? expanded.filter((item) => item !== key) : [...expanded, key];
      setExpanded(nextExpanded);

      if (!isExpanded && !regencyDetails[key]?.districts?.length && !regencyDetails[key]?.loading) {
        void loadRegencyDetail(regencyId);
      }
    },
    [expanded, loadRegencyDetail, regencyDetails],
  );

  const filteredRegencies = useMemo(() => {
    if (!debouncedSearch) {
      return regencies;
    }

    const keyword = debouncedSearch.toLowerCase();
    return regencies.filter((regency) => regency.name.toLowerCase().includes(keyword));
  }, [regencies, debouncedSearch]);

  const aggregateStats = useMemo(() => {
    const regencyCount = filteredRegencies.length;
    const districtCount = filteredRegencies.reduce((acc, regency) => acc + regency.district_count, 0);
    const villageCount = filteredRegencies.reduce((acc, regency) => acc + regency.village_count, 0);

    return {
      regencyCount,
      districtCount,
      villageCount,
    };
  }, [filteredRegencies]);

  const overallTotals = useMemo(
    () => ({
      regencies: summary?.regencies ?? aggregateStats.regencyCount,
      districts: summary?.districts ?? aggregateStats.districtCount,
      villages: summary?.villages ?? aggregateStats.villageCount,
    }),
    [summary, aggregateStats],
  );

  const formatNumber = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return '-';
    }
    return value.toLocaleString('id-ID');
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded([]);
  }, []);

  const expandAll = useCallback(() => {
    const ids = regencies.map((regency) => String(regency.id));
    setExpanded(ids);
    ids.forEach((id) => {
      const numericId = Number(id);
      if (!Number.isNaN(numericId) && !regencyDetails[id]?.districts?.length && !regencyDetails[id]?.loading) {
        void loadRegencyDetail(numericId);
      }
    });
  }, [loadRegencyDetail, regencies, regencyDetails]);

  const hasInitialData = regencies.length > 0;

  if (loading && !hasInitialData) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-slate-100 bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500">Memuat data wilayah Jawa Timur...</p>
        </div>
      </div>
    );
  }

  if (error && !hasInitialData) {
    return (
      <div className="flex h-72 items-center justify-center rounded-3xl border border-rose-100 bg-white">
        <div className="text-center">
          <h2 className="text-base font-bold text-rose-600">{error}</h2>
          <p className="mt-1 text-sm text-slate-500">Pastikan koneksi stabil lalu coba lagi.</p>
          <Button size="sm" className="mt-4" onClick={() => void fetchRegions()}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Wilayah Jawa Timur</h1>
          <p className="text-sm text-slate-500">Struktur administratif kabupaten/kota, kecamatan, hingga desa.</p>
          {province ? (
            <p className="text-xs text-slate-400">Kode Provinsi: {province.code}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Cari kab/kota"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-600 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
            {(
              [
                { key: 'all' as const, label: 'Semua' },
                { key: 'kabupaten' as const, label: 'Kabupaten' },
                { key: 'kota' as const, label: 'Kota' },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setActiveType(option.key)}
                className={`rounded-lg px-3 py-1 transition ${
                  activeType === option.key ? 'bg-white text-primary-600 shadow-sm' : 'hover:bg-white hover:text-primary-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border border-blue-100 bg-blue-50/50" description="">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/15 p-4 text-blue-600">
              <AlignLeft className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Kabupaten/Kota</p>
              <h2 className="text-3xl font-bold text-slate-800">{formatNumber(overallTotals.regencies)}</h2>
              <p className="text-xs text-slate-500">Total terdaftar</p>
            </div>
          </div>
        </Card>
        <Card className="border border-emerald-100 bg-emerald-50/50">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500/15 p-4 text-emerald-600">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">Kecamatan</p>
              <h2 className="text-3xl font-bold text-slate-800">{formatNumber(overallTotals.districts)}</h2>
              <p className="text-xs text-slate-500">Total kecamatan</p>
            </div>
          </div>
        </Card>
        <Card className="border border-violet-100 bg-violet-50/50">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-violet-500/15 p-4 text-violet-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">Desa/Kelurahan</p>
              <h2 className="text-3xl font-bold text-slate-800">{formatNumber(overallTotals.villages)}</h2>
              <p className="text-xs text-slate-500">Unit wilayah terkecil</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Struktur Wilayah</h3>
            <p className="text-xs text-slate-500">Klik baris untuk melihat daftar kecamatan dan desa.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={collapseAll}>
              Tutup Semua
            </Button>
            <Button size="sm" variant="secondary" onClick={expandAll}>
              Buka Semua
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRegencies.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Tidak ada wilayah yang cocok dengan kata kunci.
            </div>
          ) : (
            filteredRegencies.map((regency) => {
              const key = String(regency.id);
              const isExpanded = expanded.includes(key);
              const detail = regencyDetails[key];

              return (
                <div key={regency.id} className="group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpand(regency.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleExpand(regency.id);
                      }
                    }}
                    className={`flex items-center justify-between px-6 py-4 transition-colors ${
                      isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-md border p-1 transition ${
                          isExpanded
                            ? 'border-primary-200 bg-primary-50 text-primary-600 rotate-90'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          {regency.name}
                          <Badge variant="info" size="sm">
                            {(() => {
                              const lowerName = regency.name.toLowerCase();
                              if (lowerName.startsWith('kota ')) return 'Kota';
                              if (lowerName.startsWith('kabupaten ')) return 'Kabupaten';

                              return regency.type === 'kota' ? 'Kota' : 'Kabupaten';
                            })()}
                          </Badge>
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatNumber(regency.district_count)} kecamatan • {formatNumber(regency.village_count)} desa/kelurahan
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {detail?.loading ? 'Memuat…' : detail?.error ? 'Gagal memuat detail' : 'Klik untuk detail'}
                    </span>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-slate-100 bg-slate-50/60"
                      >
                        {detail?.loading ? (
                          <div className="px-12 py-6 text-sm text-slate-500">Memuat daftar kecamatan...</div>
                        ) : detail?.error ? (
                          <div className="px-12 py-6 text-sm text-rose-500">{detail.error}</div>
                        ) : detail?.districts?.length ? (
                          detail.districts.map((district) => (
                            <div key={district.id} className="px-12 py-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-700">{district.name}</p>
                                <p className="text-xs text-slate-400">
                                  {formatNumber(district.village_count)} desa/kelurahan terdata
                                </p>
                              </div>
                              {district.villages.length > 0 ? (
                                <ul className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-3">
                                  {district.villages.map((village) => (
                                    <li
                                      key={village.id}
                                      className="flex items-center gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                                      {village.name}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-3 text-xs italic text-slate-400">
                                  Belum ada data desa untuk kecamatan ini.
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-12 py-6 text-sm text-slate-500">
                            Tidak ada data detail kecamatan untuk wilayah ini.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default Regions;