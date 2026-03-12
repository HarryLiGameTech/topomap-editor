import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

interface MapSummary {
  id: string;
  title: string;
  visibility: string;
  ownerLogin: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaps = () => {
    setLoading(true);
    api
      .get<MapSummary[]>('/api/maps')
      .then(res => {
        setMaps(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load maps.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this map? This cannot be undone.')) return;
    try {
      await api.delete(`/api/maps/${id}`);
      setMaps(prev => prev.filter(m => m.id !== id));
    } catch {
      alert('Failed to delete map.');
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <span className="app-logo">◭</span>
        <h1 className="app-title">Topomap Editor</h1>
        <div className="dashboard-user">
          {user?.avatarUrl && (
            <img
              className="user-avatar"
              src={user.avatarUrl}
              alt={user.displayName}
              referrerPolicy="no-referrer"
            />
          )}
          <span className="user-name">{user?.displayName ?? user?.githubLogin}</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-toolbar">
          <h2 className="dashboard-section-title">My Maps</h2>
          <button className="btn btn-primary" onClick={() => navigate('/maps/new')}>
            + New Map
          </button>
        </div>

        {loading && <p className="dashboard-status">Loading maps…</p>}
        {error && <p className="dashboard-status dashboard-status--error">{error}</p>}

        {!loading && !error && maps.length === 0 && (
          <p className="dashboard-status">No maps yet. Create your first map!</p>
        )}

        {!loading && maps.length > 0 && (
          <div className="map-list">
            {maps.map(m => (
              <div key={m.id} className="map-card">
                <button
                  className="map-card-info"
                  onClick={() => navigate(`/maps/${m.id}`)}
                >
                  <span className="map-card-title">{m.title}</span>
                  <span className="map-card-meta">
                    {m.visibility} · {m.role} · Updated{' '}
                    {new Date(m.updatedAt).toLocaleDateString()}
                  </span>
                </button>
                <div className="map-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/maps/${m.id}/settings`)}
                  >
                    Settings
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
