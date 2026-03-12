import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

const DRAFT_KEY = 'guest-map-draft';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const restoreSession = useAuthStore(s => s.restoreSession);
  const [status, setStatus] = useState('Processing login…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('Login failed — no token received.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    // Store token and immediately strip it from the URL
    localStorage.setItem('jwt', token);
    window.history.replaceState({}, '', '/');

    // Validate the token and hydrate auth state
    restoreSession().then(() => {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const upload = window.confirm(
          'You have an unsaved local map. Upload it as a new map?'
        );
        if (upload) {
          let mapName = 'Untitled Map';
          try {
            const parsed = JSON.parse(draft) as { meta?: { mapName?: string } };
            mapName = parsed.meta?.mapName ?? mapName;
          } catch { /* ignore parse errors, use default title */ }

          api
            .post<{ id: string }>('/api/maps', {
              title: mapName,
              initialMapJson: draft,
            })
            .then(res => {
              localStorage.removeItem(DRAFT_KEY);
              navigate(`/maps/${res.data.id}`, { replace: true });
            })
            .catch(() => {
              localStorage.removeItem(DRAFT_KEY);
              navigate('/', { replace: true });
            });
          return;
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
      navigate('/', { replace: true });
    });
    // Effect runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="app-logo auth-logo">◭</span>
        <p className="auth-subtitle">{status}</p>
      </div>
    </div>
  );
}
