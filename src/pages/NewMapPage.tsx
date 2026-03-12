import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export function NewMapPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a map title.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/api/maps', {
        title: title.trim(),
        initialMapJson: JSON.stringify({
          meta: { mapName: title.trim(), permResident: 0 },
          triangles: [],
          lines: [],
        }),
      });
      navigate(`/maps/${res.data.id}`);
    } catch {
      setError('Failed to create map. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="app-logo auth-logo">◭</span>
        <h1 className="auth-title">New Map</h1>

        <div style={{ width: '100%', marginTop: 16 }}>
          <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
            Map Title
          </label>
          <input
            className="field-input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. North Wing Lobby"
            autoFocus
          />
        </div>

        {error && (
          <p style={{ color: '#d63031', fontSize: 13, margin: '8px 0 0' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={creating}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
