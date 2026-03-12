import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isGuest, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Loading…</span>
      </div>
    );
  }

  if (isGuest) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
