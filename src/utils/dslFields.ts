import type { DSLField, DSLFieldType } from '../types';

export const DSL_FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function fieldId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function isValidDSLFieldName(name: string): boolean {
  return DSL_FIELD_NAME_PATTERN.test(name);
}

export function createDSLField(
  name: string,
  type: 'string',
  id?: string,
): Extract<DSLField, { type: 'string' }>;
export function createDSLField(
  name: string,
  type: 'number',
  id?: string,
): Extract<DSLField, { type: 'number' }>;
export function createDSLField(
  name: string,
  type: 'boolean',
  id?: string,
): Extract<DSLField, { type: 'boolean' }>;
export function createDSLField(
  name: string,
  type: 'string-list',
  id?: string,
): Extract<DSLField, { type: 'string-list' }>;
export function createDSLField(
  name: string,
  type: 'number-list',
  id?: string,
): Extract<DSLField, { type: 'number-list' }>;
export function createDSLField(
  name: string,
  type: 'boolean-list',
  id?: string,
): Extract<DSLField, { type: 'boolean-list' }>;
export function createDSLField(
  name: string,
  type: DSLFieldType,
  id?: string,
): DSLField;
export function createDSLField(
  name: string,
  type: DSLFieldType,
  id = fieldId(),
): DSLField {
  switch (type) {
    case 'string':
      return { id, name, type, value: '' };
    case 'number':
      return { id, name, type, value: 0 };
    case 'boolean':
      return { id, name, type, value: false };
    case 'string-list':
      return { id, name, type, value: [] };
    case 'number-list':
      return { id, name, type, value: [] };
    case 'boolean-list':
      return { id, name, type, value: [] };
  }
}

export function createNodeDSLFields(description = ''): DSLField[] {
  return [
    { ...createDSLField('displayName', 'string'), value: '' },
    { ...createDSLField('shopName', 'string'), value: '' },
    { ...createDSLField('description', 'string'), value: description },
    { ...createDSLField('tags', 'string-list'), value: [] },
  ];
}

export function createEdgeDSLFields(cost = 0): DSLField[] {
  return [{ ...createDSLField('cost', 'number'), value: cost }];
}

function normalizeField(value: unknown): DSLField | null {
  if (value === null || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const name = candidate.name;
  const type = candidate.type;
  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : fieldId();

  if (typeof name !== 'string' || !isValidDSLFieldName(name)) return null;

  switch (type) {
    case 'string':
      return { id, name, type, value: typeof candidate.value === 'string' ? candidate.value : '' };
    case 'number':
      return {
        id,
        name,
        type,
        value: typeof candidate.value === 'number' && Number.isFinite(candidate.value)
          ? candidate.value
          : 0,
      };
    case 'boolean':
      return { id, name, type, value: candidate.value === true };
    case 'string-list':
      return {
        id,
        name,
        type,
        value: Array.isArray(candidate.value)
          ? candidate.value.filter((item): item is string => typeof item === 'string')
          : [],
      };
    case 'number-list':
      return {
        id,
        name,
        type,
        value: Array.isArray(candidate.value)
          ? candidate.value.filter(
              (item): item is number => typeof item === 'number' && Number.isFinite(item),
            )
          : [],
      };
    case 'boolean-list':
      return {
        id,
        name,
        type,
        value: Array.isArray(candidate.value)
          ? candidate.value.filter((item): item is boolean => typeof item === 'boolean')
          : [],
      };
    default:
      return null;
  }
}

export function normalizeDSLFields(value: unknown): DSLField[] {
  if (!Array.isArray(value)) return [];

  const names = new Set<string>();
  const result: DSLField[] = [];
  for (const candidate of value) {
    const field = normalizeField(candidate);
    if (!field || names.has(field.name)) continue;
    names.add(field.name);
    result.push(field);
  }
  return result;
}

function withMissingDefaults(fields: DSLField[], defaults: DSLField[]): DSLField[] {
  const names = new Set(fields.map((field) => field.name));
  return [...fields, ...defaults.filter((field) => !names.has(field.name))];
}

export function normalizeNodeDSLFields(value: unknown, legacyDescription = ''): DSLField[] {
  // The presence of an array marks the new schema. Preserve intentional
  // deletions of default node fields when a new-schema map is loaded again.
  if (Array.isArray(value)) return normalizeDSLFields(value);
  return withMissingDefaults([], createNodeDSLFields(legacyDescription));
}

export function normalizeEdgeDSLFields(value: unknown, legacyCost = 0): DSLField[] {
  const normalized = normalizeDSLFields(value);
  const fields = normalized.filter((field) => field.name !== 'cost');
  const existingCost = normalized.find(
    (field): field is Extract<DSLField, { type: 'number' }> =>
      field.name === 'cost' && field.type === 'number',
  );
  return [existingCost ?? createEdgeDSLFields(legacyCost)[0], ...fields];
}

export function nextDSLFieldName(fields: DSLField[], base = 'field'): string {
  const names = new Set(fields.map((field) => field.name));
  if (!names.has(base)) return base;
  let suffix = 2;
  while (names.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export function getNumberDSLField(fields: DSLField[], name: string): number | undefined {
  const field = fields.find((candidate) => candidate.name === name);
  return field?.type === 'number' ? field.value : undefined;
}

export function validateDSLFields(fields: DSLField[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const field of fields) {
    if (!isValidDSLFieldName(field.name)) {
      errors.push(`Invalid DSL field name "${field.name}".`);
    } else if (names.has(field.name)) {
      errors.push(`Duplicate DSL field name "${field.name}".`);
    }
    names.add(field.name);

    if (field.type === 'number' && !Number.isFinite(field.value)) {
      errors.push(`Field "${field.name}" must be a finite number.`);
    }
    if (field.type === 'number-list' && field.value.some((item) => !Number.isFinite(item))) {
      errors.push(`Field "${field.name}" must contain only finite numbers.`);
    }
  }

  return errors;
}
