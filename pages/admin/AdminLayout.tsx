import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Menu, FileCheck, Home, FileText, ChevronRight, ChevronLeft, LogOut, User, ClipboardList } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { showConfirmation, showSuccess } from '../../utils/alerts';
import logoGermas from '../../components/svg/logo-germas.svg';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State untuk Desktop (Collapse/Expand width)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State untuk Mobile (Show/Hide) - Default false (tersembunyi)
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tutup sidebar mobile saat rute berubah (navigasi)
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const userName = useMemo(() => sessionStorage.getItem('user_name') ?? localStorage.getItem('user_name') ?? 'Administrator', []);
  const userEmail = useMemo(() => sessionStorage.getItem('user_email') ?? localStorage.getItem('user_email') ?? 'admin@germas.local', []);

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Verifikasi Laporan', path: '/admin/verifikasi', icon: FileCheck },
    { label: 'Manajemen Formulir', path: '/admin/forms', icon: ClipboardList }, // New Menu
    { label: 'Data Wilayah', path: '/admin/wilayah', icon: FileText },
    { label: 'Manajemen User', path: '/admin/users', icon: Users },
    { label: 'Profil Saya', path: '/admin/profile', icon: User },
    { label: 'Pengaturan', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    const result = await showConfirmation(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar dari akun admin?',
      'Keluar',
      'Batal'
    );

    if (!result.isConfirmed) {
      return;
    }

    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('user_email');
    sessionStorage.removeItem('user_name');
    sessionStorage.removeItem('user_role');

    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    window.dispatchEvent(new Event('auth-change'));

    await showSuccess('Logout Berhasil', 'Anda telah keluar dari portal admin.');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      
      {/* --- MOBILE ONLY COMPONENTS --- */}
      
      {/* 1. Tombol Panah Buka (Hanya muncul di Mobile saat menu tertutup) */}
      {!mobileOpen && (
        <button 
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-slate-800 text-white w-5 h-16 rounded-r-full shadow-lg shadow-slate-400/50 hover:bg-green-600 transition-all duration-300 border-y border-r border-slate-700 flex items-center justify-center group"
          aria-label="Buka Menu"
        >
          <ChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* 2. Overlay Gelap (Backdrop) saat menu mobile terbuka */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR NAVIGATION --- */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 h-full bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl border-r border-slate-800
          ${/* Logika Mobile: Slide In/Out */ ''}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          
          ${/* Logika Desktop: Relative positioning & Width resizing */ ''}
          md:relative md:translate-x-0 
          ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
        `}
      >
        {/* Tombol Tutup Mobile (Menonjol Keluar) */}
        <button 
          onClick={() => setMobileOpen(false)}
          className={`md:hidden absolute -right-5 top-1/2 -translate-y-1/2 z-50 bg-slate-800 text-white w-5 h-16 rounded-r-full shadow-xl hover:bg-red-600 transition-all duration-300 border-y border-r border-slate-700 flex items-center justify-center ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label="Tutup Menu"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
          <div className={`flex items-center gap-3 transition-opacity duration-200 ${!sidebarOpen && 'md:justify-center w-full'} ${(!sidebarOpen && !mobileOpen) ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
            <img src={logoGermas} alt="logoGermas" className="w-12 h-12"/>
            {/* Teks Admin Panel hanya muncul jika Desktop Open ATAU Mobile Open */}
            <span className={`font-bold text-lg whitespace-nowrap tracking-wide ${(sidebarOpen || mobileOpen) ? 'block' : 'hidden'}`}>
              Admin Panel
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Check active state
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  ${!sidebarOpen ? 'md:justify-center' : ''}
                `}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className={`font-medium whitespace-nowrap transition-all duration-300 origin-left
                  ${(sidebarOpen || mobileOpen) ? 'block' : 'hidden'}
                `}>
                  {item.label}
                </span>
                
                {/* Tooltip for collapsed desktop sidebar */}
                {!sidebarOpen && !mobileOpen && (
                   <div className="fixed left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap ml-2">
                      {item.label}
                   </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <button 
             onClick={handleLogout}
             className={`flex items-center gap-3 text-slate-400 hover:text-red-400 w-full px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors ${!sidebarOpen ? 'md:justify-center' : ''}`}
             title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`font-medium whitespace-nowrap ${(sidebarOpen || mobileOpen) ? 'block' : 'hidden'}`}>Logout</span>
          </button>
          
          <Link 
             to="/"
             className={`flex items-center gap-3 text-slate-400 hover:text-green-400 w-full px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors mt-1 ${!sidebarOpen ? 'md:justify-center' : ''}`}
             title="Ke Halaman Utama"
          >
             <Home className="w-5 h-5 flex-shrink-0" />
             <span className={`font-medium whitespace-nowrap ${(sidebarOpen || mobileOpen) ? 'block' : 'hidden'}`}>Halaman Utama</span>
          </Link>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 z-10">
          <div className="flex items-center gap-4">
            {/* Desktop Toggle Button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Title / Breadcrumb */}
            <h2 className="text-lg font-bold text-slate-800 truncate pl-4 md:pl-0">
               {menuItems.find(i => location.pathname.startsWith(i.path))?.label || 'Admin Panel'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col text-right mr-2">
                <span className="text-sm font-bold text-slate-700">{userName}</span>
                <span className="text-xs text-slate-500">Admin Panel</span>
             </div>
             <div className="w-9 h-9 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-bold overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0ea5e9&color=fff`} alt={userName} />
             </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;