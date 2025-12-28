import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { LoadingSpinner } from './components/ui/Loading';
import RequireAuth from './components/RequireAuth';

// Lazy load pages for performance
const Home = lazy(() => import('./pages/Home'));
const Forms = lazy(() => import('./pages/Forms'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Register = lazy(() => import('./pages/Register'));
const Forbidden = lazy(() => import('./pages/Forbidden'));

// Admin Pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminVerification = lazy(() => import('./pages/admin/Verification'));
const AdminRegions = lazy(() => import('./pages/admin/Regions'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminFormBuilder = lazy(() => import('./pages/admin/FormBuilder')); // New Import

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><LoadingSpinner /></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="formulir" element={<Forms />} />
          </Route>
          
          <Route path="/login" element={<Login />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forget-password" element={<ForgotPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dash-admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={(
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            )}
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="verifikasi" element={<AdminVerification />} />
            <Route path="wilayah" element={<AdminRegions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="forms" element={<AdminFormBuilder />} /> {/* New Route */}
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;