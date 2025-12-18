import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/Loading';
import { apiClient } from '../../utils/apiClient';
import { UserPlus, MoreVertical, Shield, Mail, Phone, Lock, Filter, RefreshCcw, XCircle } from 'lucide-react';

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

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  admin_code: string | null;
  photo_url: string | null;
  last_login_at: string | null;
  instansi: InstansiSummary | null;
  instansi_level: InstansiLevelSummary | null;
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

type RoleFilter = 'all' | 'super_admin' | 'admin_kabkota' | 'operator_instansi' | 'operator_wilayah';
type StatusFilter = 'all' | 'active' | 'inactive';

const ROLE_LABELS: Record<RoleFilter, string> = {
  all: 'Semua Role',
  super_admin: 'Super Admin',
  admin_kabkota: 'Admin Kab/Kota',
  operator_instansi: 'Operator Instansi',
  operator_wilayah: 'Operator Wilayah',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Semua Status',
  active: 'Aktif',
  inactive: 'Non-Aktif',
};

const mapRoleDisplay = (role: string | null | undefined): string => {
  if (!role) return 'Tidak diketahui';
  switch (role.toLowerCase()) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin_provinsi':
      return 'Admin Provinsi';
    case 'admin_kabkota':
      return 'Admin Kab/Kota';
    case 'operator_instansi':
      return 'Operator Instansi';
    case 'operator_wilayah':
      return 'Operator Wilayah';
    case 'admin':
      return 'Admin';
    default:
      return role;
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
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name_asc');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchUsers({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role?.toLowerCase() === roleFilter.replace('_', ''));
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
        user.instansi_level?.name?.toLowerCase().includes(normalized),
      );
    }

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
  }, [users, roleFilter, statusFilter, searchTerm, sortOrder]);

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

  const renderPhone = (phone: string | null) => {
    if (!phone) return <span className="text-xs text-slate-400">-</span>;
    return (
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <Phone className="h-3 w-3" />
        {phone}
      </span>
    );
  };

  const renderAdminCode = (code: string | null) => {
    if (!code) return <span className="text-xs text-slate-400">-</span>;
    return (
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <Lock className="h-3 w-3" />
        {code}
      </span>
    );
  };

  const renderInstansi = (user: UserItem) => {
    if (!user.instansi) {
      return <span className="text-xs text-slate-400">Belum terhubung</span>;
    }
    return (
      <div className="text-xs text-slate-500">
        <p className="font-medium text-slate-600">{user.instansi.name}</p>
        {user.instansi_level?.name && <p className="mt-0.5">Level: {user.instansi_level.name}</p>}
      </div>
    );
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
          <p className="text-slate-500">Kelola akses, role, dan status akun yang terdaftar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button leftIcon={<UserPlus className="h-4 w-4" />}>Tambah Pengguna</Button>
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
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Role</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => {
                    const typedValue = value as RoleFilter;
                    const isActive = roleFilter === typedValue;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRoleFilter(typedValue)}
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Pengguna</th>
                      <th className="px-6 py-4">Role & Instansi</th>
                      <th className="px-6 py-4">Kontak</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="transition hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                              {user.name.charAt(0)}
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-800">{user.name}</p>
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                              {renderLastLogin(user)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-blue-500" />
                              <span className="text-sm font-medium text-slate-700">{mapRoleDisplay(user.role)}</span>
                            </div>
                            {renderInstansi(user)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {renderPhone(user.phone)}
                            {renderAdminCode(user.admin_code)}
                          </div>
                        </td>
                        <td className="px-6 py-4">{renderStatusBadge(user)}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Users;