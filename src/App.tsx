import { useMapStore } from './hooks/useMapStore';
import { ConstraintsProvider } from './context/ConstraintsContext';
import { CanvasEditor } from './components/CanvasEditor';
import { RightPanel }   from './components/RightPanel';
import { BottomBar }    from './components/BottomBar';
import { convertToDSL } from './utils/toDSL';
import { sendValidate }  from './api/validate';
import './App.css';

export default function App() {
  const store = useMapStore();

  const handleValidate = async () => {
    const dsl = convertToDSL(store.state);
    console.warn('[Validate] DSL output:\n' + dsl);

    const result = await sendValidate(dsl);
    if (result.status === 'success') {
      console.log('[Validate] Success:', result.message);
    } else {
      console.error('[Validate] Error:', result.message);
    }
  };

  // TODO: implement import
  const handleImport = () => {
    console.log('[TODO] Import map');
  };

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
      <BottomBar onValidate={handleValidate} onImport={handleImport} />
    </div>
    </ConstraintsProvider>
  );
}
