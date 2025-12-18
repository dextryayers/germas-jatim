import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface RequireAuthProps {
  children: React.ReactElement;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const location = useLocation();
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token')
    : null;

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ reason: 'AUTH_REQUIRED', from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
};

export default RequireAuth;
