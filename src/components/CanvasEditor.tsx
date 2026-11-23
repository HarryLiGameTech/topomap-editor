import { useEffect, useRef, useCallback, useState } from 'react';
import type { SketchMapNode, SketchMapEdge } from '../types';
import type { MapStore } from '../hooks/useMapStore';
import { getNumberDSLField } from '../utils/dslFields';

// ──────────────────────────────────────────────────────────────
// Drawing constants
// ──────────────────────────────────────────────────────────────
const CIRCUMRADIUS = 10;        // triangle circumscribed circle radius (px)
const HIT_RADIUS   = CIRCUMRADIUS; // px — matches the visible triangle exactly
const LINE_HIT_DIST = 6;        // px — how close to click to "hit" a line

// ──────────────────────────────────────────────────────────────
// Helper: geometry
// ──────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

interface SelectionDrag {
  pointerId: number;
  start: Point;
  additive: boolean;
  dragging: boolean;
}

function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
    y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
  };
}

function selectionBox(start: Point, end: Point) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

const DRAG_THRESHOLD = 5;
function isDrag(gesture: SelectionDrag, end: Point) {
  return gesture.dragging || Math.hypot(end.x - gesture.start.x, end.y - gesture.start.y) >= DRAG_THRESHOLD;
}

function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function hitTestTriangle(t: SketchMapNode, px: number, py: number): boolean {
  return Math.hypot(px - t.x, py - t.y) <= HIT_RADIUS;
}

function hitTestLine(
  line: SketchMapEdge,
  triangles: SketchMapNode[],
  px: number,
  py: number
): boolean {
  const from = triangles.find((t) => t.id === line.fromId);
  const to   = triangles.find((t) => t.id === line.toId);
  if (!from || !to) return false;
  return distToSegment(px, py, from.x, from.y, to.x, to.y) <= LINE_HIT_DIST;
}

// ──────────────────────────────────────────────────────────────
// Helper: drawing primitives
// ──────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const STEP = 40;
  ctx.beginPath();
  ctx.strokeStyle = '#e8eaed';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += STEP) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += STEP) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

function drawTriangleShape(
  ctx: CanvasRenderingContext2D,
  t: SketchMapNode,
  selected: boolean
) {
  const { x, y, color: assignedColor, label } = t;
  const color = label.trim() === '' ? '#f39c12' : assignedColor;
  const R = CIRCUMRADIUS;

  // Build path
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (i * (2 * Math.PI)) / 3 - Math.PI / 2;
    const px = x + R * Math.cos(angle);
    const py = y + R * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Selected glow
  if (selected) {
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = color;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 4;
    ctx.stroke();
  }

  // Fill
  ctx.fillStyle = selected ? lighten(color) : color;
  ctx.fill();

  // Border
  ctx.strokeStyle = selected ? '#ffffff' : 'rgba(0,0,0,0.45)';
  ctx.lineWidth   = selected ? 2.5 : 1.5;
  ctx.stroke();

  // Label below triangle
  if (label) {
    ctx.fillStyle  = '#2d3436';
    ctx.font       = 'bold 11px system-ui, sans-serif';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y + R + 5, 100);
  }
}

function lighten(hex: string): string {
  // Very simple brightening: mix with white at 35%
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.35);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function drawLineShape(
  ctx: CanvasRenderingContext2D,
  line: SketchMapEdge,
  triangles: SketchMapNode[],
  selected: boolean
) {
  const from = triangles.find((t) => t.id === line.fromId);
  const to   = triangles.find((t) => t.id === line.toId);
  if (!from || !to) return;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);

  ctx.setLineDash(line.style === 'dashed' ? [10, 5] : []);
  const cost = getNumberDSLField(line.dslFields, 'cost') ?? 0;
  ctx.strokeStyle = selected ? '#0984e3' : (cost === 0 ? '#f39c12' : '#636e72');
  ctx.lineWidth   = selected ? line.weight + 1 : line.weight;
  ctx.stroke();
  ctx.setLineDash([]);

  // Line label at midpoint
  if (line.label) {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    ctx.fillStyle    = selected ? '#0984e3' : '#2d3436';
    ctx.font         = '11px system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(line.label, mx, my - 4, 120);
  }
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

interface Props {
  store: MapStore;
}

export function CanvasEditor({ store }: Props) {
  const { state, addTriangle, selectTriangle, selectLine, clearSelection, addLine } = store;
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<SelectionDrag | null>(null);
  const [box, setBox] = useState<ReturnType<typeof selectionBox> | null>(null);

  // Background image — local state, not part of map data
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // ── Draw ──────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.clientWidth;
    const h   = canvas.clientHeight;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Background colour
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);

    // Background image — scaled to cover 80% of the canvas area, centred
    const bg = bgImage;
    if (bg) {
      const scale = Math.max(w / bg.naturalWidth, h / bg.naturalHeight) * 0.65;
      const bw = bg.naturalWidth  * scale;
      const bh = bg.naturalHeight * scale;
      const bx = (w - bw) / 2;
      const by = (h - bh) / 2;
      ctx.drawImage(bg, bx, by, bw, bh);
    }

    if (!bg || overlayOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = bg ? overlayOpacity / 100 : 1;
      drawGrid(ctx, w, h);
      ctx.restore();
    }

    const { triangles, lines, selection } = state;

    // Draw edges first (behind nodes)
    for (const line of lines) {
      const isSelected = selection.kind === 'line' && selection.id === line.id;
      drawLineShape(ctx, line, triangles, isSelected);
    }

    // Draw triangles on top
    const selectedIds = new Set(selection.kind === 'triangles' ? selection.ids : []);
    for (const tri of triangles) {
      drawTriangleShape(ctx, tri, selectedIds.has(tri.id));
    }

    // Connection hint: if 2 triangles are selected, draw a dashed preview
    if (selection.kind === 'triangles' && selection.ids.length === 2) {
      const [a, b] = selection.ids.map((id) => triangles.find((t) => t.id === id));
      if (a && b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = 'rgba(9,132,227,0.5)';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Tooltip hint
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle    = 'rgba(9,132,227,0.8)';
        ctx.font         = '11px system-ui, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Right-click to connect', mx, my - 4);
      }
    }

    ctx.restore();
  }, [bgImage, overlayOpacity, state]);

  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ── Background image upload ───────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleClearBg = useCallback(() => setBgImage(null), []);

  const clickAt = ({ x, y }: Point, additive: boolean) => {
    const { triangles, lines, selection } = state;
    for (let i = triangles.length - 1; i >= 0; i--) {
      if (hitTestTriangle(triangles[i], x, y)) {
        selectTriangle(triangles[i].id, additive);
        return;
      }
    }
    if (additive) return;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (hitTestLine(lines[i], triangles, x, y)) {
        selectLine(lines[i].id);
        return;
      }
    }
    if (selection.kind === 'none' || (selection.kind === 'triangles' && selection.naming)) addTriangle(x, y);
    else clearSelection();
  };

  const cancelDrag = useCallback(() => {
    const gesture = dragRef.current;
    if (!gesture) return;
    dragRef.current = null;
    setBox(null);
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(gesture.pointerId)) canvas.releasePointerCapture(gesture.pointerId);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || dragRef.current) return;
    const canvas = event.currentTarget;
    const additive = event.ctrlKey || event.metaKey;
    event.preventDefault();
    canvas.focus({ preventScroll: true });

    // macOS may report Control-click as a secondary click.
    if (event.button === 0 || (event.button === 2 && event.ctrlKey)) {
      dragRef.current = { pointerId: event.pointerId, start: canvasPoint(event), additive, dragging: false };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    const { selection } = state;
    if (event.button === 2 && !additive && selection.kind === 'triangles' && selection.ids.length === 2) {
      addLine(selection.ids[0], selection.ids[1]);
      clearSelection();
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = dragRef.current;
    if (gesture?.pointerId !== event.pointerId) return;
    const end = canvasPoint(event);
    if (isDrag(gesture, end)) {
      gesture.dragging = true;
      setBox(selectionBox(gesture.start, end));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = dragRef.current;
    if (gesture?.pointerId !== event.pointerId) return;
    const end = canvasPoint(event);
    cancelDrag();
    if (!isDrag(gesture, end)) {
      clickAt(gesture.start, gesture.additive);
      return;
    }
    const { left, top, width, height } = selectionBox(gesture.start, end);
    const { selection, triangles } = state;
    const ids = new Set(gesture.additive && selection.kind === 'triangles' ? selection.ids : []);
    for (const node of triangles) {
      if (node.x >= left && node.x <= left + width && node.y >= top && node.y <= top + height) {
        ids.add(node.id);
      }
    }
    store.selectTriangles([...ids]);
  };

  const handleCanvasKey = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (dragRef.current) return;
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (state.selection.kind !== 'triangles') return;
    event.preventDefault();
    store.deleteTriangles(state.selection.ids);
  };

  // ── Keyboard: Escape deselects ────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dragRef.current) cancelDrag();
      else clearSelection();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', cancelDrag);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', cancelDrag);
    };
  }, [clearSelection, cancelDrag]);

  // ── Render ────────────────────────────────────────────────

  const selCount =
    state.selection.kind === 'triangles' ? state.selection.ids.length : 0;

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Map drawing canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onLostPointerCapture={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
        }}
        onPointerCancel={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={handleCanvasKey}
        className="map-canvas"
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
      />

      {box && <div className="selection-box" style={box} aria-hidden="true" />}

      {/* ── Background image controls ─────────────────── */}
      <div className="canvas-controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="btn btn-canvas-ctrl"
          onClick={() => fileInputRef.current?.click()}
          title="Set background image"
        >
          {bgImage ? '🖼 Change Background' : '🖼 Set Background'}
        </button>
        {bgImage && (
          <>
            <button
              className="btn btn-canvas-ctrl btn-canvas-ctrl--clear"
              onClick={handleClearBg}
              title="Remove background image"
            >
              ✕ Clear BG
            </button>
            <label className="grid-opacity">
              Grid
              <input type="range" aria-label="Grid opacity" min="0" max="100"
                value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
              <output>{overlayOpacity}%</output>
            </label>
          </>
        )}
      </div>
      <div className="canvas-hint">
        {state.selection.kind === 'none' && (
          <span>Click to place a node · Drag to select nodes · Ctrl/⌘-drag to add</span>
        )}
        {state.selection.kind === 'triangles' && state.selection.naming && (
          <span>Type a name · Click empty space for the next node · Esc to finish</span>
        )}
        {state.selection.kind === 'triangles' && !state.selection.naming && selCount === 1 && (
          <span>1 node selected · Ctrl/⌘-click to add or remove nodes · Delete to remove selection</span>
        )}
        {state.selection.kind === 'triangles' && selCount === 2 && (
          <span>2 nodes selected · <strong>Right-click</strong> to connect · Delete to remove both</span>
        )}
        {selCount > 2 && <span>{selCount} nodes selected · Delete to remove · Esc to clear selection</span>}
        {state.selection.kind === 'line' && (
          <span>Edge selected · Edit properties in the right panel</span>
        )}
      </div>
    </div>
  );
}
