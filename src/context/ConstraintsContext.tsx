import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

interface ConstraintsCtx {
  constraints: string[];
  loading: boolean;
  error: string | null;
}

const ConstraintsContext = createContext<ConstraintsCtx>({
  constraints: [],
  loading: false,
  error: null,
});

// ──────────────────────────────────────────────────────────────
// Provider  (fetches once on mount)
// ──────────────────────────────────────────────────────────────

// Change this URL to wherever your constraints list is served from.
const CONSTRAINTS_URL = '/api/constraints';

export function ConstraintsProvider({ children }: { children: ReactNode }) {
  const [constraints, setConstraints] = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(CONSTRAINTS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<string[]>;
      })
      .then((data) => {
        if (!cancelled) setConstraints(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.warn('[ConstraintsProvider] Could not fetch constraints:', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <ConstraintsContext.Provider value={{ constraints, loading, error }}>
      {children}
    </ConstraintsContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useConstraints(): ConstraintsCtx {
  return useContext(ConstraintsContext);
}
