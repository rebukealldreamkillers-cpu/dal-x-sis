const endpoint = '/cybersecurity-data/snapshot.json';
const refreshMs = 5 * 60_000;
const staleMs = 2 * 60 * 60_000;
const expireMs = 24 * 60 * 60_000;
const labels = { incident:'National incident', breach:'Breach notice', advisory:'Advisory', kev:'Exploited vulnerability' };
const endpoints = {
  reviewed:['incident',['www.bleepingcomputer.com','/news/'],['www.nbcnews.com','/politics/'],['apnews.com','/article/'],['oag.ca.gov','/ecrime/databreach/'],['news.vanderbilt.edu','/2026/'],['www.sec.gov','/Archives/edgar/']],
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
  a.append(textNode('span', 'tag', `${labels[item.kind]} · ${item.source}`),
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
  const duplicate = find('copy'), status = find('status'), button = find('pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, last = null, failed = false, loading = false, rendered = '', pending = false;

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
    const now = Date.parse(last?.generatedAt ?? '');
    const age = now - Date.parse(last?.generatedAt ?? '');
    const usable = last && age < expireMs;
    const sources = usable ? last.sources : {};
    const items = usable ? last.items.filter(i => {
      if (!safeItem(i)) return false;
      const s = sources[i.sourceId];
      return s?.status !== 'unavailable' && now - Date.parse(s?.checkedAt) < expireMs &&
        now - Date.parse(i.date) <= 14 * expireMs;
    }).slice(0, 18) : [];
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
    const degraded = Object.keys(endpoints).map(k => sources[k]).filter(Boolean).filter(s => s.status !== 'current' || now - Date.parse(s.checkedAt) > staleMs);
    const sourceLabels = degraded.map(s => s.label).join(', ');
    const checked = usable ? new Date(last.generatedAt).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' }) : '';
    if (!usable) status.textContent = 'Updates unavailable. See the original sources below.';
    else if (!items.length) status.textContent = degraded.length || failed || age > staleMs
      ? 'Some feeds are unavailable or delayed. See original sources below.' : 'No items from the past 14 days in the connected sources.';
    else if (failed || age > staleMs) status.textContent = `Showing saved reports. Snapshot: ${checked}.`;
    else if (degraded.length) status.textContent = `Some feeds delayed or unavailable: ${sourceLabels}. Snapshot: ${checked}.`;
    else status.textContent = `Published snapshot: ${checked}. Updates are not yet automatic.`;
    measure();
  }

  async function update() {
    if (document.hidden || loading) return;
    loading = true;
    try {
      const response = await fetch(endpoint, { cache:'no-cache', signal:AbortSignal.timeout(4500) });
      if (!response.ok) throw new Error('Ticker unavailable');
      const data = await response.json();
      if (data?.version !== 2 || !Array.isArray(data.items) || !Number.isFinite(Date.parse(data.generatedAt)) ||
          !Object.keys(endpoints).every(k => {
            const s = data.sources?.[k];
            return s && typeof s.label === 'string' && ['current', 'stale', 'unavailable'].includes(s.status);
          })) throw new Error('Invalid snapshot');
      last = data;
      failed = false;
    } catch { failed = true; }
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
  update();
}

document.querySelectorAll('[data-cyber-ticker]').forEach(init);
