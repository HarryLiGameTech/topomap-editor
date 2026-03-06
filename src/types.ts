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

export interface SketchMapNode {
  id: string;
  x: number;
  y: number;
  label: string;
  color: TriangleColor;
  description: string; // optional longer text description, used for additional info for pathfinding results
}

export interface SketchMapEdge {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  style: EdgeStyle;
  weight: number; // 1–10, affects line thickness
  cost: number;   // non-negative, in seconds, used for pathfinding algorithms
}

// ──────────────────────────────────────────────────────────────
// Selection state (discriminated union)
// ──────────────────────────────────────────────────────────────

export type Selection =
  | { kind: 'none' }
  | { kind: 'triangles'; ids: string[] }   // 1 or 2 triangle ids
  | { kind: 'line'; id: string };
