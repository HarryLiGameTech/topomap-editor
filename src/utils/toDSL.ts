import type { MapState } from '../hooks/useMapStore';

/**
 * Converts the current map state into the topomap DSL text.
 */
export function convertToDSL(state: MapState): string {
  const { triangles, lines } = state;

  const fallback = (id: string) => `n_${id.replaceAll('-', '')}`;

  const labelOf = (id: string): string => {
    const node = triangles.find((t) => t.id === id);
    if (!node) return fallback(id);
    return node.label || fallback(node.id);
  };

  let dsl = 'topo-map ExampleMap(){\n';

  for (const node of triangles) {
    dsl += `  topo-node ${node.label || fallback(node.id)}\n`;
  }

  for (const edge of lines) {
    const from = labelOf(edge.fromId);
    const to   = labelOf(edge.toId);
    let line = `  atomic-path [${from} <-> ${to}] {cost = ${edge.cost}}`;
    if (edge.constraint) {
      line += ` requires ${edge.constraint}`;
    }
    dsl += line + '\n';
  }

  dsl += '}\n';

  return dsl;
}
