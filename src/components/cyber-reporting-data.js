const dayMs = 86_400_000;
const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
const readable = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const calendarDate = /^\d{4}-\d{2}-\d{2}$/;
export const dayStamp = (day) => Date.parse(`${day}T00:00:00Z`);
const isoDay = (stamp) => new Date(stamp).toISOString().slice(0, 10);
export function reportingDay(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '';
  if (calendarDate.test(value)) return value;
  const parts = Object.fromEntries(eastern.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const counted = new Set(['breach', 'advisory', 'kev', 'filing', 'agency']);
const shared = new Set(['or', 'vt', 'hhs', 'ma', 'tx', 'in', 'il', 'nh', 'ri', 'mt', 'ne']);
const identity = (s) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function recordKey(r, url, day) {
  if (r.kind === 'incident') return `reviewed:${r.id}`;
  if (r.kind === 'kev') return `kev:${r.title.match(/CVE-\d{4}-\d+/i)?.[0].toUpperCase() ?? r.id}`;
  const org = identity(r.title);
  if (shared.has(r.sourceId) || (r.kind === 'breach' && !/\.pdf$/i.test(url.pathname) && /(?:notices|notifications|breaches|list)\/?$/i.test(url.pathname))) {
    return `${r.sourceId}:${day}:${org}`;
  }
  return `${r.sourceId}:${url.hostname}${url.pathname.replace(/\/$/, '')}${url.search}`;
}
export function mergeReporting(archive, feed) {
  const items = new Map();
  const date = reportingDay(feed?.generatedAt) || reportingDay(archive.generatedAt);
  const recent = feed?.publicRecords ?? feed?.recentReports ?? [];
  for (const [rows, live] of [[archive.items, false], [recent, true]]) {
    for (const r of rows) {
      if (!r || typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.source !== 'string' || typeof r.sourceId !== 'string') continue;
      if (!counted.has(r.kind) && (live || r.kind !== 'incident')) continue;
      const day = reportingDay(r.date);
      if (!day || day > date) continue;
      let url;
      try { url = new URL(r.url); } catch { continue; }
      if (url.protocol !== 'https:' || url.username || url.password || url.port) continue;
      const key = recordKey(r, url, day);
      items.set(key, { ...items.get(key), ...r, id: key, date: day });
    }
  }
  return { generatedAt: date, items: [...items.values()] };
}

export const cohort = Object.freeze({ vt: 'Vermont AG', or: 'Oregon DOJ', sc: 'South Carolina Consumer Affairs', ia: 'Iowa Attorney General', id: 'Idaho Attorney General', kev: 'CISA KEV', ic3: 'FBI / IC3' });
export function buildRollingBrief(doc) {
  const cutoff = dayStamp(reportingDay(doc.generatedAt)) - dayMs;
  const start = cutoff - 29 * dayMs;
  const priorStart = start - 30 * dayMs;
  const buckets = [[], []];
  for (const r of doc.items) {
    if (!Object.hasOwn(cohort, r.sourceId) || !counted.has(r.kind)) continue;
    const stamp = dayStamp(r.date);
    if (stamp >= start && stamp <= cutoff) buckets[0].push(r);
    else if (stamp >= priorStart && stamp < start) buckets[1].push(r);
  }
  const [current, previous] = buckets.map((rows) => rows.length);
  const change = previous ? Math.round((current - previous) * 100 / previous) : null;
  const headline = change === null ? 'Disclosure volume at a glance.' : Math.abs(change) <= 5 ? 'Disclosure volume held steady.' : change > 0 ? 'More disclosures than the prior 30 days.' : 'Fewer disclosures than the prior 30 days.';
  const period = (from, to) => `${readable.format(from)} to ${readable.format(to)}`;
  const weeks = [];
  const monday = start - (new Date(start).getUTCDay() + 6) % 7 * dayMs;
  for (let w = monday; w <= cutoff; w += 7 * dayMs) {
    const from = Math.max(start, w), to = Math.min(cutoff, w + 6 * dayMs);
    const count = buckets[0].filter(r => r.date >= isoDay(from) && r.date <= isoDay(to)).length;
    weeks.push({ count, partial: to - from < 6 * dayMs, label: readable.format(from), range: period(from, to) });
  }
  return { headline, current, previous, change, period: period(start, cutoff), comparison: period(priorStart, start - dayMs), weeks };
}
