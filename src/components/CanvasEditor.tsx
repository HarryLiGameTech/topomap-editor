import { useEffect, useRef, useCallback } from 'react';
import type { Triangle, Line, Selection } from '../types';
import type { MapStore } from '../hooks/useMapStore';

// ──────────────────────────────────────────────────────────────
// Drawing constants
// ──────────────────────────────────────────────────────────────
const CIRCUMRADIUS = 22;        // triangle circumscribed circle radius (px)
const HIT_RADIUS   = CIRCUMRADIUS + 10; // px — generous hit zone
const LINE_HIT_DIST = 8;        // px — how close to click to "hit" a line

// ──────────────────────────────────────────────────────────────
// Helper: geometry
// ──────────────────────────────────────────────────────────────

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

function hitTestTriangle(t: Triangle, px: number, py: number): boolean {
  return Math.hypot(px - t.x, py - t.y) <= HIT_RADIUS;
}

function hitTestLine(
  line: Line,
  triangles: Triangle[],
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
  t: Triangle,
  selected: boolean
) {
  const { x, y, color, label } = t;
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
  line: Line,
  triangles: Triangle[],
  selected: boolean
) {
  const from = triangles.find((t) => t.id === line.fromId);
  const to   = triangles.find((t) => t.id === line.toId);
  if (!from || !to) return;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);

  ctx.setLineDash(line.style === 'dashed' ? [10, 5] : []);
  ctx.strokeStyle = selected ? '#0984e3' : '#636e72';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep a ref to current state so event handlers don't become stale
  const stateRef = useRef(state);
  stateRef.current = state;

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

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);

    drawGrid(ctx, w, h);

    const { triangles, lines, selection } = stateRef.current;

    // Draw edges first (behind nodes)
    for (const line of lines) {
      const isSelected = selection.kind === 'line' && selection.id === line.id;
      drawLineShape(ctx, line, triangles, isSelected);
    }

    // Draw triangles on top
    for (const tri of triangles) {
      const isSelected =
        selection.kind === 'triangles' && selection.ids.includes(tri.id);
      drawTriangleShape(ctx, tri, isSelected);
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
  }, []); // stable — reads from stateRef

  // Re-draw whenever state changes
  useEffect(() => {
    draw();
  });

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  // ── Mouse event helpers ───────────────────────────────────

  const getCanvasPos = (e: MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ── Event listeners ───────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent browser context menu
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const { triangles, lines, selection } = stateRef.current;

      if (e.button === 0) {
        // ── Left click ────────────────────────────────────

        // 1. Hit-test triangles (front-to-back)
        for (let i = triangles.length - 1; i >= 0; i--) {
          if (hitTestTriangle(triangles[i], x, y)) {
            selectTriangle(triangles[i].id);
            return;
          }
        }

        // 2. Hit-test lines
        for (let i = lines.length - 1; i >= 0; i--) {
          if (hitTestLine(lines[i], triangles, x, y)) {
            selectLine(lines[i].id);
            return;
          }
        }

        // 3. Clicked on empty space
        if (selection.kind !== 'none') {
          // Deselect
          clearSelection();
        } else {
          // Create new triangle at click position
          addTriangle(x, y);
        }

      } else if (e.button === 2) {
        // ── Right click ───────────────────────────────────
        if (selection.kind === 'triangles' && selection.ids.length === 2) {
          addLine(selection.ids[0], selection.ids[1]);
          clearSelection();
        }
      }
    };

    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('mousedown',   onMouseDown);

    return () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousedown',   onMouseDown);
    };
  }, [addTriangle, selectTriangle, selectLine, clearSelection, addLine]);

  // ── Keyboard: Escape deselects ────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  // ── Render ────────────────────────────────────────────────

  const selCount =
    state.selection.kind === 'triangles' ? state.selection.ids.length : 0;

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
      />
      <div className="canvas-hint">
        {state.selection.kind === 'none' && (
          <span>Left-click on empty space to place a node · Click a node to select it</span>
        )}
        {state.selection.kind === 'triangles' && selCount === 1 && (
          <span>1 node selected · Click another node to also select it, or edit in the right panel</span>
        )}
        {state.selection.kind === 'triangles' && selCount === 2 && (
          <span>2 nodes selected · <strong>Right-click</strong> to connect them with an edge</span>
        )}
        {state.selection.kind === 'line' && (
          <span>Edge selected · Edit properties in the right panel</span>
        )}
      </div>
    </div>
  );
}
