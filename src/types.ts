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

export type DSLFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string-list'
  | 'number-list'
  | 'boolean-list';

interface DSLFieldBase {
  /** Stable editor-only identity. The DSL uses `name`, not this id. */
  id: string;
  name: string;
}

export type DSLField =
  | (DSLFieldBase & { type: 'string'; value: string })
  | (DSLFieldBase & { type: 'number'; value: number })
  | (DSLFieldBase & { type: 'boolean'; value: boolean })
  | (DSLFieldBase & { type: 'string-list'; value: string[] })
  | (DSLFieldBase & { type: 'number-list'; value: number[] })
  | (DSLFieldBase & { type: 'boolean-list'; value: boolean[] });

export interface MapMeta {
  mapName: string;      // used as the topo-map identifier in DSL
  permResident: number; // permanent resident count passed as DSL param
}

export type NodeNamingMode = 'room' | 'elevator' | 'staircase' | 'custom';
export type NodeTemplate = 'inside' | 'outside' | 'staircaseOutside' | Exclude<NodeNamingMode, 'room'>;

export interface SketchMapNode {
  template: NodeTemplate;
  skippedRoomPartnerIds?: string[];
  id: string;
  x: number;
  y: number;
  label: string;
  color: TriangleColor;
  dslFields: DSLField[];
}

export interface SketchMapEdge {
  autoRoomConnection?: true;
  id: string;
  fromId: string;
  toId: string;
  label: string;
  style: EdgeStyle;
  weight: number; // 1–10, affects line thickness
  dslFields: DSLField[];
  constraint: string; // optional additional constraint for pathfinding algorithms
}

// ──────────────────────────────────────────────────────────────
// Selection state (discriminated union)
// ──────────────────────────────────────────────────────────────

export type Selection =
  | { kind: 'none' }
  | { kind: 'triangles'; ids: string[]; naming?: true }   // one or more selected node ids
  | { kind: 'line'; id: string };
