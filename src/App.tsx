import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { EditorPage } from './pages/EditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewMapPage } from './pages/NewMapPage';
import { MapEditorPage } from './pages/MapEditorPage';
import { VersionHistoryPage } from './pages/VersionHistoryPage';
import { MapSettingsPage } from './pages/MapSettingsPage';
import './App.css';

export default function App() {
  const restoreSession = useAuthStore(s => s.restoreSession);

  // Validate any stored JWT on first load; sets isGuest silently if invalid
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Guest scratchpad — no login required */}
        <Route path="/editor" element={<EditorPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maps/new"
          element={
            <ProtectedRoute>
              <NewMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maps/:id"
          element={
            <ProtectedRoute>
              <MapEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maps/:id/versions"
          element={
            <ProtectedRoute>
              <VersionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maps/:id/settings"
          element={
            <ProtectedRoute>
              <MapSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback: unknown paths go to the guest editor */}
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
