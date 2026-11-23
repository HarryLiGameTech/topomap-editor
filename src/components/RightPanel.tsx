import { useLayoutEffect, useRef } from 'react';
import { nameCaret, namingMode } from '../utils/nodeNaming';
import type { MapStore } from '../hooks/useMapStore';
import { TRIANGLE_COLORS } from '../types';
import type { TriangleColor, EdgeStyle, NodeNamingMode } from '../types';
import { useConstraints } from '../context/ConstraintsContext';
import { DSLFieldsEditor } from './DSLFieldsEditor';

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

function NamingSelect({ value, onChange, label }: {
  value: NodeNamingMode;
  onChange: (mode: NodeNamingMode) => void;
  label: string;
}) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor="node-type">{label}</label>
      <select id="node-type" className="field-select" value={value}
        onChange={(event) => onChange(event.target.value as NodeNamingMode)}>
        <option value="room">Room · 房间</option>
        <option value="elevator">Elevator lobby · 电梯厅</option>
        <option value="staircase">Stairwell · 楼梯间</option>
        <option value="custom">Custom · 自定义</option>
      </select>
    </div>
  );
}

export function RightPanel({ store }: Props) {
  const { state, updateTriangle, deleteTriangles, updateLine, deleteLine, updateMeta } = store;
  const { selection, triangles, lines, meta } = state;
  const { constraints, loading: constraintsLoading } = useConstraints();

  const labelRef = useRef<HTMLInputElement>(null);
  const tri = selection.kind === 'triangles' && selection.ids.length === 1
    ? triangles.find((node) => node.id === selection.ids[0]) : undefined;
  const template = tri?.template;
  useLayoutEffect(() => {
    if (selection.kind !== 'triangles' || !selection.naming || !template) return;
    const input = labelRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const caret = nameCaret(template);
    input.setSelectionRange(caret, caret);
  }, [selection, template]);

  // ── Nothing selected → map meta panel ────────────────────
  if (selection.kind === 'none') {
    return (
      <aside className="right-panel">
        <h2 className="panel-title">Map Properties</h2>
        <NamingSelect label="New node type" value={state.nodeNamingMode} onChange={store.setNodeNamingMode} />

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
  if (selection.kind === 'triangles' && selection.ids.length > 1) {
    return (
      <aside className="right-panel">
        <h2 className="panel-title">{selection.ids.length} nodes selected</h2>
        <button className="btn btn-danger" onClick={() => deleteTriangles(selection.ids)}>
          Delete Selected Nodes
        </button>
      </aside>
    );
  }

  // ── Triangle panel ────────────────────────────────────────
  if (selection.kind === 'triangles') {
    if (!tri) return null;

    return (
      <aside className="right-panel">
        <h2 className="panel-title">Node Properties</h2>
        <NamingSelect label="Node type" value={namingMode(tri.template)}
          onChange={(mode) => store.setNodeNamingMode(mode, tri.id)} />

        <div className="field-group">
          <label className="field-label" htmlFor="node-label">Label</label>
          <input
            id="node-label"
            ref={labelRef}
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

        <div className="panel-divider" />

        <DSLFieldsEditor
          fields={tri.dslFields}
          onChange={(dslFields) => updateTriangle(tri.id, { dslFields })}
        />

        <div className="panel-divider" />

        <button
          className="btn btn-danger"
          onClick={() => deleteTriangles([tri.id])}
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

        <DSLFieldsEditor
          fields={line.dslFields}
          lockedFieldNames={['cost']}
          onChange={(dslFields) => updateLine(line.id, { dslFields })}
        />

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

  return <aside className="right-panel" />;
}
