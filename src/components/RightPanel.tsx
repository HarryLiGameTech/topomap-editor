import type { MapStore } from '../hooks/useMapStore';
import { TRIANGLE_COLORS } from '../types';
import type { TriangleColor, EdgeStyle } from '../types';
import { useConstraints } from '../context/ConstraintsContext';

interface Props {
  store: MapStore;
}

const COLOR_NAMES: Record<TriangleColor, string> = {
  '#4a90e2': 'Blue',
  '#27ae60': 'Green',
  '#e74c3c': 'Red',
  '#f39c12': 'Orange',
  '#9b59b6': 'Purple',
};

export function RightPanel({ store }: Props) {
  const { state, updateTriangle, deleteTriangle, updateLine, deleteLine, updateMeta } = store;
  const { selection, triangles, lines, meta } = state;
  const { constraints, loading: constraintsLoading } = useConstraints();

  // ── Nothing selected → map meta panel ────────────────────
  if (selection.kind === 'none') {
    return (
      <aside className="right-panel">
        <h2 className="panel-title">Map Properties</h2>

        <div className="field-group">
          <label className="field-label">Map Name</label>
          <input
            className="field-input"
            type="text"
            value={meta.mapName}
            placeholder="e.g. ExampleMap"
            onChange={(e) => updateMeta({ mapName: e.target.value })}
          />
        </div>

        <div className="field-group">
          <label className="field-label">Permanent Residents</label>
          <input
            className="field-input"
            type="number"
            min={0}
            step={1}
            value={meta.permResident}
            onChange={(e) => updateMeta({ permResident: Math.max(0, Number(e.target.value)) })}
          />
        </div>
      </aside>
    );
  }
  if (selection.kind === 'triangles' && selection.ids.length !== 1) return null;

  // ── Triangle panel ────────────────────────────────────────
  if (selection.kind === 'triangles') {
    const tri = triangles.find((t) => t.id === selection.ids[0]);
    if (!tri) return null;

    return (
      <aside className="right-panel">
        <h2 className="panel-title">Node Properties</h2>

        <div className="field-group">
          <label className="field-label">Label</label>
          <input
            className="field-input"
            type="text"
            value={tri.label}
            placeholder="e.g. Node A"
            onChange={(e) =>
              updateTriangle(tri.id, { label: e.target.value })
            }
          />
        </div>

        <div className="field-group">
          <label className="field-label">Position X</label>
          <input
            className="field-input"
            type="number"
            value={Math.round(tri.x)}
            onChange={(e) =>
              updateTriangle(tri.id, { x: Number(e.target.value) })
            }
          />
        </div>

        <div className="field-group">
          <label className="field-label">Position Y</label>
          <input
            className="field-input"
            type="number"
            value={Math.round(tri.y)}
            onChange={(e) =>
              updateTriangle(tri.id, { y: Number(e.target.value) })
            }
          />
        </div>

        <div className="field-group">
          <label className="field-label">Color</label>
          <select
            className="field-select"
            value={tri.color}
            onChange={(e) =>
              updateTriangle(tri.id, { color: e.target.value as TriangleColor })
            }
          >
            {TRIANGLE_COLORS.map((c) => (
              <option key={c} value={c}>
                {COLOR_NAMES[c]}
              </option>
            ))}
          </select>
          <span className="color-swatch" style={{ backgroundColor: tri.color }} />
        </div>

        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea
            className="field-textarea"
            value={tri.description}
            placeholder="Additional info (e.g. for pathfinding results)"
            rows={4}
            onChange={(e) =>
              updateTriangle(tri.id, { description: e.target.value })
            }
          />
        </div>

        <div className="panel-divider" />

        <button
          className="btn btn-danger"
          onClick={() => deleteTriangle(tri.id)}
        >
          Delete Node
        </button>
      </aside>
    );
  }

  // ── Line panel ────────────────────────────────────────────
  if (selection.kind === 'line') {
    const line = lines.find((l) => l.id === selection.id);
    if (!line) return null;

    const fromNode = triangles.find((t) => t.id === line.fromId);
    const toNode   = triangles.find((t) => t.id === line.toId);

    return (
      <aside className="right-panel">
        <h2 className="panel-title">Edge Properties</h2>

        <div className="field-group">
          <label className="field-label">From → To</label>
          <p className="field-meta">
            {fromNode?.label || '(unlabelled)'} → {toNode?.label || '(unlabelled)'}
          </p>
        </div>

        <div className="field-group">
          <label className="field-label">Label</label>
          <input
            className="field-input"
            type="text"
            value={line.label}
            placeholder="e.g. Road A1"
            onChange={(e) => updateLine(line.id, { label: e.target.value })}
          />
        </div>

        <div className="field-group">
          <label className="field-label">Style</label>
          <select
            className="field-select"
            value={line.style}
            onChange={(e) =>
              updateLine(line.id, { style: e.target.value as EdgeStyle })
            }
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Weight (thickness) — {line.weight}</label>
          <input
            className="field-range"
            type="range"
            min={1}
            max={10}
            value={line.weight}
            onChange={(e) => updateLine(line.id, { weight: Number(e.target.value) })}
          />
        </div>

        <div className="field-group">
          <label className="field-label">Cost (seconds)</label>
          <input
            className="field-input"
            type="number"
            min={0}
            step={1}
            value={line.cost}
            placeholder="e.g. 120"
            onChange={(e) =>
              updateLine(line.id, { cost: Math.max(0, Number(e.target.value)) })
            }
          />
        </div>

        <div className="field-group">
          <label className="field-label">Constraint</label>
          {constraintsLoading ? (
            <p className="field-meta">Loading constraints…</p>
          ) : (
            <select
              className="field-select"
              value={line.constraint}
              onChange={(e) => updateLine(line.id, { constraint: e.target.value })}
            >
              <option value="">(none)</option>
              {constraints.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        <div className="panel-divider" />

        <button
          className="btn btn-danger"
          onClick={() => deleteLine(line.id)}
        >
          Delete Edge
        </button>
      </aside>
    );
  }

  return null;
}
