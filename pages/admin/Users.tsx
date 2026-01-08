import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/Loading';
import { apiClient } from '../../utils/apiClient';
import { UserPlus, Mail, Filter, RefreshCcw, XCircle, User } from 'lucide-react';

type InstansiSummary = {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

type InstansiLevelSummary = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

type RegionSummary = {
  id: number;
  code: string;
  name: string;
  type?: string | null;
};

type UserItem = {
  id: number;
  name: string;
  email: string;
  username?: string | null;
  role: string;
  phone: string | null;
  admin_code: string | null;
  photo_url: string | null;
  last_login_at: string | null;
  instansi: InstansiSummary | null;
  instansi_level: InstansiLevelSummary | null;
  origin_regency?: RegionSummary | null;
  origin_district?: { id: number; code: string; name: string } | null;
  origin_village?: { id: number; code: string; name: string } | null;
};

type UsersIndexResponse = {
  status: string;
  data: {
    items: UserItem[];
    stats: {
      total: number;
      active: number;
      inactive: number;
      roles: Record<string, number>;
      verified: number;
    };
  };
};

type StatusFilter = 'all' | 'active' | 'inactive';
type LevelFilter = 'all' | 'provinsi' | 'kab_kota' | 'kecamatan' | 'kelurahan_desa';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Semua Status',
  active: 'Aktif',
  inactive: 'Non-Aktif',
};

const LEVEL_FILTER_LABELS: Record<LevelFilter, string> = {
  all: 'Semua Tingkat',
  provinsi: 'Tingkat Provinsi',
  kab_kota: 'Tingkat Kab/Kota',
  kecamatan: 'Tingkat Kecamatan',
  kelurahan_desa: 'Tingkat Kel/Desa',
};

const normalizeInstansiLevelToKey = (raw: string | null | undefined): LevelFilter => {
  if (!raw) return 'all';
  const upper = raw.toUpperCase();
  if (upper.includes('PROVINSI')) return 'provinsi';
  if (upper.includes('KABUPATEN') || upper.includes('KOTA')) return 'kab_kota';
  if (upper.includes('KECAMATAN')) return 'kecamatan';
  if (upper.includes('KELURAHAN') || upper.includes('DESA')) return 'kelurahan_desa';
  return 'all';
};

const formatInstansiLevelLabel = (raw: string | null | undefined): string => {
  if (!raw) return '-';
  const key = normalizeInstansiLevelToKey(raw);
  switch (key) {
    case 'provinsi':
      return 'Tingkat Provinsi';
    case 'kab_kota':
      return 'Tingkat Kabupaten/Kota';
    case 'kecamatan':
      return 'Tingkat Kecamatan';
    case 'kelurahan_desa':
      return 'Tingkat Kelurahan/Desa';
    default:
      return `Tingkat ${raw}`;
  }
};

const deriveStatus = (user: UserItem): StatusFilter => {
  if (user.last_login_at) {
    return 'active';
  }
  return 'inactive';
};

type SortOrder = 'name_asc' | 'name_desc' | 'recent_login';

const Users: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name_asc');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter asal instansi (wilayah)
  const [regencyOptions, setRegencyOptions] = useState<{ id: number; name: string }[]>([]);
  const [districtOptions, setDistrictOptions] = useState<{ id: number; name: string }[]>([]);
  const [villageOptions, setVillageOptions] = useState<{ id: number; name: string }[]>([]);

  const [filterRegencyId, setFilterRegencyId] = useState<string>('');
  const [filterDistrictId, setFilterDistrictId] = useState<string>('');
  const [filterVillageId, setFilterVillageId] = useState<string>('');

  // Pagination state (client-side)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Proteksi akses halaman: hanya admin provinsi, kab/kota, kecamatan (dan super_admin/operator_wilayah)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const roleRaw =
      window.sessionStorage.getItem('user_role') ??
      window.localStorage.getItem('user_role') ??
      null;

    const role = roleRaw ? roleRaw.toLowerCase().trim() : '';

    const isProv = role.includes('admin_provinsi') || role.includes('super_admin');
    const isKabKota = role.includes('admin_kabkota');
    const isKecamatan = role.includes('admin_kecamatan');

    const allowed = isProv || isKabKota || isKecamatan;

    if (!allowed) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const fetchUsers = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await apiClient.get<UsersIndexResponse>('/users');
      const items = response?.data?.items ?? [];
      setUsers(items);
    } catch (err) {
      console.error('[Users] Gagal memuat data pengguna:', err);
      const message = err instanceof Error ? err.message : 'Tidak dapat memuat data pengguna.';
      setError(message);
      setUsers([]);
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- LOAD REGION OPTIONS FOR FILTERS ---
  useEffect(() => {
    if (regencyOptions.length > 0) return;

    apiClient
      .get<any>('/regions', { query: { province_code: '35' } })
      .then((response) => {
        const raw = (response as any)?.regencies ?? (response as any)?.data ?? response;
        const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setRegencyOptions(items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') })));
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
        setDistrictOptions(items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') })));
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
        setVillageOptions(items.map((item: any) => ({ id: Number(item.id), name: String(item.name ?? '') })));
      })
      .catch(() => {
        setVillageOptions([]);
      });
  }, [filterDistrictId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchUsers({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchUsers]);

  const getCurrentUserRole = (): string | null => {
    if (typeof window === 'undefined') return null;
    const raw =
      window.sessionStorage.getItem('user_role') ??
      window.localStorage.getItem('user_role') ??
      null;
    return raw ? raw.toLowerCase().trim() : null;
  };

  const getAllowedLevelsForRole = (role: string | null): LevelFilter[] | null => {
    if (!role) return null; // tanpa role eksplisit: jangan batasi di frontend

    // Super admin / admin provinsi: akses penuh
    if (role.includes('super_admin') || role.includes('admin_provinsi')) {
      return null;
    }

    // Admin kabupaten/kota: boleh lihat Kab/Kota ke bawah (kecamatan, kelurahan/desa)
    if (role.includes('admin_kabkota')) {
      return ['kab_kota', 'kecamatan', 'kelurahan_desa'];
    }

    // Admin kecamatan: boleh lihat kecamatan sendiri & kelurahan/desa di bawahnya
    if (role.includes('admin_kecamatan')) {
      return ['kecamatan', 'kelurahan_desa'];
    }

    // Admin kelurahan/desa: biarkan backend yang membatasi scope user.
    // Jangan tambah filter level di frontend supaya akun dengan instansi_level null
    // tetapi role kelurahan/desa tetap tampil.
    if (role.includes('admin_kelurahan') || role.includes('admin_desa')) {
      return null;
    }

    // Operator wilayah: anggap sama seperti admin kab/kota (bisa disesuaikan nanti)
    if (role.includes('operator_wilayah')) {
      return ['kab_kota', 'kecamatan', 'kelurahan_desa'];
    }

    // Operator instansi: biarkan backend yang membatasi, jangan filter di sini
    if (role.includes('operator_instansi')) {
      return null;
    }

    return null;
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // 1) Batasi scope berdasarkan role admin yang sedang login
    const currentRole = getCurrentUserRole();
    const allowedLevels = getAllowedLevelsForRole(currentRole);
    if (allowedLevels && allowedLevels.length > 0) {
      result = result.filter((user) => {
        const levelName = user.instansi_level?.name ?? null;
        const key = normalizeInstansiLevelToKey(levelName);
        // jika tidak ada info level pada user, aman untuk disembunyikan dari admin non-provinsi
        if (key === 'all') return false;
        return allowedLevels.includes(key);
      });
    }

    // 2) Filter manual dari UI: tingkat instansi yang dipilih admin
    if (levelFilter !== 'all') {
      result = result.filter((user) => {
        const levelName = user.instansi_level?.name ?? null;
        const key = normalizeInstansiLevelToKey(levelName);
        return key === levelFilter;
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((user) => deriveStatus(user) === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const normalized = searchTerm.trim().toLowerCase();
      result = result.filter((user) =>
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.instansi?.name?.toLowerCase().includes(normalized) ||
        user.instansi_level?.name?.toLowerCase().includes(normalized)
      );
    }

    // Filter asal instansi berdasarkan level & origin_* ID
    result = result.filter((user) => {
      const levelName = user.instansi_level?.name ?? null;
      const upper = levelName ? levelName.toUpperCase() : '';

      // Jika tidak ada filter asal, langsung lolos
      if (!filterRegencyId && !filterDistrictId && !filterVillageId) {
        return true;
      }

      // Provinsi tidak memakai filter asal
      if (upper.includes('PROVINSI')) {
        return true;
      }

      const originRegencyId = user.origin_regency?.id ?? null;
      const originDistrictId = user.origin_district?.id ?? null;
      const originVillageId = user.origin_village?.id ?? null;

      let matches = true;

      if (filterRegencyId) {
        matches = matches && String(originRegencyId ?? '') === filterRegencyId;
      }

      if ((upper.includes('KECAMATAN') || upper.includes('KELURAHAN') || upper.includes('DESA')) && filterDistrictId) {
        matches = matches && String(originDistrictId ?? '') === filterDistrictId;
      }

      if ((upper.includes('KELURAHAN') || upper.includes('DESA')) && filterVillageId) {
        matches = matches && String(originVillageId ?? '') === filterVillageId;
      }

      return matches;
    });

    switch (sortOrder) {
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name, 'id-ID'));
        break;
      case 'recent_login':
        result.sort((a, b) => {
          const timeA = a.last_login_at ? Date.parse(a.last_login_at) : 0;
          const timeB = b.last_login_at ? Date.parse(b.last_login_at) : 0;
          return timeB - timeA;
        });
        break;
      case 'name_asc':
      default:
        result.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
        break;
    }

    return result;
  }, [users, levelFilter, statusFilter, searchTerm, sortOrder, filterRegencyId, filterDistrictId, filterVillageId]);

  const activeCount = useMemo(() => filteredUsers.filter((user) => deriveStatus(user) === 'active').length, [filteredUsers]);

  const renderStatusBadge = (user: UserItem) => {
    const status = deriveStatus(user);
    const isActive = status === 'active';
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {isActive ? 'Aktif' : 'Non-Aktif'}
      </span>
    );
  };

  const renderInstansiInfo = (user: UserItem) => {
    const levelName = user.instansi_level?.name ?? null;
    const levelLabel = formatInstansiLevelLabel(levelName);

    const originParts: string[] = [];
    if (user.origin_regency?.name) {
      originParts.push(user.origin_regency.name.replace(/^Kabupaten\s+/i, '').replace(/^Kota\s+/i, ''));
    }
    if (user.origin_district?.name) {
      originParts.push(`Kec. ${user.origin_district.name}`);
    }
    if (user.origin_village?.name) {
      originParts.push(`Desa/Kel. ${user.origin_village.name}`);
    }

    const originLabel = originParts.length > 0 ? originParts.join(', ') : null;

    return (
      <div className="text-xs text-slate-500">
        <p className="font-medium text-slate-600">{levelLabel}</p>
        {user.instansi?.name && <p className="mt-0.5">Instansi: {user.instansi.name}</p>}
        {originLabel && <p className="mt-0.5 text-[11px] text-slate-500">Asal: {originLabel}</p>}
      </div>
    );
  };

  // Reset halaman ketika filter/search berubah
  useEffect(() => {
    setPage(1);
  }, [levelFilter, statusFilter, searchTerm, sortOrder, filterRegencyId, filterDistrictId, filterVillageId]);

  // Pagination helpers
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleViewDetail = (user: UserItem) => {
    const levelLabel = formatInstansiLevelLabel(user.instansi_level?.name ?? null);

    const originParts: string[] = [];
    if (user.origin_regency?.name) {
      originParts.push(user.origin_regency.name.replace(/^Kabupaten\s+/i, '').replace(/^Kota\s+/i, ''));
    }
    if (user.origin_district?.name) {
      originParts.push(`Kec. ${user.origin_district.name}`);
    }
    if (user.origin_village?.name) {
      originParts.push(`Desa/Kel. ${user.origin_village.name}`);
    }
    const originLabel = originParts.length > 0 ? originParts.join(', ') : '-';

    const lastLoginText = (() => {
      if (!user.last_login_at) return 'Belum pernah masuk';
      try {
        const date = new Date(user.last_login_at);
        return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return user.last_login_at;
      }
    })();

    Swal.fire({
      title: '<span class="text-slate-800 text-base font-bold">Detail Akun Pengguna</span>',
      html: `
        <div class="space-y-4 text-left text-sm">
          <div class="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Identitas</p>
            <p class="mt-1 text-slate-800 font-semibold">${user.name}</p>
            <p class="mt-0.5 text-[12px] text-slate-600">Username: <span class="font-mono text-slate-800">${user.username ?? '-'}</span></p>
            <p class="mt-0.5 text-[12px] text-slate-600">Email: <span class="font-mono text-slate-800">${user.email}</span></p>
          </div>

          <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Tingkat & Instansi</p>
            <p class="mt-1 text-[13px] font-semibold text-emerald-800">${levelLabel}</p>
            <p class="mt-0.5 text-[12px] text-emerald-700">Instansi: <span class="font-medium">${user.instansi?.name ?? '-'}</span></p>
            <p class="mt-0.5 text-[12px] text-emerald-700">Asal: <span class="font-medium">${originLabel}</span></p>
          </div>

          <div class="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Aktivitas</p>
            <p class="mt-1 text-[12px] text-slate-700">Status: <span class="font-semibold">${deriveStatus(user) === 'active' ? 'Aktif' : 'Non-Aktif'}</span></p>
            <p class="mt-0.5 text-[12px] text-slate-700">Terakhir login: <span class="font-medium">${lastLoginText}</span></p>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#059669',
      width: 480,
      customClass: {
        popup: 'rounded-2xl',
      },
    });
  };

  const handleDeleteUser = async (user: UserItem) => {
    const result = await Swal.fire({
      title: 'Hapus Akun Pengguna?',
      html: `
        <div class="text-sm text-slate-700">
          <p>Anda akan menghapus akun <span class="font-semibold">${user.name}</span>.</p>
          <p class="mt-1 text-[12px] text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#e5e7eb',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Akun berhasil dihapus.',
        confirmButtonColor: '#059669',
      });
    } catch (error) {
      console.error('[Users] Gagal menghapus pengguna:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal menghapus akun di server. Silakan coba lagi.',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const renderLastLogin = (user: UserItem) => {
    if (!user.last_login_at) {
      return <span className="text-xs text-slate-400">Belum pernah masuk</span>;
    }
    try {
      const date = new Date(user.last_login_at);
      return (
        <span className="text-xs text-slate-500">
          Terakhir masuk: {date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      );
    } catch {
      return <span className="text-xs text-slate-500">Terakhir masuk: {user.last_login_at}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
          <p className="text-slate-500">Kelola dan lihat status akun yang terdaftar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => navigate('/register')}>
            Tambah Pengguna
          </Button>

          <Button
            variant="secondary"
            leftIcon={<RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
          >
            Segarkan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="space-y-6 xl:col-span-1">
          <Card title="Filter" description="Sesuaikan tampilan daftar pengguna">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Pencarian</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-emerald-400">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cari nama, email, atau instansi"
                    className="w-full bg-transparent text-sm text-slate-600 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Tingkat Instansi</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(LEVEL_FILTER_LABELS).map(([value, label]) => {
                    const typedValue = value as LevelFilter;
                    const isActive = levelFilter === typedValue;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLevelFilter(typedValue)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter asal instansi (wilayah) */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Asal Instansi</label>
                <div className="space-y-2">
                  {(levelFilter === 'kab_kota' || levelFilter === 'kecamatan' || levelFilter === 'kelurahan_desa') && (
                    <select
                      value={filterRegencyId}
                      onChange={(e) => setFilterRegencyId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Semua Kab/Kota</option>
                      {regencyOptions.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name.replace('Kabupaten ', '').replace('Kota ', '')}
                        </option>
                      ))}
                    </select>
                  )}

                  {(levelFilter === 'kecamatan' || levelFilter === 'kelurahan_desa') && (
                    <select
                      value={filterDistrictId}
                      onChange={(e) => setFilterDistrictId(e.target.value)}
                      disabled={!filterRegencyId || districtOptions.length === 0}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Semua Kecamatan</option>
                      {districtOptions.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {levelFilter === 'kelurahan_desa' && (
                    <select
                      value={filterVillageId}
                      onChange={(e) => setFilterVillageId(e.target.value)}
                      disabled={!filterDistrictId || villageOptions.length === 0}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Semua Desa/Kelurahan</option>
                      {villageOptions.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Status</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => {
                    const typedValue = value as StatusFilter;
                    const isActive = statusFilter === typedValue;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStatusFilter(typedValue)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Urutkan</label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="name_asc">Nama A-Z</option>
                    <option value="name_desc">Nama Z-A</option>
                    <option value="recent_login">Terbaru login</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                <p>
                  Menampilkan <span className="font-semibold text-emerald-800">{filteredUsers.length}</span> dari{' '}
                  <span className="font-semibold text-emerald-800">{users.length}</span> pengguna terdaftar.
                </p>
                <p className="mt-1 text-xs text-emerald-600">{activeCount} pengguna aktif dalam 30 hari terakhir.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-3">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Daftar Pengguna Terdaftar</p>
                <p className="text-xs text-slate-400">Data diambil langsung dari basis data melalui API.</p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <LoadingSpinner className="h-3.5 w-3.5" /> Memuat data pengguna...
                </div>
              )}
            </div>

            {error ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-slate-500">
                <XCircle className="h-10 w-10 text-rose-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Gagal memuat data pengguna</p>
                  <p className="text-xs text-slate-500">{error}</p>
                </div>
                <Button variant="secondary" onClick={() => fetchUsers()} leftIcon={<RefreshCcw className="h-4 w-4" />}>
                  Coba lagi
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-slate-500">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <UserPlus className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Belum ada pengguna yang sesuai filter.</p>
                <p className="text-xs text-slate-400">Sesuaikan filter atau tambahkan pengguna baru.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Pengguna</th>
                        <th className="px-6 py-4">Tingkat & Asal Instansi</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="transition hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                                {user.name.charAt(0)}
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-800">{user.name}</p>
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <User className="h-3 w-3" />
                                  {user.username || '-'}
                                </span>
                                {renderLastLogin(user)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {renderInstansiInfo(user)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                          </td>

                          <td className="px-6 py-4">{renderStatusBadge(user)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 px-3 text-[11px]"
                                onClick={() => handleViewDetail(user)}
                              >
                                Detail
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 px-3 text-[11px] bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => handleDeleteUser(user)}
                              >
                                Hapus
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
                  <div>
                    Menampilkan{' '}
                    <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : startIndex + 1}</span>
                    {' - '}
                    <span className="font-semibold text-slate-700">{Math.min(endIndex, totalItems)}</span>
                    {' dari '}
                    <span className="font-semibold text-slate-700">{totalItems}</span> pengguna
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) || 10);
                        setPage(1);
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-emerald-400 focus:outline-none"
                    >
                      <option value={10}>10 / halaman</option>
                      <option value={25}>25 / halaman</option>
                      <option value={50}>50 / halaman</option>
                      <option value={100}>100 / halaman</option>
                      <option value={250}>250 / halaman</option>
                      <option value={500}>500 / halaman</option>
                    </select>
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        className="h-7 px-3 text-[11px]"
                      >
                        Prev
                      </Button>
                      <span>
                        Hal {safePage} / {totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        className="h-7 px-3 text-[11px]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Users;