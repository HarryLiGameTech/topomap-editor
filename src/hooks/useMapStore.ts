import { useReducer, useCallback } from 'react';
import type { SketchMapNode, SketchMapEdge, Selection, TriangleColor, EdgeStyle } from '../types';

// ──────────────────────────────────────────────────────────────
// State & Action types
// ──────────────────────────────────────────────────────────────

export interface MapState {
  triangles: SketchMapNode[];
  lines: SketchMapEdge[];
  selection: Selection;
}

type Action =
  | { type: 'ADD_TRIANGLE'; payload: SketchMapNode }
  | { type: 'DELETE_TRIANGLE'; id: string }
  | { type: 'UPDATE_TRIANGLE'; payload: Partial<SketchMapNode> & { id: string } }
  | { type: 'ADD_LINE'; payload: SketchMapEdge }
  | { type: 'DELETE_LINE'; id: string }
  | { type: 'UPDATE_LINE'; payload: Partial<SketchMapEdge> & { id: string } }
  | { type: 'SET_SELECTION'; selection: Selection }
  | { type: 'CLEAR_SELECTION' };

// ──────────────────────────────────────────────────────────────
// Reducer
// ──────────────────────────────────────────────────────────────

function reducer(state: MapState, action: Action): MapState {
  switch (action.type) {
    case 'ADD_TRIANGLE':
      return { ...state, triangles: [...state.triangles, action.payload] };

    case 'DELETE_TRIANGLE':
      return {
        ...state,
        triangles: state.triangles.filter((t) => t.id !== action.id),
        // Remove any edge that references the deleted triangle
        lines: state.lines.filter(
          (l) => l.fromId !== action.id && l.toId !== action.id
        ),
        selection: { kind: 'none' },
      };

    case 'UPDATE_TRIANGLE':
      return {
        ...state,
        triangles: state.triangles.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };

    case 'ADD_LINE':
      return { ...state, lines: [...state.lines, action.payload] };

    case 'DELETE_LINE':
      return {
        ...state,
        lines: state.lines.filter((l) => l.id !== action.id),
        selection: { kind: 'none' },
      };

    case 'UPDATE_LINE':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload } : l
        ),
      };

    case 'SET_SELECTION':
      return { ...state, selection: action.selection };

    case 'CLEAR_SELECTION':
      return { ...state, selection: { kind: 'none' } };

    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────────
// Public hook
// ──────────────────────────────────────────────────────────────

const INITIAL_STATE: MapState = {
  triangles: [],
  lines: [],
  selection: { kind: 'none' },
};

function uid(): string {
  return crypto.randomUUID();
}

export function useMapStore() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // ── Triangle actions ──────────────────────────────────────

  const addTriangle = useCallback((x: number, y: number) => {
    const triangle: SketchMapNode = {
      id: uid(),
      x,
      y,
      label: '',
      color: '#4a90e2',
      description: '',
    };
    dispatch({ type: 'ADD_TRIANGLE', payload: triangle });
  }, []);

  const deleteTriangle = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRIANGLE', id });
  }, []);

  const updateTriangle = useCallback(
    (id: string, patch: { label?: string; color?: TriangleColor; x?: number; y?: number; description?: string }) => {
      dispatch({ type: 'UPDATE_TRIANGLE', payload: { id, ...patch } });
    },
    []
  );

  // ── Line actions ──────────────────────────────────────────

  const addLine = useCallback((fromId: string, toId: string) => {
    const line: SketchMapEdge = {
      id: uid(),
      fromId,
      toId,
      label: '',
      style: 'solid',
      weight: 2,
      cost: 0,
    };
    dispatch({ type: 'ADD_LINE', payload: line });
  }, []);

  const deleteLine = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LINE', id });
  }, []);

  const updateLine = useCallback(
    (id: string, patch: { label?: string; style?: EdgeStyle; weight?: number; cost?: number }) => {
      dispatch({ type: 'UPDATE_LINE', payload: { id, ...patch } });
    },
    []
  );

  // ── Selection actions ─────────────────────────────────────

  const selectTriangle = useCallback(
    (id: string) => {
      const current = state.selection;

      if (current.kind === 'triangles') {
        if (current.ids.includes(id)) {
          // Deselect this triangle
          const next = current.ids.filter((i) => i !== id);
          dispatch({
            type: 'SET_SELECTION',
            selection: next.length === 0 ? { kind: 'none' } : { kind: 'triangles', ids: next },
          });
        } else if (current.ids.length < 2) {
          // Add to selection (max 2 for edge creation)
          dispatch({
            type: 'SET_SELECTION',
            selection: { kind: 'triangles', ids: [...current.ids, id] },
          });
        } else {
          // Already 2 selected → replace selection with just this triangle
          dispatch({
            type: 'SET_SELECTION',
            selection: { kind: 'triangles', ids: [id] },
          });
        }
      } else {
        dispatch({
          type: 'SET_SELECTION',
          selection: { kind: 'triangles', ids: [id] },
        });
      }
    },
    [state.selection]
  );

  const selectLine = useCallback((id: string) => {
    dispatch({ type: 'SET_SELECTION', selection: { kind: 'line', id } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  return {
    state,
    addTriangle,
    deleteTriangle,
    updateTriangle,
    addLine,
    deleteLine,
    updateLine,
    selectTriangle,
    selectLine,
    clearSelection,
  };
}

export type MapStore = ReturnType<typeof useMapStore>;
