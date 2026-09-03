import type { MapState } from '../hooks/useMapStore';
import type { DSLField } from '../types';
import { validateDSLFields } from './dslFields';

function escapeDSLString(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n');
}

function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error('DSL numbers must be finite.');
  const plain = String(value);
  if (!/[eE]/.test(plain)) return plain;
  return value.toLocaleString('en-US', {
    useGrouping: false,
    maximumSignificantDigits: 21,
  });
}

function serializeFieldValue(field: DSLField): string | null {
  switch (field.type) {
    case 'string':
      return `"${escapeDSLString(field.value)}"`;
    case 'number':
      return serializeNumber(field.value);
    case 'boolean':
      return String(field.value);
    case 'string-list':
      if (field.value.length === 0) return null;
      return `[${field.value.map((item) => `"${escapeDSLString(item)}"`).join(', ')}]`;
    case 'number-list':
      if (field.value.length === 0) return null;
      return `[${field.value.map(serializeNumber).join(', ')}]`;
    case 'boolean-list':
      if (field.value.length === 0) return null;
      return `[${field.value.map(String).join(', ')}]`;
  }
}

function serializeFields(fields: DSLField[], owner: string): string {
  const errors = validateDSLFields(fields);
  if (errors.length > 0) {
    throw new Error(`${owner}: ${errors.join(' ')}`);
  }

  return fields.flatMap((field) => {
    const value = serializeFieldValue(field);
    return value === null ? [] : [`${field.name} = ${value}`];
  }).join(', ');
}

/**
 * Converts the current map state into the topomap DSL text.
 */
export function convertToDSL(state: MapState): string {
  const { meta, triangles, lines } = state;
  const { mapName, permResident } = meta;

  const fallback = (id: string) => `n_${id.replaceAll('-', '')}`;

  const labelOf = (id: string): string => {
    const node = triangles.find((t) => t.id === id);
    if (!node) return fallback(id);
    return node.label || fallback(node.id);
  };

  let dsl = `topo-map ${mapName}(){\n   let params: {permResident: Int} = {\n       permResident = ${permResident}\n    }\n`;

  for (const node of triangles) {
    const lbl = node.label || fallback(node.id);
    const fields = serializeFields(node.dslFields, `Node ${lbl}`);
    dsl += `  topo-node ${lbl}${fields ? ` {${fields}}` : ''}\n`;
  }

  for (const edge of lines) {
    const from = labelOf(edge.fromId);
    const to   = labelOf(edge.toId);
    const cost = edge.dslFields.find((field) => field.name === 'cost');
    if (!cost || cost.type !== 'number') {
      throw new Error(`Edge ${from} → ${to} must have a numeric cost field.`);
    }
    if (cost.value < 0) {
      throw new Error(`Edge ${from} → ${to} must have a non-negative cost.`);
    }
    const fields = serializeFields(edge.dslFields, `Edge ${from} → ${to}`);
    let line = `  atomic-path [${from} <-> ${to}] {${fields}}`;
    if (edge.constraint) {
      line += ` requires ${edge.constraint}`;
    }
    dsl += line + '\n';
  }

  dsl += '}\n';

  return dsl;
}
