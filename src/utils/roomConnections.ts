import type { SketchMapEdge, SketchMapNode } from '../types';
import { createEdgeDSLFields } from './dslFields';

export function createMapEdge(id: string, fromId: string, toId: string): SketchMapEdge {
  return {
    id, fromId, toId, label: '', style: 'solid', weight: 2,
    dslFields: createEdgeDSLFields(0, id + '-cost'), constraint: '',
  };
}

export function sameEndpoints(edge: SketchMapEdge, fromId: string, toId: string): boolean {
  return (edge.fromId === fromId && edge.toId === toId) || (edge.fromId === toId && edge.toId === fromId);
}

function roomEndpoint(node: SketchMapNode) {
  if (node.template === 'staircaseOutside' || node.template === 'staircase' || node.template === 'elevator') return;
  const match = /^(.+)_(inside|outside)$/.exec(node.label.trim());
  if (match && match[1].trim()) return { name: match[1], side: match[2] as 'inside' | 'outside' };
}

export function matchedRoomEndpoints(a?: SketchMapNode, b?: SketchMapNode): boolean {
  if (!a || !b) return false;
  const left = roomEndpoint(a);
  const right = roomEndpoint(b);
  return !!left && !!right && left.name === right.name && left.side !== right.side;
}

// Existing manual edges keep all their properties. Each unambiguous room gets at most one auto edge.
export function connectRoomPairs(nodes: SketchMapNode[], lines: SketchMapEdge[]): SketchMapEdge[] {
  const rooms = new Map<string, { inside: SketchMapNode[]; outside: SketchMapNode[] }>();
  for (const node of nodes) {
    const end = roomEndpoint(node);
    if (!end) continue;
    let room = rooms.get(end.name);
    if (!room) {
      room = { inside: [], outside: [] };
      rooms.set(end.name, room);
    }
    room[end.side].push(node);
  }

  const partners = new Map<string, string>();
  for (const { inside, outside } of rooms.values()) {
    if (inside.length !== 1 || outside.length !== 1) continue;
    const [a] = inside;
    const [b] = outside;
    if (a.skippedRoomPartnerIds?.includes(b.id) || b.skippedRoomPartnerIds?.includes(a.id)) continue;
    partners.set(a.id, b.id);
  }

  const result: SketchMapEdge[] = [];
  const ids = new Set(lines.map((line) => line.id));
  // Process manual edges first so imported manual connections take precedence.
  for (const line of lines) {
    if (line.autoRoomConnection) continue;
    if (partners.get(line.fromId) === line.toId) partners.delete(line.fromId);
    if (partners.get(line.toId) === line.fromId) partners.delete(line.toId);
  }
  for (const line of lines) {
    if (line.autoRoomConnection) {
      if (partners.get(line.fromId) !== line.toId) continue;
      partners.delete(line.fromId);
    }
    result.push(line);
  }
  for (const [insideId, outsideId] of partners) {
    let id = 'room:' + JSON.stringify([insideId, outsideId]);
    while (ids.has(id)) id += '_';
    ids.add(id);
    result.push({ ...createMapEdge(id, insideId, outsideId), autoRoomConnection: true });
  }
  return result;
}
