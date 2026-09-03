import { useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '../hooks/useMapStore';
import { ConstraintsProvider } from '../context/ConstraintsContext';
import { CanvasEditor } from '../components/CanvasEditor';
import { RightPanel } from '../components/RightPanel';
import { BottomBar } from '../components/BottomBar';
import { GuestBanner } from '../components/GuestBanner';
import { convertToDSL } from '../utils/toDSL';
import { downloadMapBackup } from '../utils/mapBackup';
import { sendValidate } from '../api/validate';

const DRAFT_KEY = 'guest-map-draft';

export function EditorPage() {
  const store = useMapStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore last draft on first mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Parameters<typeof store.loadMap>[0];
        store.loadMap(parsed);
      } catch { /* corrupt draft — ignore */ }
    }
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to localStorage (debounced 2 s) — crash-recovery buffer
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

  const handleValidate = async () => {
    let dsl: string;
    try {
      dsl = convertToDSL(store.state);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
      return;
    }
    console.warn('[Validate] DSL output:\n' + dsl);

    const blob = new Blob([dsl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.state.meta.mapName}.tmap`;
    a.click();
    URL.revokeObjectURL(url);

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

  const handleExportJson = useCallback(() => {
    downloadMapBackup(store.state);
  }, [store.state]);

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
      // Reset so the same file can be re-imported
      e.target.value = '';
    },
    [store]
  );

  return (
    <ConstraintsProvider>
      <div className="app-shell">
        <GuestBanner />

        {/* ── Top header bar ─────────────────────────────── */}
        <header className="app-header">
          <span className="app-logo">◭</span>
          <h1 className="app-title">Topomap Editor</h1>
          <span className="app-subtitle">
            {store.state.triangles.length} nodes · {store.state.lines.length} edges
          </span>
        </header>

        {/* ── Main working area ──────────────────────────── */}
        <div className="app-body">
          <main className="canvas-area">
            <CanvasEditor store={store} />
          </main>
          <RightPanel store={store} />
        </div>

        {/* ── Bottom action bar ──────────────────────────── */}
        <BottomBar
          onValidate={handleValidate}
          onExportJson={handleExportJson}
          onImport={handleImport}
        />

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
