import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, MapPin, Phone, Mail, Globe, Facebook, Instagram, Youtube, Twitter, LayoutDashboard, LogOut, UserCircle, ChevronDown, User, Settings, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { showConfirmation, showSuccess } from '../utils/alerts';
import LogoJatim from './svg/logo-jatim.svg';
import { VisitorTracker, VisitorStats } from '../utils/visitorTracker';
import { apiClient } from '../utils/apiClient';

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authName, setAuthName] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authInstansi, setAuthInstansi] = useState<string | null>(null);
  const [authPhoto, setAuthPhoto] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [visitorStats, setVisitorStats] = useState<VisitorStats>(() => {
    if (typeof window === 'undefined') {
      return { totalVisits: 0, todayVisits: 0, weekVisits: 0, history: [] };
    }
    return VisitorTracker.getStats();
  });
  const numberFormatter = useMemo(() => new Intl.NumberFormat('id-ID'), []);

  const location = useLocation();
  const navigate = useNavigate();

  // Cek status login setiap kali lokasi berubah
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token');
      setIsLoggedIn(!!token);
      setAuthName(sessionStorage.getItem('user_name') ?? localStorage.getItem('user_name'));
      setAuthEmail(sessionStorage.getItem('user_email') ?? localStorage.getItem('user_email'));
      setAuthInstansi(sessionStorage.getItem('user_instansi_name') ?? localStorage.getItem('user_instansi_name'));
      setAuthPhoto(sessionStorage.getItem('user_photo_url') ?? localStorage.getItem('user_photo_url'));
    };
    checkAuth();

    const token = sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token');
    if (token) {
      type MeResponse = {
        status: string;
        user: {
          name: string;
          email: string;
          photo_url?: string | null;
          instansi?: { name?: string | null } | null;
        };
      };

      apiClient
        .get<MeResponse>('/auth/me')
        .then((response) => {
          const name = response.user?.name ?? null;
          const email = response.user?.email ?? null;
          const instansi = response.user?.instansi?.name ?? null;
          const photo = response.user?.photo_url ?? null;

          if (name) {
            sessionStorage.setItem('user_name', name);
            localStorage.setItem('user_name', name);
          }
          if (email) {
            sessionStorage.setItem('user_email', email);
            localStorage.setItem('user_email', email);
          }
          if (instansi) {
            sessionStorage.setItem('user_instansi_name', instansi);
            localStorage.setItem('user_instansi_name', instansi);
          } else {
            sessionStorage.removeItem('user_instansi_name');
            localStorage.removeItem('user_instansi_name');
          }
          if (photo) {
            sessionStorage.setItem('user_photo_url', photo);
            localStorage.setItem('user_photo_url', photo);
          } else {
            sessionStorage.removeItem('user_photo_url');
            localStorage.removeItem('user_photo_url');
          }

          setAuthName(name);
          setAuthEmail(email);
          setAuthInstansi(instansi);
          setAuthPhoto(photo);
        })
        .catch(() => {
          /* ignore - fallback to cached storage */
        });
    }

    // Listen to custom event for immediate UI updates
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, [location]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = VisitorTracker.subscribe((stats) => {
      setVisitorStats(stats);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    VisitorTracker.recordVisit();
  }, [location.pathname]);

  const formatNumber = (value: number) => numberFormatter.format(value);

  const handleLogout = async () => {
    const result = await showConfirmation('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari akun ini?', 'Keluar', 'Batal');
    if (!result.isConfirmed) return;

    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('user_email');
    sessionStorage.removeItem('user_name');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('user_instansi_name');
    sessionStorage.removeItem('user_photo_url');

    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_instansi_name');
    localStorage.removeItem('user_photo_url');
    setIsLoggedIn(false);
    setIsUserMenuOpen(false);
    
    // Dispatch event agar komponen lain (seperti Home) tahu status berubah
    window.dispatchEvent(new Event('auth-change'));

    await showSuccess('Logout Berhasil', 'Sampai jumpa kembali!');
    navigate('/');
  };

  // Updated NavItems to point to hashes for sections
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Form Pelaporan', path: '/#section-formulir' },
    { label: 'Arsip Laporan', path: '/#section-laporan' },
  ];

  const scrollToHashSection = (hash: string) => {
    const element = document.getElementById(hash);
    if (!element) return;

    const headerEl = document.querySelector('header');
    const headerHeight = headerEl instanceof HTMLElement ? headerEl.getBoundingClientRect().height : 80;
    const offset = headerHeight + 12;
    const elementTop = element.getBoundingClientRect().top + window.pageYOffset;

    window.scrollTo({ top: Math.max(elementTop - offset, 0), behavior: 'smooth' });
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // If it's a hash link
    if (path.includes('#')) {
      const [pathname, hash] = path.split('#');
      
      // If we are already on the home page and targeting Home (/)
      if (location.pathname === '/' && pathname === '/') {
          if (!hash) {
             // Home button scroll to top
             e.preventDefault();
             window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
             // Scroll to section
             e.preventDefault();
             scrollToHashSection(hash);
          }
      } else if (location.pathname === '/' && !hash) {
          // Explicitly clicking "Home" (path='/') while on '/'
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (path === '/' && location.pathname === '/') {
        // Simple Home link click while on Home
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // If navigating to a hashed section from another route, allow navigation first
    if (path.includes('#') && location.pathname !== '/') {
      const [, hash] = path.split('#');
      setTimeout(() => scrollToHashSection(hash), 120);
    }

    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5fbf8] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-[0_8px_24px_-22px_rgba(15,118,110,0.28)] border-b border-emerald-100/50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex items-center gap-3 group">
            <img 
              src={LogoJatim} 
              alt="Logo Jatim" 
              className="h-12 w-auto transition-transform group-hover:scale-105 drop-shadow-[0_12px_20px_rgba(16,185,129,0.18)]"
            />
            <div>
              <h2 className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-widest">Pemerintah Provinsi Jawa Timur</h2>
              <h1 className="text-base md:text-lg font-bold text-slate-800 leading-none">DINAS KESEHATAN</h1>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              {navItems.map((item) => {
                // Determine active state more precisely
                let isActive = false;
                if (item.path === '/') {
                    isActive = location.pathname === '/' && !location.hash;
                } else if (item.path.includes('#')) {
                    const hash = `#${item.path.split('#')[1]}`;
                    isActive = location.hash === hash;
                }

                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={(e) => handleNavClick(e, item.path)}
                    className={`text-sm font-semibold py-1 transition-all duration-300 relative group ${
                      isActive 
                        ? 'text-emerald-600' 
                        : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    {item.label}
                    {/* Underline Style */}
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transform origin-left transition-transform duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                  </Link>
                );
              })}
            </nav>
            <div className="h-6 w-px bg-emerald-100"></div>
            
            {/* Auth Buttons */}
            {isLoggedIn ? (
               <div className="relative" ref={userMenuRef}>
                  <button 
                     onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                     className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                  >
                     <div className="relative">
                        <img 
                           src={authPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authName ?? 'Admin')}&background=0ea5e9&color=fff`} 
                           alt={authName ?? 'User'} 
                           className="w-9 h-9 rounded-full border-2 border-white shadow-sm group-hover:shadow-md transition-shadow" 
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                     </div>
                     <div className="text-left hidden lg:block">
                        <p className="text-xs font-bold text-slate-700 leading-tight">{authName ?? 'Admin'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{authInstansi ?? 'Admin Panel'}</p>
                     </div>
                     <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                     <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                           <p className="text-sm font-bold text-slate-800">{authName ?? 'Admin'}</p>
                           <p className="text-xs text-slate-500 truncate">{authEmail ?? 'admin@germas.local'}</p>
                           {authInstansi && (
                             <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                                {authInstansi}
                             </span>
                           )}
                        </div>
                        <div className="p-2 space-y-1">
                           <Link 
                              to="/admin/dashboard" 
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                           >
                              <LayoutDashboard className="w-4 h-4" />
                              Dashboard
                           </Link>
                           <Link 
                              to="/admin/profile" 
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                           >
                              <User className="w-4 h-4" />
                              Profil Saya
                           </Link>
                           <Link 
                              to="/admin/settings" 
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                           >
                              <Settings className="w-4 h-4" />
                              Pengaturan
                           </Link>
                        </div>
                        <div className="p-2 border-t border-slate-50">
                           <button 
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                           >
                              <LogOut className="w-4 h-4" />
                              Logout
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            ) : (
               <Button 
                  variant="secondary" 
                  size="md"
                  className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold px-6 shadow-md shadow-emerald-300"
                  onClick={() => navigate('/login')}
                  leftIcon={<UserCircle className="w-4 h-4" />}
               >
                  Login
               </Button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>

          {/* Mobile Nav */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-emerald-100 bg-gradient-to-b from-white via-white-90 to-sky-50 p-4 space-y-2 shadow-lg shadow-emerald-200/60 absolute w-full left-0 top-20 z-40 max-h-[85vh] overflow-y-auto">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item.path)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                     (item.path === '/' && location.pathname === '/' && !location.hash) || (item.path !== '/' && location.hash === `#${item.path.split('#')[1]}`)
                       ? 'bg-emerald-100/70 text-emerald-700 border-l-4 border-emerald-500' 
                       : 'text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-emerald-100/60">
                 {isLoggedIn ? (
                    <div className="flex flex-col gap-2">
                      <div className="px-4 py-3 bg-white/80 rounded-lg mb-2 flex items-center gap-3 shadow-sm">
                         <img 
                            src={authPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authName ?? 'Admin')}&background=0ea5e9&color=fff`}
                            className="w-10 h-10 rounded-full" 
                            alt={authName ?? 'User'} 
                         />
                         <div>
                            <p className="font-bold text-slate-800 text-sm">{authName ?? 'Admin'}</p>
                            <p className="text-xs text-slate-500">{authInstansi ?? 'Admin Panel'}</p>
                         </div>
                      </div>
                      <Link to="/admin/dashboard" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2 text-sm font-medium">
                         <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link to="/admin/profile" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2 text-sm font-medium">
                         <User className="w-4 h-4" /> Profil Saya
                      </Link>
                      <Button 
                         onClick={() => { handleLogout(); setIsMenuOpen(false); }} 
                         className="w-full justify-center bg-red-50 text-red-600 hover:bg-red-100/80 mt-2"
                         leftIcon={<LogOut className="w-4 h-4"/>}
                      >
                         Logout
                      </Button>
                    </div>
                 ) : (
                    <Button 
                       onClick={() => { navigate('/login'); setIsMenuOpen(false); }} 
                       className="w-full justify-center bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                       leftIcon={<UserCircle className="w-4 h-4" />}
                    >
                       Login
                    </Button>
                 )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
         <Outlet />
      </main>

      {!location.pathname.startsWith('/admin') && (
        <div className="fixed left-4 bottom-6 z-40 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-lg shadow-emerald-200/60 backdrop-blur">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Pengunjung</span>
            <span className="text-sm font-bold text-slate-800">{formatNumber(visitorStats.totalVisits)} kunjungan</span>
            <span className="text-[11px] font-medium text-emerald-600">
              +{formatNumber(visitorStats.todayVisits)} hari ini
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative mt-auto bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 text-emerald-50">
         {/* Colorful Border Top representing GERMAS Colors */}
         <div className="h-1.5 w-full flex">
            <div className="h-full w-1/4 bg-red-500"></div>
            <div className="h-full w-1/4 bg-yellow-400"></div>
            <div className="h-full w-1/4 bg-green-500"></div>
            <div className="h-full w-1/4 bg-blue-500"></div>
         </div>

         <div className="container mx-auto px-4 pt-16 pb-8">
            <div className="grid md:grid-cols-3 gap-12 mb-12">
               {/* Identity */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <img 
                        src={LogoJatim} 
                        alt="Logo Jatim" 
                        className="h-14 w-auto opacity-95 drop-shadow-[0_20px_35px_rgba(4,120,87,0.35)]"
                     />
                     <div>
                        <h2 className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Pemerintah Provinsi Jawa Timur</h2>
                        <h1 className="text-lg font-bold text-white leading-none tracking-wide">DINAS KESEHATAN</h1>
                     </div>
                  </div>
                  <p className="text-emerald-100/90 text-sm leading-relaxed pr-4">
                     SI-PORSI GERMAS. Sistem Pelaporan dan Evaluasi Gerakan Masyarakat Hidup Sehat (GERMAS) Pada Tatanan Tempat Kerja .
                  </p>
                  <div className="flex gap-3">
                     {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                        <a key={i} href="#" className="w-10 h-10 rounded-full bg-emerald-700/70 flex items-center justify-center text-emerald-100 hover:bg-white hover:text-emerald-700 transition-all duration-300 border border-emerald-500/60 hover:border-white">
                           <Icon className="w-5 h-5" />
                        </a>
                     ))}
                  </div>
               </div>

               {/* Links */}
               <div className="md:pl-8">
                  <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                     <span className="w-1 h-6 bg-yellow-300 rounded-full"></span>
                     Link Terkait
                  </h3>
                  <ul className="space-y-3 text-sm">
                     <li><a href="https://dinkes.jatimprov.go.id/" className="hover:text-white hover:translate-x-1 transition-all inline-block text-emerald-100/90">Dinkes Jatim</a></li>
                     <li><a href="https://jatimprov.go.id/" className="hover:text-white hover:translate-x-1 transition-all inline-block text-emerald-100/90">Pemprov Jstim</a></li>
                     <li><a href="https://www.kemkes.go.id/" className="hover:text-white hover:translate-x-1 transition-all inline-block text-emerald-100/90">Kementrian Kesehatan RI</a></li>
                     <li><a href="https://promkes.kemkes.go.id/" className="hover:text-white hover:translate-x-1 transition-all inline-block text-emerald-100/90">Promkes Kemkes</a></li>
                     <li><a href="https://yankes.kemkes.go.id/" className="hover:text-white hover:translate-x-1 transition-all inline-block text-emerald-100/90">Yankes Kemkes</a></li>
                  </ul>
               </div>

               {/* Contact */}
               <div>
                  <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                     <span className="w-1 h-6 bg-teal-300 rounded-full"></span>
                     Kontak Kami
                  </h3>
                  <ul className="space-y-4 text-sm">
                     <li className="flex items-start gap-3 group">
                        <div className="p-2 bg-emerald-700/70 rounded-lg group-hover:bg-emerald-500 transition-colors">
                           <MapPin className="w-5 h-5 text-emerald-100 group-hover:text-white" />
                        </div>
                        <span className="mt-1">
                           Jl. Ahmad Yani No.118, Ketintang,<br/>
                           Kec. Gayungan, Surabaya,<br/>
                           Jawa Timur 60231
                        </span>
                     </li>
                     <li className="flex items-center gap-3 group">
                        <div className="p-2 bg-emerald-700/70 rounded-lg group-hover:bg-emerald-500 transition-colors">
                           <Phone className="w-5 h-5 text-emerald-100 group-hover:text-white" />
                        </div>
                        <span>(031) 8280715</span>
                     </li>
                     <li className="flex items-center gap-3 group">
                        <div className="p-2 bg-emerald-700/70 rounded-lg group-hover:bg-emerald-500 transition-colors">
                           <Mail className="w-5 h-5 text-emerald-100 group-hover:text-white" />
                        </div>
                        <span><a href="mailto:dinkes@jatimprov.go.id" className="hover:text-cyan transition-colors">dinkes@jatimprov.go.id</a></span>
                     </li>
                     <li className="flex items-center gap-3 group">
                        <div className="p-2 bg-emerald-700/70 rounded-lg group-hover:bg-emerald-500 transition-colors">
                           <Globe className="w-5 h-5 text-emerald-100 group-hover:text-white" />
                        </div>
                        <a href="https://dinkes.jatimprov.go.id" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">dinkes.jatimprov.go.id</a>
                     </li>
                  </ul>
               </div>
            </div>

            <div className="border-t border-emerald-600/60 pt-8 mt-8 text-center text-xs text-emerald-200/90">
               <p className="mb-2">© 2025-2026 Dinas Kesehatan Provinsi Jawa Timur. Hak Cipta Dilindungi Undang-Undang.</p>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default Layout;