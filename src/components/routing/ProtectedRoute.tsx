import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import PageLoader from '../common/PageLoader';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader fullScreen label="Checking session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Force School and Teacher users to complete profile & change password before accessing dashboard
  if (user && (!user.profileCompleted || !user.passwordChanged)) {
    if (user?.role === 'SCHOOL' && location.pathname !== '/dashboard/school-profile') {
      return <Navigate to="/dashboard/school-profile" replace />;
    }
    if (user?.role === 'TEACHER' && location.pathname !== '/dashboard/teacher-profile') {
      return <Navigate to="/dashboard/teacher-profile" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
