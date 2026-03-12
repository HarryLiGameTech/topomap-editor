import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMapStore } from '../hooks/useMapStore';
import { ConstraintsProvider } from '../context/ConstraintsContext';
import { CanvasEditor } from '../components/CanvasEditor';
import { RightPanel } from '../components/RightPanel';
import { BottomBar } from '../components/BottomBar';
import { convertToDSL } from '../utils/toDSL';
import { sendValidate } from '../api/validate';
import api from '../api/client';

const DRAFT_KEY = 'guest-map-draft';

interface MapDetail {
  id: string;
  title: string;
  mapJson?: string;
}

export function MapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useMapStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch map content from backend on mount — overrides localStorage draft
  useEffect(() => {
    if (!id) return;
    api
      .get<MapDetail>(`/api/maps/${id}`)
      .then(res => {
        if (res.data.mapJson) {
          try {
            const parsed = JSON.parse(res.data.mapJson) as Parameters<typeof store.loadMap>[0];
            store.loadMap(parsed);
          } catch {
            console.error('[MapEditor] Could not parse mapJson from backend');
          }
        }
      })
      .catch(() => {
        setLoadError('Failed to load map. It may have been deleted or you lack access.');
      });
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-save to localStorage (debounced 2 s) — crash-recovery buffer for all users
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const snapshot = {
        meta: store.state.meta,
        triangles: store.state.triangles,
        lines: store.state.lines,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [store.state.meta, store.state.triangles, store.state.lines]);

  const handleSaveToCloud = async () => {
    if (!id) return;
    setIsSaving(true);
    const mapJson = JSON.stringify({
      meta: store.state.meta,
      triangles: store.state.triangles,
      lines: store.state.lines,
    });
    try {
      await api.put(`/api/maps/${id}`, { mapJson });
      setLastSaved(new Date());
    } catch {
      alert('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    const dsl = convertToDSL(store.state);
    console.warn('[Validate] DSL output:\n' + dsl);
    const result = await sendValidate(dsl, store.state.meta.mapName);
    if (result.status === 'success') {
      console.log('[Validate] Success:', result.message);
    } else {
      console.error('[Validate] Error:', result.message);
    }
  };

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const parsed = JSON.parse(evt.target?.result as string) as Parameters<typeof store.loadMap>[0];
          store.loadMap(parsed);
        } catch {
          alert('Failed to parse map file. Ensure it is a valid JSON export.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [store]
  );

  if (loadError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p style={{ color: '#d63031', marginBottom: 16 }}>{loadError}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConstraintsProvider>
      <div className="app-shell">
        {/* ── Top header bar ─────────────────────────────── */}
        <header className="app-header">
          <span className="app-logo">◭</span>
          <h1 className="app-title">Topomap Editor</h1>
          <span className="app-subtitle">
            {store.state.triangles.length} nodes · {store.state.lines.length} edges
          </span>
          <div className="header-cloud-actions">
            {isSaving && <span className="save-indicator">Saving…</span>}
            {!isSaving && lastSaved && (
              <span className="save-indicator">Saved {lastSaved.toLocaleTimeString()}</span>
            )}
            <button
              className="btn btn-success btn-sm"
              onClick={handleSaveToCloud}
              disabled={isSaving}
            >
              Save to Cloud
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/maps/${id}/versions`)}
            >
              View History
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
              Dashboard
            </button>
          </div>
        </header>

        {/* ── Main working area ──────────────────────────── */}
        <div className="app-body">
          <main className="canvas-area">
            <CanvasEditor store={store} />
          </main>
          <RightPanel store={store} />
        </div>

        {/* ── Bottom action bar ──────────────────────────── */}
        <BottomBar onValidate={handleValidate} onImport={handleImport} />

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </ConstraintsProvider>
  );
}
