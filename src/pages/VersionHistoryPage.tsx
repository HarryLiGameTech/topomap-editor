import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

interface Version {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export function VersionHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringsha, setRestoringsha] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<Version[]>(`/api/maps/${id}/versions`)
      .then(res => {
        setVersions(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load version history.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRestore = async (sha: string) => {
    if (
      !confirm('Restore to this version? Any unsaved changes will be lost.')
    )
      return;
    setRestoringsha(sha);
    try {
      await api.post(`/api/maps/${id}/restore/${sha}`);
      navigate(`/maps/${id}`);
    } catch {
      alert('Failed to restore version.');
    } finally {
      setRestoringsha(null);
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <span className="app-logo">◭</span>
        <h1 className="app-title">Version History</h1>
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
        {loading && <p className="dashboard-status">Loading history…</p>}
        {error && (
          <p className="dashboard-status dashboard-status--error">{error}</p>
        )}

        {!loading && !error && versions.length === 0 && (
          <p className="dashboard-status">No version history available.</p>
        )}

        {!loading && versions.length > 0 && (
          <div className="map-list">
            {versions.map(v => (
              <div key={v.sha} className="map-card">
                <div className="map-card-info map-card-info--static">
                  <span className="map-card-title">{v.message}</span>
                  <span className="map-card-meta">
                    {v.author} · {new Date(v.date).toLocaleString()}
                  </span>
                </div>
                <div className="map-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestore(v.sha)}
                    disabled={restoringsha === v.sha}
                  >
                    {restoringsha === v.sha ? 'Restoring…' : 'Restore'}
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
