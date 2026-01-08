import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Mail, Calendar, Camera, PencilLine, KeyRound, User } from 'lucide-react';

import { apiClient } from '../../utils/apiClient';

const Profile: React.FC = () => {
  type MeResponse = {
    status: string;
    user: {
      id: number;
      username?: string | null;
      name: string;
      email: string;

      role?: string | null;
      phone?: string | null;
      photo_url?: string | null;
      admin_code?: string | null;
      last_login_at?: string | null;
      origin_regency?: {
        id: number;
        code?: string | null;
        name?: string | null;
        type?: string | null;
      } | null;
      origin_district?: {
        id: number;
        code?: string | null;
        name?: string | null;
      } | null;
      origin_village?: {
        id: number;
        code?: string | null;
        name?: string | null;
      } | null;
      instansi_level?: {
        id: number;
        code?: string | null;
        name?: string | null;
        description?: string | null;
      } | null;
    };
  };

  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUploadPhotoOpen, setIsUploadPhotoOpen] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const token = sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token');
      if (!token) {
        if (!alive) return;
        setUser(null);
        setLoading(false);
        setError('Anda belum login.');
        return;
      }

      try {
        const response = await apiClient.get<MeResponse>('/auth/me');
        if (!alive) return;
        setUser(response.user);
        setError(null);
      } catch (err: any) {
        if (!alive) return;
        setUser(null);
        setError(err?.data?.message ?? err?.message ?? 'Gagal memuat profil.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const userData = useMemo(() => {
    const name = user?.name ?? 'Pengguna';
    const avatar = user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&bold=true`;

    const lastLogin = user?.last_login_at
      ? new Date(user.last_login_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
      : '-';

    return {
      name,
      username: user?.username ?? null,
      email: user?.email ?? null,
      phone: user?.phone ?? null,
      role: user?.role ?? null,
      lastLogin,
      avatar,
      instansiLevelName: user?.instansi_level?.name ?? null,
      asalWilayah: {
        kabKota: user?.origin_regency?.name ?? null,
        kecamatan: user?.origin_district?.name ?? null,
        desaKel: user?.origin_village?.name ?? null,
      },
    };
  }, [user]);

  const displayInstansiLevel = useMemo(() => {
    const raw = userData.instansiLevelName?.trim();
    if (!raw) return null;
    if (raw.toUpperCase() === 'TINGKAT_INSTANSI') return null;
    return raw;
  }, [userData.instansiLevelName]);

  const isProvinsiLevelAdmin = useMemo(() => {
    const role = (userData.role ?? '').toLowerCase().trim();
    const levelName = (userData.instansiLevelName ?? '').toUpperCase().trim();

    if (!role && !levelName) return false;
    if (role.includes('admin_provinsi')) return true;
    if (levelName.includes('PROVINSI')) return true;
    return false;
  }, [userData.role, userData.instansiLevelName]);

  useEffect(() => {
    if (!user) return;
    setEditName(user.name ?? '');
    setEditPhone(user.username ?? '');
  }, [user]);

  const handleOpenEditProfile = () => {
    setActionError(null);
    setActionSuccess(null);
    setEditName(user?.name ?? '');
    setEditPhone(user?.username ?? '');
    setIsEditProfileOpen(true);
  };

  const handleOpenChangePassword = () => {
    setActionError(null);
    setActionSuccess(null);
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setIsChangePasswordOpen(true);
  };

  const handleOpenUploadPhoto = () => {
    setActionError(null);
    setActionSuccess(null);
    setPhotoFile(null);
    setIsUploadPhotoOpen(true);
  };

  const submitEditProfile = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await apiClient.patch<{ status: string; message?: string; user?: MeResponse['user'] }>(
        '/auth/profile',
        {
          name: editName,
          username: editPhone || '',
        }
      );

      if (response.user) {
        setUser(response.user);
      }

      setActionSuccess(response.message ?? 'Profil berhasil diperbarui.');
      setIsEditProfileOpen(false);
    } catch (err: any) {
      setActionError(err?.data?.message ?? err?.message ?? 'Gagal memperbarui profil.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitChangePassword = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await apiClient.post<{ status: string; message?: string }>(
        '/auth/change-password',
        {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPasswordConfirm,
        }
      );

      setActionSuccess(response.message ?? 'Password berhasil diubah.');
      setIsChangePasswordOpen(false);
    } catch (err: any) {
      setActionError(err?.data?.message ?? err?.message ?? 'Gagal mengubah password.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitUploadPhoto = async () => {
    if (!photoFile) {
      setActionError('Silakan pilih file foto terlebih dahulu.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await apiClient.post<{ status: string; message?: string; user?: MeResponse['user'] }>(
        '/auth/photo',
        formData
      );

      if (response.user) {
        setUser(response.user);
      }

      setActionSuccess(response.message ?? 'Foto profil berhasil diperbarui.');
      setIsUploadPhotoOpen(false);
    } catch (err: any) {
      setActionError(err?.data?.message ?? err?.message ?? 'Gagal mengunggah foto profil.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profil</h1>
          <p className="text-slate-500 text-sm">Kelola akun, password, dan foto profil</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" leftIcon={<Camera className="w-4 h-4" />} onClick={handleOpenUploadPhoto}>
            Ganti Foto
          </Button>
          <Button variant="outline" leftIcon={<PencilLine className="w-4 h-4" />} onClick={handleOpenEditProfile}>
            Edit Profil
          </Button>
          <Button leftIcon={<KeyRound className="w-4 h-4" />} onClick={handleOpenChangePassword}>
            Ubah Password
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="p-6 shadow-md">
          <div className="text-slate-600 font-medium">Memuat profil...</div>
        </Card>
      )}

      {!loading && error && (
        <Card className="p-6 shadow-md">
          <div className="text-red-600 font-semibold">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-sky-600 p-[1px] shadow-lg">
            <div className="rounded-2xl bg-white/95 backdrop-blur-sm">
              <Card className="p-6 shadow-none bg-transparent border-0">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={userData.avatar}
                      alt="Profile"
                      className="w-24 h-24 rounded-full border border-slate-200 bg-white object-cover shadow-sm"
                    />
                    <div className="md:hidden">
                      <div className="text-xl font-bold text-slate-800">{userData.name}</div>
                      {userData.username && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5">@{userData.username}</div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2">
                        {displayInstansiLevel && <Badge variant="info">{displayInstansiLevel}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="hidden md:flex md:items-center md:justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">{userData.name}</h2>
                        {userData.username && (
                          <div className="text-xs font-mono text-slate-500 mt-1">@{userData.username}</div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {displayInstansiLevel && <Badge variant="info">{displayInstansiLevel}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div className="flex flex-col text-right">
                          <span className="text-[11px] text-slate-400">Terakhir login</span>
                          <span className="text-xs font-semibold">{userData.lastLogin}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {userData.email && (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700 break-all">{userData.email}</span>
                        </div>
                      )}
                      {userData.username && (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700 break-all">@{userData.username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {(isProvinsiLevelAdmin || userData.asalWilayah.kabKota || userData.asalWilayah.kecamatan || userData.asalWilayah.desaKel) && (
            <Card title="Asal Wilayah" className="shadow-md">
              {isProvinsiLevelAdmin ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Provinsi</div>
                  <div className="text-sm font-semibold text-slate-700">Pemerintah Provinsi Jawa Timur</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kab/Kota</div>
                    <div className="text-sm font-semibold text-slate-700">{userData.asalWilayah.kabKota ?? '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kecamatan</div>
                    <div className="text-sm font-semibold text-slate-700">{userData.asalWilayah.kecamatan ?? '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Desa/Kelurahan</div>
                    <div className="text-sm font-semibold text-slate-700">{userData.asalWilayah.desaKel ?? '-'}</div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Profil"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditProfileOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button onClick={submitEditProfile} isLoading={actionLoading}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionError && <div className="text-sm font-semibold text-red-600">{actionError}</div>}
          <div>
            <label className="text-sm font-semibold text-slate-700">Nama</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Nama"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Username</label>
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Username"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Ubah Password"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button onClick={submitChangePassword} isLoading={actionLoading}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionError && <div className="text-sm font-semibold text-red-600">{actionError}</div>}
          <div>
            <label className="text-sm font-semibold text-slate-700">Password Lama</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Password lama"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Password baru"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ulangi password baru"
            />
          </div>
          <div className="text-xs text-slate-500">Minimal 8 karakter.</div>
        </div>
      </Modal>

      <Modal
        isOpen={isUploadPhotoOpen}
        onClose={() => setIsUploadPhotoOpen(false)}
        title="Ganti Foto Profil"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsUploadPhotoOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button onClick={submitUploadPhoto} isLoading={actionLoading}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionError && <div className="text-sm font-semibold text-red-600">{actionError}</div>}
          <div className="flex items-center gap-4">
            <img
              src={userData.avatar}
              alt="Preview"
              className="w-16 h-16 rounded-full border border-slate-200 object-cover"
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
              <div className="mt-2 text-xs text-slate-500">Maksimal 2MB (JPG/PNG).</div>
            </div>
          </div>
        </div>
      </Modal>

      {actionSuccess && (
        <div className="max-w-6xl mx-auto">
          <Card className="p-4 border border-emerald-100 bg-emerald-50">
            <div className="text-sm font-semibold text-emerald-700">{actionSuccess}</div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;