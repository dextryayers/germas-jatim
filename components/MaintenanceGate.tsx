import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/apiClient';

interface MaintenanceGateProps {
  children: React.ReactNode;
}

const MaintenanceGate: React.FC<MaintenanceGateProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMaintenance = async () => {
      // Jangan cek di halaman maintenance itu sendiri untuk menghindari loop
      if (location.pathname === '/maintenance') {
        return;
      }

      const token = typeof window !== 'undefined'
        ? sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token')
        : null;

      // Bypass key opsional yang diset di environment frontend (VITE_MAINTENANCE_BYPASS_KEY)
      const BYPASS_KEY = import.meta.env.VITE_MAINTENANCE_BYPASS_KEY as string | undefined;

      let hasBypass = false;
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          const keyParam = url.searchParams.get('maintenance_key');

          if (BYPASS_KEY && keyParam && keyParam === BYPASS_KEY) {
            // Simpan bypass di sessionStorage untuk sesi browser saat ini
            window.sessionStorage.setItem('maintenance_bypass', '1');
          }

          hasBypass = window.sessionStorage.getItem('maintenance_bypass') === '1';
        } catch {
          hasBypass = window.sessionStorage.getItem('maintenance_bypass') === '1';
        }
      }

      // Anggap semua user yang sudah terautentikasi ATAU yang punya bypass key
      // sebagai pihak yang boleh melewati soft maintenance gate.
      const isPrivileged = !!token || hasBypass;

      try {
        // Gunakan endpoint status publik agar pengunjung tanpa login juga bisa diarahkan
        const response = await apiClient.get<{ enabled: boolean }>('/maintenance/status');
        if (response.enabled && !isPrivileged) {
          if (location.pathname !== '/maintenance') {
            navigate('/maintenance', { replace: true });
          }
        }
      } catch (error: any) {
        // Jika API mengembalikan 503 (maintenance Laravel), apiClient akan melempar error.
        // Anggap saja sistem sedang maintenance untuk user biasa.
        const status = error?.status as number | undefined;
        if (!isPrivileged && (status === 503 || status === undefined || status === 0)) {
          if (location.pathname !== '/maintenance') {
            navigate('/maintenance', { replace: true });
          }
        }
      }
    };

    void checkMaintenance();
  }, [location.pathname, navigate]);

  return <>{children}</>;
};

export default MaintenanceGate;
