import { updateCyberFeed } from './cyber-live-state.js';

const endpoint = '/cybersecurity-data/ticker-feed.json';
const seedEndpoint = '/cybersecurity-data/snapshot.json';
const refreshMs = 5 * 60_000;
const staleMs = 2 * 60 * 60_000;
const expireMs = 24 * 60 * 60_000;
const labels = { news:'Breaking report', filing:'SEC filing', agency:'Law enforcement announcement', incident:'National incident', breach:'Breach notice', advisory:'Advisory', kev:'Exploited vulnerability' };
const endpoints = {
  'official-breaking':['news',['bsaefiling.fincen.gov','/']],
  gnews:['news',['news.google.com','/rss/articles/']],
  gnewsincident:['news',['news.google.com','/rss/articles/']],
  bleeping:['news',['www.bleepingcomputer.com','/news/']],
  record:['news',['therecord.media','/']],
  securityweek:['news',['www.securityweek.com','/']],
  cyberscoop:['news',['cyberscoop.com','/']],
  id:['breach',['www.ag.idaho.gov','/content/uploads/'],['www.ag.idaho.gov','/consumer-protection/security-breaches/']],
  sc:['breach',['consumer.sc.gov','/sites/consumer/files/'],['consumer.sc.gov','/identity-theft-unit/security-breach-notices']],
  hhs:['breach',['ocrportal.hhs.gov','/ocr/breach/']],
  ia:['breach',['www.iowaattorneygeneral.gov','/media/cms/']],
  ma:['breach',['www.mass.gov','/doc/data-breach-report-2026/']],
  sec:['filing',['www.sec.gov','/Archives/edgar/']],
  ic3:['advisory',['www.ic3.gov','/CSA/'],['www.ic3.gov','/PSA/']],
  doj:['agency',['www.justice.gov','/opa/pr/']],
  breach: ['breach', ['oag.ca.gov', '/ecrime/databreach/reports/']],
  wa: ['breach', ['www.atg.wa.gov', '/data-breach-notifications'], ['agportal-s3bucket.s3.amazonaws.com', '/databreach/']],
  or: ['breach', ['justice.oregon.gov', '/consumer/databreach/']],
  vt: ['breach', ['ago.vermont.gov', '/categories/security-breach-notices']],
  advisory: ['advisory', ['www.cisa.gov', '/news-events/'], ['www.cisa.gov', '/cybersecurity-advisories/']],
  kev: ['kev', ['www.cisa.gov', '/known-exploited-vulnerabilities-catalog']],
};

function textNode(tag, cls, value) {
  const node = document.createElement(tag);
  node.className = `cyber-ticker__${cls}`;
  node.textContent = value;
  return node;
}

function listItem(item, copy = false) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = item.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (copy) a.tabIndex = -1;
  const date = textNode('time', 'date', item.date.slice(0, 10));
  date.dateTime = item.date;
  const topic = item.topic === 'ai-agent-security' ? 'AI agent security · ' : '';
  a.append(textNode('span', 'tag', `${topic}${labels[item.kind]} · ${item.source}`),
    textNode('span', 'title', item.title), date);
  li.append(a);
  return li;
}

function safeItem(item) {
  if (!item || !Object.hasOwn(endpoints, item.sourceId) || typeof item.title !== 'string' ||
      typeof item.source !== 'string' || typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date))) return false;
  try {
    const u = new URL(item.url);
    const [kind, ...targets] = endpoints[item.sourceId];
    return item.kind === kind && u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      targets.some(([host, path]) => u.hostname === host && u.pathname.startsWith(path));
  } catch { return false; }
}

function init(root) {
  const find = (name) => root.querySelector(`[data-ticker-${name}]`);
  const viewport = find('window'), track = find('track'), list = find('list');
  const duplicate = find('copy'), button = find('pause');
  const refresh = document.querySelector('[data-ticker-refresh]');
  const status = refresh?.querySelector('[data-ticker-status]');
  const next = refresh?.querySelector('[data-ticker-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, last = null, failed = false, loading = false, rendered = '', pending = false, nextAt = 0;

  function measure() {
    const length = list.getBoundingClientRect().width;
    const canMove = !viewport.hidden && length > viewport.clientWidth + 1 && !reduced.matches;
    const moving = canMove && !paused && !viewport.contains(document.activeElement);
    if (moving && !root.hasAttribute('data-moving')) viewport.scrollLeft = 0;
    track.style.setProperty('--cyber-ticker-duration', `${length / 38}s`);
    root.toggleAttribute('data-moving', moving);
    root.toggleAttribute('data-manual', !moving);
    duplicate.hidden = !moving;
    button.hidden = !canMove && document.activeElement !== button;
    button.setAttribute('aria-pressed', String(paused));
  }

  function render() {
    const snapshotAt = Date.parse(last?.generatedAt ?? '');
    const now = last?.live ? Date.now() : snapshotAt;
    const age = now - snapshotAt;
    const usable = Boolean(last);
    const sources = usable ? last.sources : {};
    const items = usable ? last.items.filter(i => {
      if (!safeItem(i)) return false;
      const s = sources[i.sourceId];
      return s?.status !== 'unavailable' && now - Date.parse(i.date) <= 14 * expireMs;
    }).slice(0, 24) : [];
    const key = JSON.stringify(items);
    if (key !== rendered) {
      if (viewport.contains(document.activeElement) || (matchMedia('(hover:hover)').matches && viewport.matches(':hover'))) {
        pending = true;
      } else {
        pending = false;
        rendered = key;
        list.replaceChildren(...items.map(item => listItem(item)));
        duplicate.replaceChildren(...items.map(item => listItem(item, true)));
        viewport.hidden = !items.length;
      }
    }
    const format = (date) => new Date(date).toLocaleString(undefined, {
      month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short',
    });
    if (status) {
      if (!usable) status.textContent = 'Ticker temporarily unavailable. Use the original sources below.';
      else if (!last.live) status.textContent = `Showing saved snapshot from ${format(last.generatedAt)}. Live check unavailable.`;
      else if (!last.lastSuccessfulCheck) status.textContent = `Publisher checks unavailable. Showing saved reports from ${format(last.archiveAsOf)}.`;
      else {
        const warning = failed || age > staleMs ? ' Showing saved results.' : last.failedSources?.length ? ` Delayed: ${last.failedSources.join(', ')}.` : '';
        status.textContent = `Last successful publisher check: ${format(last.lastSuccessfulCheck)}.${warning}`;
      }
    }
    if (nextAt && next) next.textContent = `Next browser check: ${format(nextAt)} while this tab is open.`;
    measure();
  }

  async function readSnapshot(url, live) {
    const response = await fetch(url, { signal:AbortSignal.timeout(live ? 13000 : 4500) });
    if (!response.ok) throw new Error('Ticker unavailable');
    const data = await response.json();
    if (data?.version !== 2 || !Array.isArray(data.items) || !Number.isFinite(Date.parse(data.generatedAt)) ||
        (live && data.live !== true) || !Object.keys(endpoints).every(k => {
          const src = data.sources?.[k];
          return src && typeof src.label === 'string' && ['current', 'stale', 'unavailable'].includes(src.status);
        })) throw new Error('Invalid snapshot');
    return data;
  }
  async function update() {
    if (document.hidden || loading || (nextAt && Date.now() < nextAt)) return;
    loading = true;
    nextAt = Date.now() + refreshMs;
    // Paint the publish-time fallback without waiting for a cold live request.
    if (!last) {
      readSnapshot(seedEndpoint, false).then(data => {
        if (!last) { last = data; render(); }
      }).catch(() => {});
    }
    try {
      last = await readSnapshot(endpoint, true);
      failed = false;
      updateCyberFeed(last, false);
    } catch { failed = true; updateCyberFeed(null, true); }
    finally { loading = false; render(); }
  }
  button.addEventListener('click', () => { paused = !paused; measure(); });
  button.addEventListener('blur', () => queueMicrotask(measure));
  viewport.addEventListener('focusin', (event) => {
    // Clicking the visual duplicate may focus it in some browsers; keep that item under the pointer.
    if (duplicate.contains(event.target)) return;
    measure();
    event.target.scrollIntoView({ block:'nearest', inline:'nearest' });
  });
  viewport.addEventListener('focusout', () => queueMicrotask(() => pending ? render() : measure()));
  viewport.addEventListener('pointerleave', () => { if (pending) render(); });
  reduced.addEventListener('change', measure);
  new ResizeObserver(measure).observe(viewport);
  document.addEventListener('visibilitychange', update);
  setInterval(update, 15_000);
  update();
}

document.querySelectorAll('[data-cyber-ticker]').forEach(init);
