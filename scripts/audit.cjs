const fs = require('fs');
const path = require('path');
const dist = 'C:/Users/kevin/dal-x-sis/dist/briefings';

const issues = [];
const stats  = [];

for (let i = 1; i <= 20; i++) {
  const num  = String(i).padStart(2, '0');
  const slug = 'Strategic_Intelligence_Briefing_' + num;
  const file = path.join(dist, slug, 'index.html');
  const label = 'B' + num;

  if (!fs.existsSync(file)) {
    issues.push(label + ': ROUTE MISSING');
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const fileKB = Math.round(fs.statSync(file).size / 1024);

  // Slug / route drift
  if (/href="\/briefings\/\d{2}-/.test(html))
    issues.push(label + ': title-based slug in links');

  // Terminology
  if (/newsletter/i.test(html))
    issues.push(label + ': "newsletter" found — should be "briefing"');

  // DAL-X hyphen
  if (/\bDALX\b|\bDAL X\b/.test(html))
    issues.push(label + ': missing hyphen in DAL-X');

  // Required structural sections
  if (!html.includes('article-zone-header'))    issues.push(label + ': missing dark header zone');
  if (!html.includes('Issue ' + num))           issues.push(label + ': issue number missing');
  if (!html.includes('article-kicker'))         issues.push(label + ': phase kicker missing');
  if (!html.includes('article-byline'))         issues.push(label + ': byline/stats missing');
  if (!html.includes('article-core-position'))  issues.push(label + ': core position card missing');
  if (!html.includes('article-content'))        issues.push(label + ': essay body missing');
  if (!html.includes('article-source-notes'))   issues.push(label + ': source notes missing');
  if (!html.includes('Prepared for'))           issues.push(label + ': Prepared For missing');
  if (!html.includes('article-nav'))            issues.push(label + ': navigation missing');
  if (!html.includes('sidebar-card--series'))   issues.push(label + ': series branding missing');

  // Navigation continuity
  const prevNum = String(i - 1).padStart(2, '0');
  const nextNum = String(i + 1).padStart(2, '0');

  if (i > 1 && !html.includes('Briefing_' + prevNum))
    issues.push(label + ': prev link (B' + prevNum + ') missing');
  if (i < 20 && !html.includes('Briefing_' + nextNum))
    issues.push(label + ': next link (B' + nextNum + ') missing');
  if (!html.includes('href="/briefings"'))
    issues.push(label + ': Back to Series href missing');

  // Edge: first has no prev, last has no next
  if (i === 1  && html.includes('Briefing_00'))
    issues.push(label + ': spurious prev link on first briefing');
  if (i === 20 && html.includes('Briefing_21'))
    issues.push(label + ': spurious next link on last briefing');

  // Phase alignment
  const expectedPhase = i <= 5 ? 1 : i <= 12 ? 2 : i <= 17 ? 3 : 4;
  if (!html.includes('Phase ' + expectedPhase))
    issues.push(label + ': expected Phase ' + expectedPhase + ' not found');

  // h1 count (title should be only h1)
  const h1count = (html.match(/<h1[^>]*>/g) || []).length;
  if (h1count !== 1)
    issues.push(label + ': h1 count is ' + h1count + ' (expected 1)');

  // Essay body word count
  const bodyStart = html.indexOf('article-content">');
  const bodyEnd   = html.indexOf('article-source-notes');
  let bodyWords = 0;
  if (bodyStart !== -1 && bodyEnd !== -1) {
    bodyWords = html.slice(bodyStart, bodyEnd).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    if (bodyWords < 300)
      issues.push(label + ': body only ' + bodyWords + ' words — may be truncated');
  }

  // Source notes — check for at least one numbered citation
  const srcBlock = html.indexOf('article-source-notes');
  if (srcBlock !== -1) {
    const srcChunk = html.slice(srcBlock, srcBlock + 2000);
    if (!/\d+\.\s/.test(srcChunk.replace(/<[^>]+>/g, ' ')))
      issues.push(label + ': no numbered citations in source notes');
  }

  stats.push({ num, fileKB, bodyWords, h1count });
}

// Print stats table
console.log('NUM  SIZE   WORDS  H1  PHASE');
stats.forEach(s => {
  const phase = +s.num <= 5 ? 1 : +s.num <= 12 ? 2 : +s.num <= 17 ? 3 : 4;
  console.log(s.num + '   ' + s.fileKB + 'KB'.padEnd(5) + String(s.bodyWords).padEnd(7) + s.h1count + '   ' + phase);
});

console.log('');
if (issues.length === 0) {
  console.log('All 20 briefings pass — no issues found.');
} else {
  console.log(issues.length + ' issue(s) found:');
  issues.forEach(x => console.log('  FAIL: ' + x));
}
