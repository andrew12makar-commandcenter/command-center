// Minimal Draft 2020-12 checker for brighton fact sheets.
// Supports the keywords used by fact-sheet.schema.json and nothing else.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function resolveRef(schema, root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Only local $ref is supported: ${ref}`);
  let node = root;
  for (const part of ref.slice(2).split('/')) {
    node = node[part];
    if (node === undefined) throw new Error(`Unresolvable $ref ${ref}`);
  }
  return node;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateFactSheet(data, schema) {
  const errors = [];
  check(data, schema, schema, '$', errors);
  return errors;
}

function check(data, schema, root, path, errors) {
  if (schema.$ref) {
    check(data, resolveRef(schema, root, schema.$ref), root, path, errors);
    return;
  }
  if (schema.anyOf) {
    const failures = schema.anyOf.map((option) => {
      const local = [];
      check(data, option, root, path, local);
      return local;
    });
    if (!failures.some((local) => local.length === 0)) {
      errors.push(`${path} did not match any allowed schema`);
    }
    return;
  }
  if (Object.prototype.hasOwnProperty.call(schema, 'const') && data !== schema.const) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path} must be one of ${schema.enum.join(', ')}`);
  }
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.includes(typeOf(data))) {
      errors.push(`${path} must be ${allowed.join(' or ')}`);
      return;
    }
  }
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path} is shorter than ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path} is longer than ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${path} does not match ${schema.pattern}`);
    }
    if (schema.format === 'uri' && !isHttpUrl(data)) {
      errors.push(`${path} must be an http(s) URL`);
    }
    if (schema.format === 'date' && !DATE.test(data)) {
      errors.push(`${path} must be a YYYY-MM-DD date`);
    }
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path} needs at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${path} has more than ${schema.maxItems} items`);
    }
    if (schema.items) {
      data.forEach((item, index) => check(item, schema.items, root, `${path}[${index}]`, errors));
    }
  }
  if (isObject(data) && schema.properties) {
    const allowed = new Set(Object.keys(schema.properties));
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed`);
      }
    }
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) errors.push(`${path}.${key} is required`);
    }
    for (const [key, child] of Object.entries(schema.properties)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        check(data[key], child, root, `${path}.${key}`, errors);
      }
    }
  }
}

export function factSheetContentErrors(sheet) {
  const errors = [];
  if (sheet.researchedOn !== '2026-11-11') {
    errors.push('researchedOn must be the access date 2026-11-11');
  }
  const walkSources = (sources, where) => {
    for (const source of sources || []) {
      if (source.accessed !== '2026-11-11') {
        errors.push(`${where} was accessed on ${source.accessed}, expected 2026-11-11`);
      }
    }
  };
  for (const field of ['category', 'address', 'phones', 'hours', 'publicDescriptions', 'attributes', 'publicRecords']) {
    for (const [index, item] of (sheet[field] || []).entries()) walkSources(item.sources, `${field}[${index}]`);
  }
  for (const [index, item] of (sheet.offerings || []).entries()) {
    walkSources(item.sources, `offerings[${index}]`);
    if (typeof item.publishedPrice === 'string') {
      const needle = item.publishedPrice.replace(/[^0-9a-z]+/gi, '').toLowerCase();
      const haystack = item.sources.map((source) => source.excerpt).join(' ').toLowerCase();
      const compact = haystack.replace(/[^0-9a-z]+/gi, '');
      if (!needle || !compact.includes(needle)) {
        errors.push(`offerings[${index}] price ${item.publishedPrice} is not in its source excerpt`);
      }
    }
  }
  for (const [index, item] of (sheet.conflicts || []).entries()) walkSources(item.sources, `conflicts[${index}]`);
  for (const item of sheet.profiles || []) {
    if (item.accessed !== '2026-11-11') errors.push(`profile ${item.url} has the wrong access date`);
  }
  for (const item of sheet.photos || []) {
    if (item.accessed !== '2026-11-11') errors.push(`photo ${item.pageUrl} has the wrong access date`);
    if (!/not downloaded/i.test(item.note)) errors.push(`photo note must say the file was not downloaded`);
  }
  for (const item of sheet.fetchAttempts || []) {
    if (item.accessed !== '2026-11-11') errors.push(`fetch attempt ${item.url} has the wrong access date`);
  }
  if (!(sheet.unknown || []).every((item) => item.includes('unknown / to confirm'))) {
    errors.push('every unknown entry must include "unknown / to confirm"');
  }
  if ((sheet.hours || []).length === 0 && !(sheet.unknown || []).some((item) => /hours/i.test(item))) {
    errors.push('missing hours must be named under unknown');
  }
  if ((sheet.offerings || []).length === 0 && !(sheet.unknown || []).some((item) => /service|product/i.test(item))) {
    errors.push('missing offerings must be named under unknown');
  }
  if ((sheet.category || []).length === 0 && !(sheet.unknown || []).some((item) => /category/i.test(item))) {
    errors.push('missing category must be named under unknown');
  }
  const rules = (sheet.generatorMustNot || []).join(' ');
  if (!/owner_approved/i.test(rules)) errors.push('generatorMustNot must keep owner_approved unset');
  if (!/price/i.test(rules)) errors.push('generatorMustNot must forbid invented prices');
  if (!/not downloaded|reference only/i.test(rules)) errors.push('generatorMustNot must keep photos reference-only');
  return errors;
}
