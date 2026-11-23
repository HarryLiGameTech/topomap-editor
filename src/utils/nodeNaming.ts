import type { NodeNamingMode, NodeTemplate, SketchMapNode } from '../types';

const templates = {
  inside:    { prefix: '',          suffix: '_inside' },
  outside:   { prefix: '',          suffix: '_outside' },
  elevator:  { prefix: 'elevator_', suffix: '_landing' },
  staircase: { prefix: 'staircase_', suffix: '_landing' },
  staircaseOutside: { prefix: 'staircase_', suffix: '_outside' },
  custom:    { prefix: '',          suffix: '' },
} satisfies Record<NodeTemplate, { prefix: string; suffix: string }>;

export function readNodeTemplate(value: unknown, label: string): NodeTemplate {
  // Earlier editors stored both staircase labels as "staircase", or inferred "outside".
  if ((value === 'staircase' || value === 'outside') && label.startsWith('staircase_') && label.endsWith('_outside')) {
    return 'staircaseOutside';
  }
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(templates, value)) {
    return value as NodeTemplate;
  }
  // Maps saved before templates existed still carry the original label.
  for (const key of ['staircaseOutside', 'staircase', 'elevator', 'inside', 'outside'] as const) {
    const { prefix, suffix } = templates[key];
    if (label.startsWith(prefix) && label.endsWith(suffix)) return key;
  }
  return 'custom';
}

export function namingMode(template: NodeTemplate): NodeNamingMode {
  if (template === 'staircaseOutside') return 'staircase';
  return template === 'inside' || template === 'outside' ? 'room' : template;
}

export function nextTemplate(mode: NodeNamingMode, nodes: SketchMapNode[], end = nodes.length): NodeTemplate {
  if (mode !== 'room' && mode !== 'staircase') return mode;
  const first = mode === 'room' ? 'inside' : 'staircase';
  const second = mode === 'room' ? 'outside' : 'staircaseOutside';
  for (let i = end - 1; i >= 0; i--) {
    if (nodes[i].template === first) return second;
    if (nodes[i].template === second) return first;
  }
  return first;
}

export function templateLabel(template: NodeTemplate, previous?: SketchMapNode): string {
  if (template === 'custom') return '';
  let name = previous?.label ?? '';
  if (previous) {
    const old = templates[previous.template];
    if (name.startsWith(old.prefix) && name.endsWith(old.suffix)) {
      name = name.slice(old.prefix.length, name.length - old.suffix.length);
    }
  }
  const { prefix, suffix } = templates[template];
  return prefix + name + suffix;
}

export function nameCaret(template: NodeTemplate): number {
  return templates[template].prefix.length;
}
