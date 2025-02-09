import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../api/axios';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: 'voter' | 'manager';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = role === 'voter' ? localStorage.getItem('token') : localStorage.getItem('managerToken');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsAuthenticated(true);
  }, [role]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={role === 'voter' ? '/login' : '/manager/login'} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;