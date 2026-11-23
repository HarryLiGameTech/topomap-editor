import type { DSLField, DSLFieldType } from '../types';
import {
  createDSLField,
  isValidDSLFieldName,
  nextDSLFieldName,
} from '../utils/dslFields';

interface Props {
  fields: DSLField[];
  onChange: (fields: DSLField[]) => void;
  lockedFieldNames?: string[];
}

const FIELD_TYPES: Array<{ type: DSLFieldType; label: string }> = [
  { type: 'string', label: 'String' },
  { type: 'number', label: 'Number' },
  { type: 'boolean', label: 'Bool' },
  { type: 'string-list', label: 'List[String]' },
  { type: 'number-list', label: 'List[Number]' },
  { type: 'boolean-list', label: 'List[Bool]' },
];

function FieldValueEditor({
  field,
  onChange,
  minimum,
}: {
  field: DSLField;
  onChange: (field: DSLField) => void;
  minimum?: number;
}) {
  if (field.type === 'string') {
    return (
      <input
        className="field-input"
        type="text"
        value={field.value}
        onChange={(event) => onChange({ ...field, value: event.target.value })}
        placeholder="String value"
        aria-label={`Value of ${field.name}`}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        className="field-input"
        type="number"
        step="any"
        min={minimum}
        value={field.value}
        onChange={(event) => onChange({
          ...field,
          value: Math.max(minimum ?? -Infinity, Number(event.target.value)),
        })}
        aria-label={`Value of ${field.name}`}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <select
        className="field-select"
        value={String(field.value)}
        onChange={(event) => onChange({ ...field, value: event.target.value === 'true' })}
        aria-label={`Value of ${field.name}`}
      >
        <option value="false">false</option>
        <option value="true">true</option>
      </select>
    );
  }

  const addItem = () => {
    if (field.type === 'string-list') onChange({ ...field, value: [...field.value, ''] });
    if (field.type === 'number-list') onChange({ ...field, value: [...field.value, 0] });
    if (field.type === 'boolean-list') onChange({ ...field, value: [...field.value, false] });
  };

  const removeItem = (index: number) => {
    if (field.type === 'string-list') {
      onChange({ ...field, value: field.value.filter((_, itemIndex) => itemIndex !== index) });
    }
    if (field.type === 'number-list') {
      onChange({ ...field, value: field.value.filter((_, itemIndex) => itemIndex !== index) });
    }
    if (field.type === 'boolean-list') {
      onChange({ ...field, value: field.value.filter((_, itemIndex) => itemIndex !== index) });
    }
  };

  return (
    <div className="dsl-list-editor">
      {field.value.length === 0 && <span className="dsl-list-empty">Empty list</span>}
      {field.value.map((value, index) => (
        <div className="dsl-list-item" key={index}>
          {field.type === 'string-list' && (
            <input
              className="field-input"
              type="text"
              value={value as string}
              onChange={(event) => {
                const next = [...field.value];
                next[index] = event.target.value;
                onChange({ ...field, value: next });
              }}
              placeholder={`Item ${index + 1}`}
              aria-label={`${field.name} item ${index + 1}`}
            />
          )}
          {field.type === 'number-list' && (
            <input
              className="field-input"
              type="number"
              step="any"
              value={value as number}
              onChange={(event) => {
                const next = [...field.value];
                next[index] = Number(event.target.value);
                onChange({ ...field, value: next });
              }}
              aria-label={`${field.name} item ${index + 1}`}
            />
          )}
          {field.type === 'boolean-list' && (
            <select
              className="field-select"
              value={String(value)}
              onChange={(event) => {
                const next = [...field.value];
                next[index] = event.target.value === 'true';
                onChange({ ...field, value: next });
              }}
              aria-label={`${field.name} item ${index + 1}`}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          )}
          <button
            className="btn-icon-danger"
            type="button"
            onClick={() => removeItem(index)}
            title="Remove list item"
            aria-label={`Remove item ${index + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="btn btn-field-action"
        type="button"
        onClick={addItem}
        aria-label={`Add item to ${field.name}`}
      >
        + Add list item
      </button>
    </div>
  );
}

export function DSLFieldsEditor({ fields, onChange, lockedFieldNames = [] }: Props) {
  const replaceField = (nextField: DSLField) => {
    onChange(fields.map((field) => field.id === nextField.id ? nextField : field));
  };

  const renameField = (field: DSLField, name: string) => {
    const isDuplicate = fields.some(
      (candidate) => candidate.id !== field.id && candidate.name === name,
    );
    if (!isValidDSLFieldName(name) || isDuplicate) return;
    replaceField({ ...field, name });
  };

  const changeFieldType = (field: DSLField, type: DSLFieldType) => {
    replaceField(createDSLField(field.name, type, field.id));
  };

  const removeField = (fieldId: string) => {
    onChange(fields.filter((field) => field.id !== fieldId));
  };

  const addField = () => {
    const name = nextDSLFieldName(fields);
    onChange([...fields, createDSLField(name, 'string')]);
  };

  return (
    <div className="dsl-fields-editor">
      <div className="dsl-fields-header">
        <span className="field-label">DSL Fields</span>
        <button className="btn btn-field-add" type="button" onClick={addField}>
          + Add field
        </button>
      </div>

      {fields.length === 0 && (
        <p className="field-meta">No DSL fields. Add one to include an attribute.</p>
      )}

      {fields.map((field) => {
        const locked = lockedFieldNames.includes(field.name);
        return (
          <section className="dsl-field-card" key={field.id}>
            <div className="dsl-field-definition">
              <input
                className="field-input dsl-field-name"
                type="text"
                value={field.name}
                pattern="[A-Za-z_][A-Za-z0-9_]*"
                disabled={locked}
                onChange={(event) => renameField(field, event.target.value)}
                title="Use a DSL identifier: letters, digits, and underscores; do not start with a digit."
                aria-label={`DSL field name for ${field.name}`}
              />
              <select
                className="field-select dsl-field-type"
                value={field.type}
                disabled={locked}
                onChange={(event) => changeFieldType(field, event.target.value as DSLFieldType)}
                aria-label={`Type of ${field.name}`}
              >
                {FIELD_TYPES.map(({ type, label }) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
              {!locked && (
                <button
                  className="btn-icon-danger"
                  type="button"
                  onClick={() => removeField(field.id)}
                  title={`Remove ${field.name}`}
                  aria-label={`Remove ${field.name}`}
                >
                  ×
                </button>
              )}
            </div>
            <FieldValueEditor
              field={field}
              onChange={replaceField}
              minimum={locked && field.name === 'cost' ? 0 : undefined}
            />
          </section>
        );
      })}
    </div>
  );
}
