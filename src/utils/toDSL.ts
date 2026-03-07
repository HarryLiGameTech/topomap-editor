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

  let dsl = 'topo-map ExampleMap(){\n   let params: {permResident: Int} = {\n       permResident = 120\n    }\n';

  for (const node of triangles) {
    const lbl = node.label || fallback(node.id);
    if (node.description) {
      dsl += `  topo-node ${lbl} {description = "${node.description}"}\n`;
    } else {
      dsl += `  topo-node ${lbl}\n`;
    }
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
