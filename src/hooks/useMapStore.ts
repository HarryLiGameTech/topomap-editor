import { useReducer, useCallback } from 'react';
import type {
  DSLField,
  EdgeStyle,
  MapMeta,
  NodeNamingMode,
  Selection,
  SketchMapEdge,
  SketchMapNode,
  TriangleColor,
} from '../types';
import {
  createNodeDSLFields,
  normalizeEdgeDSLFields,
  normalizeNodeDSLFields,
} from '../utils/dslFields';

import { connectRoomPairs, createMapEdge, matchedRoomEndpoints, sameEndpoints } from '../utils/roomConnections';
import { nextTemplate, readNodeTemplate, templateLabel } from '../utils/nodeNaming';

// ──────────────────────────────────────────────────────────────
// State & Action types
// ──────────────────────────────────────────────────────────────

export interface MapState {
  meta: MapMeta;
  triangles: SketchMapNode[];
  lines: SketchMapEdge[];
  selection: Selection;
  nodeNamingMode: NodeNamingMode;
}

export interface MapLoadPayload {
  meta?: Partial<MapMeta>;
  triangles?: unknown[];
  lines?: unknown[];
}

type Action =
  | { type: 'ADD_TRIANGLE'; payload: Omit<SketchMapNode, 'label' | 'template'> }
  | { type: 'SET_NODE_MODE'; mode: NodeNamingMode; id?: string }
  | { type: 'SELECT_TRIANGLE'; id: string; additive: boolean }
  | { type: 'DELETE_TRIANGLES'; ids: string[] }
  | { type: 'UPDATE_TRIANGLE'; payload: Partial<SketchMapNode> & { id: string } }
  | { type: 'ADD_LINE'; payload: SketchMapEdge }
  | { type: 'DELETE_LINE'; id: string }
  | { type: 'UPDATE_LINE'; payload: Partial<SketchMapEdge> & { id: string } }
  | { type: 'UPDATE_META'; payload: Partial<MapMeta> }
  | { type: 'SET_SELECTION'; selection: Selection }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'LOAD_MAP'; payload: MapLoadPayload };

function normalizeTriangle(value: unknown): SketchMapNode | null {
  if (value === null || typeof value !== 'object') return null;
  const node = value as Record<string, unknown>;
  if (typeof node.id !== 'string') return null;

  const label = typeof node.label === 'string' ? node.label : '';
  return {
    id: node.id,
    x: typeof node.x === 'number' && Number.isFinite(node.x) ? node.x : 0,
    y: typeof node.y === 'number' && Number.isFinite(node.y) ? node.y : 0,
    label,
    template: readNodeTemplate(node.template, label),
    skippedRoomPartnerIds: Array.isArray(node.skippedRoomPartnerIds)
      ? node.skippedRoomPartnerIds.filter((id): id is string => typeof id === 'string') : undefined,
    color: typeof node.color === 'string' ? node.color as TriangleColor : '#4a90e2',
    dslFields: normalizeNodeDSLFields(
      node.dslFields,
      typeof node.description === 'string' ? node.description : '',
    ),
  };
}

function normalizeLine(value: unknown): SketchMapEdge | null {
  if (value === null || typeof value !== 'object') return null;
  const line = value as Record<string, unknown>;
  if (
    typeof line.id !== 'string'
    || typeof line.fromId !== 'string'
    || typeof line.toId !== 'string'
  ) return null;

  return {
    id: line.id,
    autoRoomConnection: line.autoRoomConnection === true ? true : undefined,
    fromId: line.fromId,
    toId: line.toId,
    label: typeof line.label === 'string' ? line.label : '',
    style: line.style === 'dashed' ? 'dashed' : 'solid',
    weight: typeof line.weight === 'number' && Number.isFinite(line.weight) ? line.weight : 2,
    dslFields: normalizeEdgeDSLFields(
      line.dslFields,
      typeof line.cost === 'number' && Number.isFinite(line.cost) ? line.cost : 0,
    ),
    constraint: typeof line.constraint === 'string' ? line.constraint : '',
  };
}

// ──────────────────────────────────────────────────────────────
// Reducer
// ──────────────────────────────────────────────────────────────

function applyAction(state: MapState, action: Action): MapState {
  switch (action.type) {
    case 'ADD_TRIANGLE': {
      const template = nextTemplate(state.nodeNamingMode, state.triangles);
      const node = { ...action.payload, template, label: templateLabel(template) };
      return {
        ...state,
        triangles: [...state.triangles, node],
        selection: { kind: 'triangles', ids: [node.id], naming: true },
      };
    }

    case 'SET_NODE_MODE': {
      if (!action.id) return { ...state, nodeNamingMode: action.mode };
      const index = state.triangles.findIndex((node) => node.id === action.id);
      if (index < 0) return state;
      const template = nextTemplate(action.mode, state.triangles, index);
      return {
        ...state,
        nodeNamingMode: action.mode,
        triangles: state.triangles.map((node, i) =>
          i === index ? { ...node, template, label: templateLabel(template, node) } : node
        ),
        selection: { kind: 'triangles', ids: [action.id], naming: true },
      };
    }

    case 'SELECT_TRIANGLE': {
      const selection = state.selection;
      // An ordinary click after typing starts a fresh selection for connecting nodes.
      const current = selection.kind === 'triangles' && (!selection.naming || action.additive)
        ? selection.ids : [];
      let ids: string[];
      if (current.includes(action.id)) {
        ids = current.filter((id) => id !== action.id);
      } else if (action.additive || current.length < 2) {
        ids = [...current, action.id];
      } else {
        ids = [action.id];
      }
      return { ...state, selection: ids.length ? { kind: 'triangles', ids } : { kind: 'none' } };
    }

    case 'DELETE_TRIANGLES': {
      const removed = new Set(action.ids);
      return {
        ...state,
        triangles: state.triangles.filter((node) => !removed.has(node.id)),
        lines: state.lines.filter((edge) => !removed.has(edge.fromId) && !removed.has(edge.toId)),
        selection: { kind: 'none' },
      };
    }

    case 'UPDATE_TRIANGLE':
      return {
        ...state,
        triangles: state.triangles.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };

    case 'ADD_LINE':
      if (state.lines.some((line) => line.autoRoomConnection && sameEndpoints(line, action.payload.fromId, action.payload.toId))) return state;
      return { ...state, lines: [...state.lines, action.payload] };

    case 'DELETE_LINE': {
      const removed = state.lines.find((line) => line.id === action.id);
      if (!removed) return state;
      const from = state.triangles.find((node) => node.id === removed.fromId);
      const to = state.triangles.find((node) => node.id === removed.toId);
      const suppress = matchedRoomEndpoints(from, to) && !from?.skippedRoomPartnerIds?.includes(removed.toId);
      return {
        ...state,
        // Remember explicit removal so a matching room pair stays disconnected after reload.
        triangles: suppress ? state.triangles.map((node) => node === from
          ? { ...node, skippedRoomPartnerIds: [...(node.skippedRoomPartnerIds ?? []), removed.toId] }
          : node) : state.triangles,
        lines: state.lines.filter((line) => line.id !== action.id),
        selection: { kind: 'none' },
      };
    }

    case 'UPDATE_LINE':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload } : l
        ),
      };

    case 'SET_SELECTION':
      return { ...state, selection: action.selection };

    case 'UPDATE_META':
      return { ...state, meta: { ...state.meta, ...action.payload } };

    case 'CLEAR_SELECTION':
      return { ...state, selection: { kind: 'none' } };

    case 'LOAD_MAP':
      return {
        ...INITIAL_STATE,
        meta: { ...INITIAL_STATE.meta, ...(action.payload.meta ?? {}) },
        triangles: (action.payload.triangles ?? []).map(normalizeTriangle).filter(
          (triangle): triangle is SketchMapNode => triangle !== null,
        ),
        lines: (action.payload.lines ?? []).map(normalizeLine).filter(
          (line): line is SketchMapEdge => line !== null,
        ),
        selection: { kind: 'none' },
      };

    default:
      return state;
  }
}

function reducer(state: MapState, action: Action): MapState {
  const next = applyAction(state, action);
  if (action.type === 'LOAD_MAP' || action.type === 'DELETE_TRIANGLES' ||
      (action.type === 'SET_NODE_MODE' && action.id) ||
      (action.type === 'UPDATE_TRIANGLE' && action.payload.label !== undefined)) {
    return { ...next, lines: connectRoomPairs(next.triangles, next.lines) };
  }
  return next;
}

// ──────────────────────────────────────────────────────────────
// Public hook
// ──────────────────────────────────────────────────────────────

const INITIAL_STATE: MapState = {
  nodeNamingMode: 'room',
  meta: { mapName: 'ExampleMap', permResident: 120 },
  triangles: [],
  lines: [],
  selection: { kind: 'none' },
};

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (HTTP over LAN / IP address)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useMapStore() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // ── Triangle actions ──────────────────────────────────────

  const addTriangle = useCallback((x: number, y: number) => {
    const triangle = {
      id: uid(),
      x,
      y,
      color: '#4a90e2' as const,
      dslFields: createNodeDSLFields(),
    };
    dispatch({ type: 'ADD_TRIANGLE', payload: triangle });
  }, []);

  const setNodeNamingMode = useCallback((mode: NodeNamingMode, id?: string) => {
    dispatch({ type: 'SET_NODE_MODE', mode, id });
  }, []);

  const deleteTriangles = useCallback((ids: string[]) => {
    dispatch({ type: 'DELETE_TRIANGLES', ids });
  }, []);

  const updateTriangle = useCallback(
    (id: string, patch: { label?: string; color?: TriangleColor; x?: number; y?: number; dslFields?: DSLField[] }) => {
      dispatch({ type: 'UPDATE_TRIANGLE', payload: { id, ...patch } });
    },
    []
  );

  // ── Line actions ──────────────────────────────────────────

  const addLine = useCallback((fromId: string, toId: string) => {
    const line = createMapEdge(uid(), fromId, toId);
    dispatch({ type: 'ADD_LINE', payload: line });
  }, []);

  const deleteLine = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LINE', id });
  }, []);

  const updateLine = useCallback(
    (id: string, patch: { label?: string; style?: EdgeStyle; weight?: number; dslFields?: DSLField[]; constraint?: string }) => {
      dispatch({ type: 'UPDATE_LINE', payload: { id, ...patch } });
    },
    []
  );

  // ── Selection actions ─────────────────────────────────────

  const selectTriangle = useCallback((id: string, additive = false) => {
    dispatch({ type: 'SELECT_TRIANGLE', id, additive });
  }, []);

  const selectTriangles = useCallback((ids: string[]) => {
    dispatch({ type: 'SET_SELECTION', selection: ids.length ? { kind: 'triangles', ids } : { kind: 'none' } });
  }, []);

  const selectLine = useCallback((id: string) => {
    dispatch({ type: 'SET_SELECTION', selection: { kind: 'line', id } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const updateMeta = useCallback((patch: Partial<MapMeta>) => {
    dispatch({ type: 'UPDATE_META', payload: patch });
  }, []);

  const loadMap = useCallback(
    (payload: MapLoadPayload) => {
      dispatch({ type: 'LOAD_MAP', payload });
    },
    []
  );

  return {
    state,
    addTriangle,
    setNodeNamingMode,
    deleteTriangles,
    updateTriangle,
    addLine,
    deleteLine,
    updateLine,
    updateMeta,
    loadMap,
    selectTriangle,
    selectTriangles,
    selectLine,
    clearSelection,
  };
}

export type MapStore = ReturnType<typeof useMapStore>;
