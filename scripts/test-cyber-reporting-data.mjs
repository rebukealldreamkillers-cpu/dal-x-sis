import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNumbers } from '../src/components/cyber-numbers-data.js';
import { buildRollingBrief, mergeReporting, reportingDay } from '../src/components/cyber-reporting-data.js';
const record = (id,date,sourceId='or',kind='breach',title=id) => ({ id,date,kind,title,sourceId,source:sourceId,url:`https://example.gov/${id}` });

test('Eastern date boundaries and date-only notices are preserved', () => {
  assert.equal(reportingDay('2026-11-25T01:00:00Z'), '2026-11-24');
  assert.equal(reportingDay('2026-11-24'), '2026-11-24');
});
test('live notices extend the numbers without recounting archive overlap or promoting news', () => {
  const archive={generatedAt:'2026-11-22',items:[record('old-id','2026-11-20','or','breach','Example, Inc.'),record('review','2026-11-21','reviewed','incident')]};
  const feed={generatedAt:'2026-11-25T01:00:00Z',publicRecords:[record('changed-id','2026-11-20','or','breach','Example Inc.'),record('fresh','2026-11-24'),record('story','2026-11-24','record','news')]};
  const data=buildNumbers(mergeReporting(archive,feed));
  assert.equal(data.asOf,'2026-11-24');
  assert.equal(data.windows[30].series.public.total,2);
  assert.equal(data.windows[30].series.reviewed.total,1);
});
test('rolling windows are exactly 30 complete days and use the same cohort', () => {
  const brief=buildRollingBrief({generatedAt:'2026-11-25T02:00:00Z',items:[record('today','2026-11-24'),record('yesterday','2026-11-23'),record('start','2026-10-25'),record('prior-end','2026-10-24'),record('prior-start','2026-09-25'),record('older','2026-09-24'),record('different','2026-11-23','tx')]});
  assert.deepEqual([brief.period,brief.comparison,brief.current,brief.previous,brief.change],['Oct 25 to Nov 23','Sep 25 to Oct 24',2,2,0]);
  assert.equal(brief.weeks.reduce((n,w)=>n+w.count,0),brief.current);
});
