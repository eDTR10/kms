// @ts-nocheck
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/kms/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/kms" replace />;
  }

  return children;
}

