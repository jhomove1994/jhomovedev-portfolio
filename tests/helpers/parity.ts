import type { ZodObject, ZodRawShape } from 'astro/zod';

// Shape values are core Zod types (not the classic ZodType wrapper).
type ZodType = ZodRawShape[string];

export type SchemaRegistry = Record<string, ZodObject<ZodRawShape>>;

// Loosely typed on purpose: the parsed YAML is untrusted input to the guard.
export type AdminConfig = Record<string, unknown>;

type ConfigNode = Record<string, unknown>;

type SchemaKind = 'object' | 'array' | 'enum' | 'string' | 'number' | 'boolean' | 'other';

interface SchemaField {
  kind: SchemaKind;
  optional: boolean;
  shape?: ZodRawShape;
  element?: ZodType;
  options?: string[];
}

// Zod 4 exposes its structure through `_zod.def`; the guard only needs a handful of node types.
interface ZodDef {
  type: string;
  innerType?: ZodType;
  in?: ZodType;
  out?: ZodType;
  element?: ZodType;
  entries?: Record<string, string>;
}

const defOf = (schema: ZodType): ZodDef =>
  (schema as unknown as { _zod: { def: ZodDef } })._zod.def;

/** Unwraps optional/default/preprocess wrappers, remembering whether the field may be omitted. */
function describeSchema(schema: ZodType): SchemaField {
  let current = schema;
  let optional = false;
  for (;;) {
    const def = defOf(current);
    if (def.type === 'optional' || def.type === 'default' || def.type === 'prefault') {
      optional = true;
      current = def.innerType as ZodType;
    } else if (def.type === 'nullable' || def.type === 'readonly') {
      current = def.innerType as ZodType;
    } else if (def.type === 'pipe') {
      current = def.out as ZodType;
    } else {
      break;
    }
  }

  const def = defOf(current);
  switch (def.type) {
    case 'object':
      return { kind: 'object', optional, shape: (current as ZodObject<ZodRawShape>).shape };
    case 'array':
      return { kind: 'array', optional, element: def.element };
    case 'enum':
      return { kind: 'enum', optional, options: Object.values(def.entries ?? {}) };
    case 'string':
    case 'number':
    case 'boolean':
      return { kind: def.type, optional };
    default:
      return { kind: 'other', optional };
  }
}

const SCALAR_WIDGETS: Record<'string' | 'number' | 'boolean', string[]> = {
  string: ['string', 'text', 'markdown', 'image', 'file', 'hidden', 'datetime'],
  number: ['number'],
  boolean: ['boolean'],
};

const asNodes = (value: unknown): ConfigNode[] =>
  Array.isArray(value) ? (value as ConfigNode[]) : [];

const optionValues = (options: unknown): string[] =>
  (Array.isArray(options) ? options : []).map((option) =>
    typeof option === 'object' && option !== null
      ? String((option as ConfigNode).value)
      : String(option),
  );

function compareWidget(path: string, schema: SchemaField, node: ConfigNode): string[] {
  const widget = String(node.widget ?? 'string');
  const issues: string[] = [];

  if (schema.kind === 'object' && widget !== 'object') {
    issues.push(`${path}: schema is an object but config widget is "${widget}"`);
  } else if (schema.kind === 'array' && !['list', 'relation', 'select'].includes(widget)) {
    issues.push(`${path}: schema is an array but config widget is "${widget}"`);
  } else if (schema.kind === 'enum') {
    if (widget !== 'select') {
      issues.push(`${path}: schema is an enum but config widget is "${widget}"`);
    } else {
      const expected = [...(schema.options ?? [])].sort();
      const actual = optionValues(node.options).sort();
      if (expected.join('|') !== actual.join('|')) {
        issues.push(
          `${path}: select options [${actual.join(', ')}] differ from enum [${expected.join(', ')}]`,
        );
      }
    }
  } else if (
    (schema.kind === 'string' || schema.kind === 'number' || schema.kind === 'boolean') &&
    !SCALAR_WIDGETS[schema.kind].includes(widget)
  ) {
    issues.push(`${path}: schema is ${schema.kind} but config widget is "${widget}"`);
  }
  return issues;
}

function compareFields(path: string, shape: ZodRawShape, fields: ConfigNode[]): string[] {
  const issues: string[] = [];
  const byName = new Map(fields.map((field) => [String(field.name), field]));

  for (const name of Object.keys(shape)) {
    if (!byName.has(name)) {
      issues.push(`${path}.${name}: field exists in the schema but not in the config`);
    }
  }
  for (const [name, node] of byName) {
    const schemaField = name in shape ? describeSchema(shape[name]) : undefined;
    const fieldPath = `${path}.${name}`;
    if (!schemaField) {
      issues.push(`${fieldPath}: field exists in the config but not in the schema`);
      continue;
    }

    const configOptional = node.required === false;
    if (configOptional !== schemaField.optional) {
      issues.push(
        `${fieldPath}: schema is ${schemaField.optional ? 'optional/default' : 'required'} ` +
          `but config has required: ${String(node.required ?? true)}`,
      );
    }
    issues.push(...compareWidget(fieldPath, schemaField, node));

    if (schemaField.kind === 'object' && schemaField.shape) {
      issues.push(...compareFields(fieldPath, schemaField.shape, asNodes(node.fields)));
    } else if (schemaField.kind === 'array' && schemaField.element) {
      const element = describeSchema(schemaField.element);
      if (element.kind === 'object' && element.shape) {
        issues.push(...compareFields(fieldPath, element.shape, asNodes(node.fields)));
      }
    }
  }
  return issues;
}

function checkI18nModes(path: string, fields: ConfigNode[]): string[] {
  return fields
    .filter((field) => field.i18n !== true && field.i18n !== 'duplicate')
    .map(
      (field) =>
        `${path}.${String(field.name)}: field in an i18n collection must declare ` +
        `i18n: true or duplicate (found ${String(field.i18n)})`,
    );
}

/** Returns human-readable drift issues between the Zod registry and the Sveltia config. */
export function compareSchemaToConfig(registry: SchemaRegistry, config: AdminConfig): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  const compareCollection = (key: string, node: ConfigNode, isI18n: boolean): void => {
    seen.add(key);
    const schema = registry[key];
    if (!schema) {
      issues.push(`${key}: config collection has no schema in the registry`);
      return;
    }
    const fields = asNodes(node.fields);
    issues.push(...compareFields(key, schema.shape, fields));
    if (isI18n) issues.push(...checkI18nModes(key, fields));
  };

  for (const collection of asNodes(config.collections)) {
    const collectionI18n = Boolean(collection.i18n);
    if (Array.isArray(collection.files)) {
      for (const file of asNodes(collection.files)) {
        compareCollection(String(file.name), file, collectionI18n || Boolean(file.i18n));
      }
    } else {
      compareCollection(String(collection.name), collection, collectionI18n);
    }
  }

  for (const key of Object.keys(registry)) {
    if (!seen.has(key)) issues.push(`${key}: schema has no collection in the config`);
  }
  return issues;
}
