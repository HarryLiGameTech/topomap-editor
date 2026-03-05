import { useMapStore } from './hooks/useMapStore';
import { CanvasEditor } from './components/CanvasEditor';
import { RightPanel }   from './components/RightPanel';
import { BottomBar }    from './components/BottomBar';
import './App.css';

export default function App() {
  const store = useMapStore();

  // TODO: implement export
  const handleExport = () => {
    console.log('[TODO] Export map', store.state);
  };

  // TODO: implement import
  const handleImport = () => {
    console.log('[TODO] Import map');
  };

  return (
    <div className="app-shell">
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
        {/* 80% canvas */}
        <main className="canvas-area">
          <CanvasEditor store={store} />
        </main>

        {/* 20% right panel (conditionally visible) */}
        <RightPanel store={store} />
      </div>

      {/* ── Bottom action bar ──────────────────────────── */}
      <BottomBar onExport={handleExport} onImport={handleImport} />
    </div>
  );
}
