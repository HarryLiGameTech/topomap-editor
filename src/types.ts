// ──────────────────────────────────────────────────────────────
// Domain model for the topomap editor
// ──────────────────────────────────────────────────────────────

export type TriangleColor =
  | '#4a90e2'   // blue
  | '#27ae60'   // green
  | '#e74c3c'   // red
  | '#f39c12'   // orange
  | '#9b59b6';  // purple

export const TRIANGLE_COLORS: TriangleColor[] = [
  '#4a90e2',
  '#27ae60',
  '#e74c3c',
  '#f39c12',
  '#9b59b6',
];

export type EdgeStyle = 'solid' | 'dashed';

export interface Triangle {
  id: string;
  x: number;
  y: number;
  label: string;
  color: TriangleColor;
}

export interface Line {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  style: EdgeStyle;
  weight: number; // 1–10, affects line thickness
}

// ──────────────────────────────────────────────────────────────
// Selection state (discriminated union)
// ──────────────────────────────────────────────────────────────

export type Selection =
  | { kind: 'none' }
  | { kind: 'triangles'; ids: string[] }   // 1 or 2 triangle ids
  | { kind: 'line'; id: string };
