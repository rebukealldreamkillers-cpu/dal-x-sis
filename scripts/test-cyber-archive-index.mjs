import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { breakingStoryKey, indexReport, matchesReport } from '../src/components/cyber-archive-index.js';

const archive = JSON.parse(readFileSync(new URL('../public/cybersecurity-data/archive-snapshot.json', import.meta.url), 'utf8'));
const canonical = archive.items.find((row) => row.url === 'https://therecord.media/fbi-cyberattack-data-breach');
const search = (row, query) => matchesReport(indexReport(row, `${row.title} ${row.source} ${row.entity ?? ''} ${row.note ?? ''}`), query);

test('all NCIC spellings find one November 23 breaking report in the saved archive', () => {
  for (const query of ['NCIC', 'FBI NCIC', 'National Crime Information Center', 'F.B.I. N.C.I.C.']) {
    assert.deepEqual(archive.items.filter((row) => search(row, query)), [canonical]);
    assert.equal(canonical.date.slice(0, 10), '2026-11-23');
    assert.equal(canonical.kind, 'news');
  }
});

test('direct, syndicated, and abbreviated reports in the same news cycle share a key', () => {
  const key = breakingStoryKey(canonical);
  assert.ok(key);
  for (const title of ['FBI reportedly hacked again, this time targeting nationwide police database', 'FBI investigating NCIC incident']) {
    assert.equal(breakingStoryKey({ ...canonical, title, date: '2026-11-21' }), key);
  }
  assert.equal(breakingStoryKey({ ...canonical, title: 'FBI jobs portal attacked' }), '');
  assert.equal(breakingStoryKey({ ...canonical, date: '2026-12-01' }), '');
  assert.equal(breakingStoryKey({ ...canonical, kind: 'incident' }), '');
});

test('aliases apply across report types in both directions without matching inside words', () => {
  assert.ok(search({ title: 'Incident notice', source: 'California DOJ' }, 'California Attorney General'));
  assert.ok(search({ title: 'Federal Bureau of Investigation warns organizations', source: 'Example' }, 'FBI'));
  assert.ok(search({ title: 'CISA updates alert for CVE-2026-12345', source: 'Example' }, 'Cybersecurity and Infrastructure Security Agency'));
  assert.ok(search({ title: 'CISA updates alert for CVE-2026-12345', source: 'Example' }, 'CVE-2026-12345'));
  assert.equal(search({ title: 'Security policy', source: 'Example' }, 'SEC'), false);
});

test('FinCEN and Treasury names find the November 24 incident disclosure once', () => {
  const fincen = archive.items.filter((row) => row.sourceId === 'official-breaking' && row.title.startsWith('FinCEN'));
  assert.equal(fincen.length, 1);
  for (const query of ['FinCEN', 'Financial Crimes Enforcement Network', 'Treasury Department', 'BSA E-Filing']) {
    assert.deepEqual(archive.items.filter((row) => search(row, query)).filter((row) => row.title.startsWith('FinCEN')), fincen);
  }
});
