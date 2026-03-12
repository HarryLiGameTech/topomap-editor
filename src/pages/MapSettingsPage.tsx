import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

interface MapDetail {
  id: string;
  title: string;
  visibility: string;
  ownerLogin: string;
  role: string;
}

interface Collaborator {
  id: string;
  githubLogin: string;
  displayName: string;
  role: string;
}

export function MapSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [map, setMap] = useState<MapDetail | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCollaborators = () =>
    api
      .get<Collaborator[]>(`/api/maps/${id}/collaborators`)
      .then(res => setCollaborators(res.data))
      .catch(() => {});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<MapDetail>(`/api/maps/${id}`),
      api
        .get<Collaborator[]>(`/api/maps/${id}/collaborators`)
        .catch(() => ({ data: [] as Collaborator[] })),
    ])
      .then(([mapRes, collabRes]) => {
        setMap(mapRes.data);
        setCollaborators((collabRes as { data: Collaborator[] }).data);
      })
      .catch(() => setError('Failed to load map settings.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleVisibilityChange = async (visibility: string) => {
    if (!id) return;
    try {
      await api.put(`/api/maps/${id}/visibility`, { visibility });
      setMap(prev => (prev ? { ...prev, visibility } : prev));
    } catch {
      alert('Failed to update visibility.');
    }
  };

  const handleAddCollaborator = async () => {
    if (!newUserId.trim() || !id) return;
    try {
      await api.post(`/api/maps/${id}/collaborators`, {
        userId: newUserId.trim(),
        role: newRole,
      });
      setNewUserId('');
      await refreshCollaborators();
    } catch {
      alert('Failed to add collaborator.');
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!id || !confirm('Remove this collaborator?')) return;
    try {
      await api.delete(`/api/maps/${id}/collaborators/${userId}`);
      setCollaborators(prev => prev.filter(c => c.id !== userId));
    } catch {
      alert('Failed to remove collaborator.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p style={{ color: '#d63031', marginBottom: 16 }}>{error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/maps/${id}`)}
          >
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <span className="app-logo">◭</span>
        <h1 className="app-title">Map Settings</h1>
        <div className="dashboard-user">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/maps/${id}`)}
          >
            ← Back to Editor
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {map && (
          <>
            {/* Visibility */}
            <section className="settings-section">
              <h2 className="dashboard-section-title">Visibility</h2>
              <div className="settings-row">
                {(['private', 'public'] as const).map(v => (
                  <button
                    key={v}
                    className={`btn ${map.visibility === v ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleVisibilityChange(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            {/* Collaborators — owner only */}
            {map.role === 'owner' && (
              <section className="settings-section">
                <h2 className="dashboard-section-title">Collaborators</h2>

                <div className="collab-add-row">
                  <input
                    className="field-input"
                    type="text"
                    value={newUserId}
                    onChange={e => setNewUserId(e.target.value)}
                    placeholder="User ID"
                  />
                  <select
                    className="field-select"
                    value={newRole}
                    onChange={e =>
                      setNewRole(e.target.value as 'editor' | 'viewer')
                    }
                    style={{ width: 110 }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddCollaborator}
                  >
                    Add
                  </button>
                </div>

                {collaborators.length > 0 && (
                  <div className="map-list" style={{ marginTop: 12 }}>
                    {collaborators.map(c => (
                      <div key={c.id} className="map-card">
                        <div className="map-card-info map-card-info--static">
                          <span className="map-card-title">
                            {c.displayName ?? c.githubLogin}
                          </span>
                          <span className="map-card-meta">{c.role}</span>
                        </div>
                        <div className="map-card-actions">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveCollaborator(c.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
