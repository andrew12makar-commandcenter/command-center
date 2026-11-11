import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { factSheetContentErrors, validateFactSheet } from './validate-fact-sheet.mjs';

const directory = new URL('.', import.meta.url).pathname;
const schema = JSON.parse(readFileSync(join(directory, 'fact-sheet.schema.json'), 'utf8'));
const expectedSlugs = [
  'johnny-ds-fruit-and-produce',
  'classic-barber-shop',
  'zisis-convenience-store',
  'ensueno-skin-care',
  'oliveira-deli-market',
  'outluks-hair-studio',
];

function loadSheets() {
  return expectedSlugs.map((slug) => {
    const jsonPath = join(directory, `${slug}.json`);
    const markdownPath = join(directory, `${slug}.md`);
    return {
      slug,
      jsonPath,
      markdownPath,
      sheet: JSON.parse(readFileSync(jsonPath, 'utf8')),
      markdown: readFileSync(markdownPath, 'utf8'),
    };
  });
}

function sourceUrls(sheet) {
  const urls = [];
  const take = (sources) => {
    for (const source of sources || []) urls.push(source.url);
  };
  for (const field of ['category', 'address', 'phones', 'hours', 'publicDescriptions', 'attributes', 'publicRecords']) {
    for (const item of sheet[field] || []) take(item.sources);
  }
  for (const item of sheet.offerings || []) take(item.sources);
  for (const item of sheet.conflicts || []) take(item.sources);
  return urls;
}

test('the six Brighton fact sheets match the schema and cite the access date', () => {
  const names = readdirSync(directory).filter((name) => name.endsWith('.json') && name !== 'fact-sheet.schema.json');
  assert.deepEqual(names.sort(), expectedSlugs.map((slug) => `${slug}.json`).sort());
  for (const { slug, sheet, markdown } of loadSheets()) {
    const schemaErrors = validateFactSheet(sheet, schema);
    const contentErrors = factSheetContentErrors(sheet);
    assert.deepEqual(schemaErrors, [], `${slug} schema: ${schemaErrors.join('; ')}`);
    assert.deepEqual(contentErrors, [], `${slug} content: ${contentErrors.join('; ')}`);
    assert.equal(sheet.slug, slug);
    assert.equal(sheet.schemaVersion, 'brighton-public-fact-sheet/v1');
    assert.match(markdown, new RegExp(sheet.businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(markdown, /Accessed 2026-11-11/);
    assert.match(markdown, /unknown \/ to confirm/);
    for (const url of sourceUrls(sheet)) {
      assert.ok(markdown.includes(url), `${slug} markdown is missing ${url}`);
    }
    assert.equal(Object.hasOwn(sheet, 'owner_approved'), false);
  }
});

test('fact-sheet files do not include downloaded images', () => {
  const banned = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);
  for (const name of readdirSync(directory)) {
    const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
    assert.equal(banned.has(extension), false, name);
    assert.equal(statSync(join(directory, name)).isFile(), true);
  }
});

test('a sheet that invents a price or adds a field fails validation', () => {
  const { sheet } = loadSheets()[0];
  const extra = { ...sheet, owner_approved: true };
  assert.ok(validateFactSheet(extra, schema).some((error) => error.includes('owner_approved')));

  const priced = structuredClone(sheet);
  priced.offerings.push({
    name: 'Invented basket',
    detail: null,
    publishedPrice: '12 USD',
    sources: [{ url: 'https://example.com/source', accessed: '2026-11-11', excerpt: 'The page does not mention this price.' }],
  });
  assert.equal(validateFactSheet(priced, schema).length, 0);
  assert.ok(factSheetContentErrors(priced).some((error) => error.includes('price')));

  const unsourced = structuredClone(sheet);
  unsourced.hours.push({ value: 'Always open', sources: [] });
  assert.ok(validateFactSheet(unsourced, schema).some((error) => error.includes('sources')));
});
