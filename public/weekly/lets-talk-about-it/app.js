/* Let's Talk About It: rendering and interaction for the incident dashboard.
   Reads incidents.json and context.json from this folder at load time. */
(function () {
  'use strict';

  var BASE = '/weekly/lets-talk-about-it/';
  var SAMPLE_START = '2026-04-11'; // methodology: start of the curated disclosure window
  var NEW_DAYS = 3;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Vocabulary ---------- */
  var DEFECTS = [
    { key: 'boundary_unenforced', label: 'Agent acted outside its authorized environment', line: 'The agent reached systems beyond the environment it was authorized to use.' },
    { key: 'external_output_unverified', label: 'Unverified AI output released to an outside party', line: 'AI output went to a court, a government, a customer, or the public without verification.' },
    { key: 'irreversible_unverified', label: 'Irreversible action without a verified precondition', line: 'A destructive step ran before anyone confirmed it was safe to run.' },
    { key: 'unverified_release', label: 'Unverified change released through automation', line: 'An automated pipeline shipped a change nobody verified first.' },
    { key: 'requester_unverified', label: 'Account control changed without verifying the requester', line: 'Control of an account moved on request, with no check of who was asking.' },
    { key: 'unbounded_execution', label: 'Agent ran without a spend or iteration limit', line: 'The agent kept running with no ceiling on cost or repetitions.' }
  ];
  var AUTH = { exceeded: 'Authority exceeded', unverified: 'Authority unverified', missing: 'Authority missing' };
  var DEPLOY = { deployed: 'Deployed system', evaluation_real_systems: 'Evaluation that reached real systems', research_simulation: 'Research simulation' };
  var DEPLOY_SHORT = { deployed: 'Deployed', evaluation_real_systems: 'Evaluation, real systems', research_simulation: 'Simulation' };

  var ICONS = {
    boundary_unenforced: '<rect x="3" y="5" width="13" height="14" rx="1" stroke-dasharray="2.2 2"/><path d="M9.5 12h11M17 8.5l3.5 3.5-3.5 3.5"/>',
    external_output_unverified: '<path d="M5 3h8l4 4v6"/><path d="M13 3v4h4"/><path d="M5 3v18h8"/><path d="M8 10h6M8 13.5h4"/><path d="M15 18h6M18.5 15.5 21 18l-2.5 2.5"/>',
    irreversible_unverified: '<path d="M3 12h11M10.5 8.5 14 12l-3.5 3.5"/><path d="M17.5 4v16"/><path d="M20.5 4v16"/>',
    unverified_release: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/><path d="M12 1v-0"/>',
    requester_unverified: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/><path d="M15.5 4.2a2.6 2.6 0 1 1 3.4 2.5c-.6.2-.9.6-.9 1.2"/><circle cx="18" cy="9.6" r=".4" fill="currentColor"/>',
    unbounded_execution: '<path d="M7 8.5c-2 0-3.5 1.5-3.5 3.5S5 15.5 7 15.5c3.5 0 6.5-7 10-7 2 0 3.5 1.5 3.5 3.5s-1.5 3.5-3.5 3.5c-3.5 0-6.5-7-10-7z"/>',
    generic: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><circle cx="12" cy="12" r="2"/>',
    gate: '<path d="M5 3v18M19 3v18"/><path d="M5 9h14M5 15h14" stroke-dasharray="2 2"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/>'
  };
  function icon(key) {
    var body = ICONS[key] || ICONS.generic;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ---------- Helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function has(v) { return v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0); }
  function arr(v) { return Array.isArray(v) ? v.filter(has) : []; }
  function humanize(v) { var s = String(v || '').replace(/_/g, ' ').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function authLabel(s) { return AUTH[s] || humanize(s); }
  function depLabel(s) { return DEPLOY[s] || humanize(s); }
  function depShort(s) { return DEPLOY_SHORT[s] || humanize(s); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  }
  function fmtDay(s, long) {
    var t = parseDay(s); if (isNaN(t)) return s ? String(s) : '';
    var d = new Date(t);
    return d.getUTCDate() + ' ' + (long ? MONTHS_LONG : MONTHS)[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function fmtStamp(s) {
    var d = new Date(s); if (isNaN(d)) return s ? String(s) : '';
    var hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', ' + hh + ':' + mm + ' UTC';
  }
  var todayUTC = (function () { var n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()); })();
  var DAY = 86400000;
  function isNew(p) {
    var t = parseDay(p.disclosed_on); if (isNaN(t)) return false;
    var diff = (todayUTC - t) / DAY;
    return diff >= 0 && diff <= NEW_DAYS;
  }
  function incNum(id) { var m = /(\d+)/.exec(id || ''); return m ? parseInt(m[1], 10) : 0; }
  function clusterName(c) { return String(c || '').replace(/\s*\(\d{4}\)\s*$/, ''); }
  function placeName(label) { return String(label || '').replace(/\s*\(.*$/, '') || String(label || ''); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* ---------- State ---------- */
  var D = { rows: [], byId: {}, ctx: [], meta: {} };
  var F = { defect: '', auth: '', dep: '', newOnly: false, q: '' };
  var openId = null, lastTrigger = null, expandedCluster = null, mapFocus = null, pushedHash = false;

  /* ---------- Load ---------- */
  function getJSON(name) {
    return fetch(BASE + name, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name + ' returned ' + r.status);
      return r.json();
    });
  }

  Promise.all([getJSON('incidents.json'), getJSON('context.json').catch(function () { return { rows: [] }; })])
    .then(function (res) { init(res[0], res[1]); })
    .catch(function (err) {
      console.warn(err);
      $('sampleline').textContent = 'The incident data could not be loaded. Refresh the page to try again.';
      $('tiles').innerHTML = '<p class="empty">The incident data could not be loaded.</p>';
    });

  function init(inc, ctx) {
    D.meta = inc || {};
    D.rows = arr(inc && inc.rows).filter(function (r) { return r && r.review_status === 'published' && r.published && r.incident_id; });
    D.rows.forEach(function (r) {
      var p = r.published;
      p.authority = p.authority || {};
      r._new = isNew(p);
      r._t = parseDay(p.disclosed_on);
      D.byId[r.incident_id] = r;
    });
    D.rows.sort(function (a, b) {
      var ta = isNaN(a._t) ? -Infinity : a._t, tb = isNaN(b._t) ? -Infinity : b._t;
      return tb - ta || incNum(b.incident_id) - incNum(a.incident_id);
    });
    D.ctx = arr(ctx && ctx.rows).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    renderHero();
    buildFilterOptions();
    renderStats();
    bindControls();
    loadMap();
    applyFilters();
    window.addEventListener('resize', debounce(function () { renderMap(); renderTimeline(); }, 150));
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
    syncHash();
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    var upd = D.meta.updated ? fmtDay(D.meta.updated, true) : '';
    $('updated').textContent = upd || 'date not stated';
    $('updated2').textContent = upd || 'date not stated';
    $('bigcount').textContent = String(D.rows.length);
    var inWin = D.rows.filter(function (r) { return !isNaN(r._t) && r._t >= parseDay(SAMPLE_START); });
    var refs = D.rows.length - inWin.length;
    var times = inWin.map(function (r) { return r._t; });
    var line = '';
    if (inWin.length) {
      var first = new Date(Math.min.apply(null, times)).toISOString().slice(0, 10);
      var last = new Date(Math.max.apply(null, times)).toISOString().slice(0, 10);
      line = 'A curated sample: <strong>' + inWin.length + '</strong> ' + plural(inWin.length, 'incident', 'incidents') + ' disclosed from ' + esc(fmtDay(first)) + ' to ' + esc(fmtDay(last)) + ', plus <strong>' + refs + '</strong> earlier reference ' + plural(refs, 'case', 'cases') + '. The public record holds only a small share of such incidents.';
    } else {
      line = 'A curated sample of publicly documented incidents. The public record holds only a small share of them.';
    }
    $('sampleline').innerHTML = line;
    if (D.meta.last_check) $('refreshed').textContent = 'Data refreshed ' + fmtStamp(D.meta.last_check);
    var nNew = D.rows.filter(function (r) { return r._new; }).length;
    $('newcount').textContent = nNew ? nNew + ' disclosed in the last 3 days' : '';
  }

  /* ---------- Filters ---------- */
  function defectList() {
    var known = DEFECTS.map(function (d) { return d.key; });
    var list = DEFECTS.map(function (d) { return { key: d.key, label: d.label, line: d.line }; });
    D.rows.forEach(function (r) {
      var k = r.published.defect_category;
      if (k && known.indexOf(k) < 0) {
        known.push(k);
        list.push({ key: k, label: r.published.defect_label || humanize(k), line: '' });
      }
    });
    list.forEach(function (d) {
      var row = D.rows.find(function (r) { return r.published.defect_category === d.key && r.published.defect_label; });
      if (row) d.label = row.published.defect_label;
      d.count = D.rows.filter(function (r) { return r.published.defect_category === d.key; }).length;
    });
    return list;
  }

  function buildFilterOptions() {
    var defs = defectList();
    D.defects = defs;
    var WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
    var nd = defs.filter(function (d) { return d.count; }).length;
    $('h-patterns').textContent = (WORDS[nd] || String(nd)) + ' ' + plural(nd, 'way', 'ways') + ' execution slipped past authority';
    var max = Math.max.apply(null, defs.map(function (d) { return d.count; }).concat([1]));
    $('defects').innerHTML = defs.map(function (d) {
      return '<button type="button" class="defect" data-defect="' + esc(d.key) + '" aria-pressed="false">' +
        '<span class="ic">' + icon(d.key) + '</span>' +
        '<span class="n">' + d.count + '<small>' + plural(d.count, 'incident', 'incidents') + '</small></span>' +
        '<span class="t">' + esc(d.label) + '</span>' +
        (d.line ? '<span class="d">' + esc(d.line) + '</span>' : '<span class="d"></span>') +
        '<span class="bar" aria-hidden="true"><i style="width:' + Math.max(4, Math.round(d.count / max * 100)) + '%"></i></span>' +
        '</button>';
    }).join('');

    var opt = function (v, l) { return '<option value="' + esc(v) + '">' + esc(l) + '</option>'; };
    $('f-defect').innerHTML = opt('', 'All defects') + defs.filter(function (d) { return d.count; }).map(function (d) { return opt(d.key, d.label + ' (' + d.count + ')'); }).join('');

    var auths = ['exceeded', 'unverified', 'missing'];
    D.rows.forEach(function (r) { var s = r.published.authority.status; if (s && auths.indexOf(s) < 0) auths.push(s); });
    $('f-auth').innerHTML = opt('', 'Any authority status') + auths.map(function (s) {
      var n = D.rows.filter(function (r) { return r.published.authority.status === s; }).length;
      return n ? opt(s, authLabel(s) + ' (' + n + ')') : '';
    }).join('');

    var deps = ['deployed', 'evaluation_real_systems', 'research_simulation'];
    D.rows.forEach(function (r) { var s = r.published.deployment; if (s && deps.indexOf(s) < 0) deps.push(s); });
    $('f-dep').innerHTML = opt('', 'Any deployment') + deps.map(function (s) {
      var n = D.rows.filter(function (r) { return r.published.deployment === s; }).length;
      return n ? opt(s, depLabel(s) + ' (' + n + ')') : '';
    }).join('');
  }

  function bindControls() {
    $('defects').addEventListener('click', function (e) {
      var b = e.target.closest('.defect'); if (!b) return;
      F.defect = F.defect === b.dataset.defect ? '' : b.dataset.defect;
      applyFilters();
    });
    $('f-defect').addEventListener('change', function (e) { F.defect = e.target.value; applyFilters(); });
    $('f-auth').addEventListener('change', function (e) { F.auth = e.target.value; applyFilters(); });
    $('f-dep').addEventListener('change', function (e) { F.dep = e.target.value; applyFilters(); });
    $('f-new').addEventListener('click', function () { F.newOnly = !F.newOnly; applyFilters(); });
    $('q').addEventListener('input', debounce(function () { F.q = $('q').value.trim(); applyFilters(); }, 160));
    ['filterreset', 'filterreset2', 'filterreset3'].forEach(function (id) {
      $(id).addEventListener('click', function () { resetFilters(); });
    });
    $('tiles').addEventListener('click', function (e) {
      var t = e.target.closest('.tile'); if (t) openCase(t.dataset.id, { trigger: t });
    });
    $('legend').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]'); if (b) openCase(b.dataset.id, { trigger: b });
    });
    $('case-close').addEventListener('click', function () { closeCase(); });
    $('scrim').addEventListener('click', function () { closeCase(); });
    $('case-prev').addEventListener('click', function () { step(-1); });
    $('case-next').addEventListener('click', function () { step(1); });
    document.addEventListener('keydown', function (e) {
      if (!openId) return;
      if (e.key === 'Escape') { e.preventDefault(); closeCase(); }
      else if (e.key === 'Tab') trapFocus(e);
    });
    $('case-body').addEventListener('click', function (e) {
      var mk = e.target.closest('a.mk');
      if (mk) {
        e.preventDefault();
        var li = document.getElementById(mk.getAttribute('data-target'));
        if (li) {
          li.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
          li.classList.add('flash'); setTimeout(function () { li.classList.remove('flash'); }, 1400);
        }
        return;
      }
      var cb = e.target.closest('button[data-goto]');
      if (cb) openCase(cb.dataset.goto, { replace: true });
    });
  }

  function resetFilters() {
    F = { defect: '', auth: '', dep: '', newOnly: false, q: '' };
    $('q').value = '';
    applyFilters();
  }
  function anyFilter() { return !!(F.defect || F.auth || F.dep || F.newOnly || F.q); }

  function matches(r) {
    var p = r.published;
    if (F.defect && p.defect_category !== F.defect) return false;
    if (F.auth && p.authority.status !== F.auth) return false;
    if (F.dep && p.deployment !== F.dep) return false;
    if (F.newOnly && !r._new) return false;
    if (F.q) {
      var hay = [r.incident_id, p.title, p.summary, p.organization, p.system, p.workflow, p.location && p.location.label, p.cluster, p.defect_label].join(' ').toLowerCase();
      var terms = F.q.toLowerCase().split(/\s+/);
      for (var i = 0; i < terms.length; i++) if (terms[i] && hay.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }
  function filtered() { return D.rows.filter(matches); }

  function describeFilters() {
    var parts = [];
    if (F.defect) { var d = (D.defects || []).find(function (x) { return x.key === F.defect; }); parts.push(d ? d.label : humanize(F.defect)); }
    if (F.auth) parts.push(authLabel(F.auth));
    if (F.dep) parts.push(depLabel(F.dep));
    if (F.newOnly) parts.push('Disclosed in the last 3 days');
    if (F.q) parts.push('Search: "' + F.q + '"');
    return parts.join(' / ');
  }

  function applyFilters() {
    var list = filtered();
    var on = anyFilter();
    document.body.classList.toggle('filtering', !!F.defect);
    Array.prototype.forEach.call(document.querySelectorAll('.defect'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.defect === F.defect ? 'true' : 'false');
    });
    $('f-defect').value = F.defect; $('f-auth').value = F.auth; $('f-dep').value = F.dep;
    $('f-new').setAttribute('aria-pressed', F.newOnly ? 'true' : 'false');
    $('filterreset').hidden = !on;
    $('filterreset3').hidden = !on;
    $('filterbar').classList.toggle('on', on);
    $('filterwhat').innerHTML = on ? 'Showing <b>' + list.length + '</b> of ' + D.rows.length + ': ' + esc(describeFilters()) : '';
    $('resultcount').innerHTML = on ? 'Showing <b>' + list.length + '</b> of ' + D.rows.length + ' incidents' : '<b>' + D.rows.length + '</b> incidents';
    expandedCluster = null; mapFocus = null;
    renderTiles(list);
    renderMap();
    renderTimeline();
    if (openId) updateCaseNav();
  }

  /* ---------- Tiles ---------- */
  function renderTiles(list) {
    if (!list.length) {
      $('tiles').innerHTML = '<p class="empty">No incidents match these filters. <button class="linkbtn" type="button" onclick="document.getElementById(\'filterreset3\').click()">Clear all filters</button></p>';
      return;
    }
    $('tiles').innerHTML = list.map(function (r, i) {
      var p = r.published, st = p.authority.status;
      return '<button type="button" class="tile' + (r.incident_id === openId ? ' sel' : '') + '" data-id="' + esc(r.incident_id) + '" style="animation-delay:' + Math.min(i * 18, 360) + 'ms" aria-label="' + esc(r.incident_id + ': ' + (p.title || '')) + '">' +
        '<span class="top">' + icon(p.defect_category) + '<span class="id">' + esc(r.incident_id) + '</span>' + (r._new ? '<span class="chip new">New</span>' : '') +
        (p.disclosed_on ? '<span class="date">' + esc(fmtDay(p.disclosed_on)) + '</span>' : '') + '</span>' +
        '<span class="ttl">' + esc(p.title || r.incident_id) + '</span>' +
        '<span class="bot">' + (st ? '<span class="chip auth-' + esc(st) + '">' + esc(authLabel(st)) + '</span>' : '') +
        (p.deployment ? '<span class="chip dep">' + esc(depShort(p.deployment)) + '</span>' : '') + '</span>' +
        '</button>';
    }).join('');
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    if (!D.ctx.length) { $('scale').querySelector('.stats').innerHTML = ''; return; }
    $('stats').innerHTML = D.ctx.map(function (c) {
      return '<article class="stat">' +
        (has(c.kind) ? '<span class="label">' + esc(c.kind) + '</span>' : '') +
        '<span class="fig">' + esc(c.figure) + '</span>' +
        '<p class="lab">' + esc(c.label) + '</p>' +
        '<p class="src">' + (has(c.url) ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.source || c.url) + '</a>' : esc(c.source || '')) +
        (has(c.published) ? '<br><span class="mono">' + esc(fmtDay(c.published)) + '</span>' : '') + '</p>' +
        '</article>';
    }).join('');
  }

  /* ---------- Map ---------- */
  var world = null, mapFailed = false;
  function loadMap() {
    if (!window.d3) { mapFailed = true; renderMap(); return; }
    fetch(BASE + 'world.json').then(function (r) { if (!r.ok) throw new Error('world.json ' + r.status); return r.json(); })
      .then(function (topo) { world = topoFeatures(topo, 'countries').filter(function (f) { return String(f.id) !== '010'; }); renderMap(); })
      .catch(function (e) { console.warn(e); mapFailed = true; renderMap(); });
  }
  function topoFeatures(topo, name) {
    var tf = topo.transform;
    var arcs = topo.arcs.map(function (a) {
      var x = 0, y = 0;
      return a.map(function (p) {
        if (tf) { x += p[0]; y += p[1]; return [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]]; }
        return [p[0], p[1]];
      });
    });
    function ring(ids) {
      var out = [];
      ids.forEach(function (i, k) {
        var a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
        a.forEach(function (p, j) { if (k && !j) return; out.push(p); });
      });
      return out;
    }
    return topo.objects[name].geometries.map(function (g) {
      var geom = g.type === 'Polygon' ? { type: 'Polygon', coordinates: g.arcs.map(ring) }
        : g.type === 'MultiPolygon' ? { type: 'MultiPolygon', coordinates: g.arcs.map(function (p) { return p.map(ring); }) } : null;
      return { type: 'Feature', id: g.id, properties: g.properties || {}, geometry: geom };
    }).filter(function (f) { return f.geometry; });
  }
  function located(r) {
    var l = r.published.location;
    return l && l.documented === true && typeof l.lat === 'number' && typeof l.lon === 'number' && isFinite(l.lat) && isFinite(l.lon);
  }

  function renderMap() {
    var svg = $('map');
    var list = filtered().filter(located).sort(function (a, b) { return incNum(a.incident_id) - incNum(b.incident_id); });
    var totalLocated = D.rows.filter(located).length;
    $('mapcount').textContent = list.length + ' of ' + (anyFilter() ? filtered().length + ' shown' : D.rows.length) + ' ' + plural(list.length, 'incident', 'incidents') + ' pinned';
    renderLegend(list);
    if (mapFailed || !world) {
      if (mapFailed) {
        svg.setAttribute('height', '0');
        if (!$('mapfallback')) {
          var p = document.createElement('p'); p.id = 'mapfallback'; p.className = 'map-fallback';
          p.textContent = 'The map could not load. Every pinned incident is listed below with its place.';
          svg.parentNode.insertBefore(p, svg);
        }
      }
      return;
    }
    var W = svg.parentNode.clientWidth || 320;
    var H = Math.round(W * (W < 600 ? (mapFocus ? 0.85 : 0.6) : 0.5));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    var proj = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'FeatureCollection', features: world });
    var pinR = W < 500 ? 10 : 11;
    var lonlat = function (r) { return [r.published.location.lon, r.published.location.lat]; };
    if (mapFocus) {
      var fp = list.filter(function (r) { return mapFocus.indexOf(r.incident_id) >= 0; }).map(function (r) { return proj(lonlat(r)); });
      if (fp.length) {
        var xs = fp.map(function (q) { return q[0]; }), ys = fp.map(function (q) { return q[1]; });
        var bw = Math.max(1, d3.max(xs) - d3.min(xs)), bh = Math.max(1, d3.max(ys) - d3.min(ys));
        var padZ = Math.max(pinR * 5, Math.min(W, H) * 0.26);
        var k = Math.min(5, Math.max(1.8, Math.min((W - 2 * padZ) / bw, (H - 2 * padZ) / bh)));
        var c = [(d3.max(xs) + d3.min(xs)) / 2, (d3.max(ys) + d3.min(ys)) / 2];
        var t0 = proj.translate();
        proj.scale(proj.scale() * k).translate([W / 2 - k * (c[0] - t0[0]), H / 2 - k * (c[1] - t0[1])]);
      } else mapFocus = null;
    }
    proj.clipExtent([[0, 0], [W, H]]);
    var path = d3.geoPath(proj);
    var pts = list.map(function (r) {
      var xy = proj(lonlat(r));
      return { r: r, id: r.incident_id, n: incNum(r.incident_id), x: xy[0], y: xy[1] };
    }).filter(function (q) { return q.x > -pinR && q.x < W + pinR && q.y > -pinR && q.y < H + pinR; });
    var groups = clusterPoints(pts, pinR * 2.3);

    var h = [];
    var gd = path(d3.geoGraticule10());
    if (gd) h.push('<path class="grat" d="' + gd + '"/>');
    h.push('<g>' + world.map(function (f) { var d = path(f); return d ? '<path class="land" d="' + d + '"/>' : ''; }).join('') + '</g>');
    var expanded = null;
    groups.forEach(function (g) {
      if (g.pts.length === 1) h.push(pinMarkup(g.pts[0], g.pts[0].x, g.pts[0].y, pinR));
      else if (expandedCluster && expandedCluster === g.key) expanded = g;
      else {
        var ids = g.pts.map(function (p) { return p.n; }).join(', ');
        h.push('<g class="pin cluster" role="button" tabindex="0" data-cluster="' + g.key + '" transform="translate(' + g.x.toFixed(1) + ',' + g.y.toFixed(1) + ')" aria-label="' + g.pts.length + ' incidents grouped here: ' + ids + '. Expand">' +
          '<circle class="ring" r="' + (pinR + 5) + '"/><circle class="stack2" cx="4" cy="-4" r="' + (pinR + 1) + '"/><circle class="stack1" cx="2" cy="-2" r="' + (pinR + 1) + '"/><circle class="dot" r="' + (pinR + 1) + '"/><text>' + g.pts.length + '</text></g>');
      }
    });
    if (expanded) {
      var n = expanded.pts.length;
      var rad = Math.max(pinR * 2.8, (n * (pinR * 2 + 6)) / (2 * Math.PI));
      var cx = Math.min(Math.max(expanded.x, rad + pinR + 4), W - rad - pinR - 4);
      var cy = Math.min(Math.max(expanded.y, rad + pinR + 4), H - rad - pinR - 4);
      h.push('<g class="fan"><circle class="fan-bg" cx="' + cx + '" cy="' + cy + '" r="' + (rad + pinR + 4) + '" data-collapse="1"/>');
      expanded.pts.forEach(function (p, i) {
        var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        var fx = cx + rad * Math.cos(a), fy = cy + rad * Math.sin(a);
        h.push('<line class="leader" x1="' + p.x.toFixed(1) + '" y1="' + p.y.toFixed(1) + '" x2="' + fx.toFixed(1) + '" y2="' + fy.toFixed(1) + '"/><circle class="anchor" r="2" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '"/>');
      });
      expanded.pts.forEach(function (p, i) {
        var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        h.push(pinMarkup(p, cx + rad * Math.cos(a), cy + rad * Math.sin(a), pinR));
      });
      h.push('</g>');
    }
    svg.innerHTML = h.join('');
    var zb = $('mapzoomout');
    zb.hidden = !mapFocus;
    zb.onclick = function () { mapFocus = null; expandedCluster = null; renderMap(); svg.focus(); };
    svg.onclick = function (e) {
      var pin = e.target.closest('.pin');
      if (!pin) { if (expandedCluster) { expandedCluster = null; renderMap(); } return; }
      if (pin.dataset.cluster) {
        var g = groups.find(function (x) { return x.key === pin.dataset.cluster; });
        var spread = g ? Math.max.apply(null, g.pts.map(function (q) { return Math.hypot(q.x - g.x, q.y - g.y); })) : 0;
        if (g && spread > 1.5) { mapFocus = g.pts.map(function (q) { return q.id; }); expandedCluster = null; renderMap(); focusFirstPin(); }
        else { expandedCluster = pin.dataset.cluster; renderMap(); focusFirstFan(); }
        return;
      }
      if (pin.dataset.id) openCase(pin.dataset.id, { trigger: pin });
    };
    svg.onkeydown = function (e) {
      if (e.key === 'Escape' && !expandedCluster && mapFocus && !openId) { mapFocus = null; renderMap(); svg.focus(); return; }
      if (e.key === 'Escape' && expandedCluster && !openId) { var k = expandedCluster; expandedCluster = null; renderMap(); var c = svg.querySelector('[data-cluster="' + k + '"]'); if (c) c.focus(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var pin = e.target.closest('.pin'); if (!pin) return;
      e.preventDefault(); pin.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    if (openId) markMapSelection(false);
  }
  function focusFirstPin() { var f = document.querySelector('#map .pin'); if (f) f.focus(); }
  function focusFirstFan() { var f = document.querySelector('#map .fan .pin'); if (f) f.focus(); }
  function pinMarkup(p, x, y, r) {
    var loc = p.r.published.location;
    return '<g class="pin' + (p.id === openId ? ' sel' : '') + '" role="button" tabindex="0" data-id="' + esc(p.id) + '" transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')" aria-label="' + esc('Incident ' + p.n + ', ' + placeName(loc.label) + ': ' + (p.r.published.title || '')) + '">' +
      '<circle class="ring" r="' + (r + 3) + '"/><circle class="dot" r="' + r + '"/><text>' + p.n + '</text></g>';
  }
  function clusterPoints(pts, dist) {
    var groups = [];
    pts.forEach(function (p) {
      var g = groups.find(function (g) { return Math.hypot(g.x - p.x, g.y - p.y) < dist; });
      if (g) { g.pts.push(p); g.x = d3.mean(g.pts, function (q) { return q.x; }); g.y = d3.mean(g.pts, function (q) { return q.y; }); }
      else groups.push({ pts: [p], x: p.x, y: p.y });
    });
    var merged = true;
    while (merged) {
      merged = false;
      for (var i = 0; i < groups.length && !merged; i++) for (var j = i + 1; j < groups.length; j++) {
        if (Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) < dist) {
          groups[i].pts = groups[i].pts.concat(groups[j].pts);
          groups[i].x = d3.mean(groups[i].pts, function (q) { return q.x; });
          groups[i].y = d3.mean(groups[i].pts, function (q) { return q.y; });
          groups.splice(j, 1); merged = true; break;
        }
      }
    }
    groups.forEach(function (g) { g.key = g.pts.map(function (p) { return p.n; }).sort(function (a, b) { return a - b; }).join('-'); });
    return groups;
  }
  function renderLegend(list) {
    if (!list.length) { $('legend').innerHTML = '<li class="empty" style="grid-column:1/-1">No pinned incidents match these filters.</li>'; return; }
    $('legend').innerHTML = list.map(function (r) {
      var p = r.published;
      return '<li><button type="button" data-id="' + esc(r.incident_id) + '" title="' + esc(p.title || '') + '"><span class="num">' + incNum(r.incident_id) + '</span><span><span class="place">' + esc(placeName(p.location.label)) + '</span><span class="ttl">' + esc(p.title || r.incident_id) + '</span></span></button></li>';
    }).join('');
  }
  function markMapSelection(pulse) {
    var svg = $('map');
    Array.prototype.forEach.call(svg.querySelectorAll('.pin[data-id]'), function (g) { g.classList.toggle('sel', g.dataset.id === openId); });
    if (!pulse || reduceMotion || !openId) return;
    var target = svg.querySelector('.pin[data-id="' + openId + '"]');
    if (!target) {
      var n = incNum(openId);
      target = Array.prototype.find.call(svg.querySelectorAll('.pin[data-cluster]'), function (c) { return c.dataset.cluster.split('-').indexOf(String(n)) >= 0; });
    }
    if (!target) return;
    var ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('class', 'pulse-ring'); ring.setAttribute('r', '11');
    target.insertBefore(ring, target.firstChild);
    setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 1300);
  }

  /* ---------- Timeline ---------- */
  function renderTimeline() {
    var svg = $('timeline');
    var W = svg.parentNode.clientWidth - 16 || 300;
    var dated = D.rows.filter(function (r) { return !isNaN(r._t); }).slice().sort(function (a, b) { return a._t - b._t || incNum(a.incident_id) - incNum(b.incident_id); });
    if (!dated.length) { svg.innerHTML = ''; return; }
    var startT = parseDay(SAMPLE_START);
    var refs = dated.filter(function (r) { return r._t < startT; });
    var main = dated.filter(function (r) { return r._t >= startT; });
    var pad = 14;
    var refW = refs.length ? Math.min(150, Math.max(70, W * 0.16)) : 0;
    var gap = refs.length ? 22 : 0;
    var x0 = pad + refW + gap, x1 = W - pad;
    var s0 = new Date(startT); var mStart = Date.UTC(s0.getUTCFullYear(), s0.getUTCMonth(), 1);
    var lastT = Math.max(todayUTC, main.length ? main[main.length - 1]._t : startT);
    var le = new Date(lastT); var mEnd = Date.UTC(le.getUTCFullYear(), le.getUTCMonth() + 1, 1);
    var sx = function (t) { return x0 + (t - mStart) / (mEnd - mStart) * (x1 - x0); };
    var mw = W < 500 ? 7 : 8, mh = W < 500 ? 11 : 12, rowH = mh + 3;
    var rows = [];
    function place(x) {
      for (var i = 0; i < rows.length; i++) if (x - rows[i] >= mw + 2) { rows[i] = x; return i; }
      rows.push(x); return rows.length - 1;
    }
    var marks = [];
    refs.forEach(function (r, i) {
      var x = pad + (refs.length === 1 ? refW / 2 : (i + 0.5) * refW / refs.length);
      marks.push({ r: r, x: x, row: 0 });
    });
    main.forEach(function (r) { var x = sx(r._t); marks.push({ r: r, x: x, row: place(x) }); });
    var maxRow = Math.max.apply(null, marks.map(function (m) { return m.row; }).concat([0]));
    var top = 22, axisY = top + (maxRow + 1) * rowH + 6, H = axisY + 40;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);

    var fset = {}; filtered().forEach(function (r) { fset[r.incident_id] = 1; });
    var h = [];
    h.push('<line class="axis" x1="' + x0 + '" x2="' + x1 + '" y1="' + axisY + '" y2="' + axisY + '"/>');
    if (refs.length) {
      h.push('<line class="axis" x1="' + pad + '" x2="' + (pad + refW) + '" y1="' + axisY + '" y2="' + axisY + '"/>');
      var bx = pad + refW + gap / 2;
      h.push('<line class="brk" x1="' + (bx - 5) + '" y1="' + (axisY + 5) + '" x2="' + (bx - 1) + '" y2="' + (axisY - 5) + '"/><line class="brk" x1="' + (bx + 1) + '" y1="' + (axisY + 5) + '" x2="' + (bx + 5) + '" y2="' + (axisY - 5) + '"/>');
      var y1 = new Date(refs[0]._t).getUTCFullYear(), y2 = new Date(refs[refs.length - 1]._t).getUTCFullYear();
      var yl = y1 === y2 ? String(y1) : y1 + ' to ' + y2;
      h.push('<text class="seglabel" x="' + pad + '" y="12">EARLIER</text>');
      h.push('<text class="mlabel" x="' + (pad + refW / 2) + '" y="' + (axisY + 16) + '">' + yl + '</text>');
      var rc = refs.filter(function (r) { return fset[r.incident_id]; }).length;
      h.push('<text class="mcount" x="' + (pad + refW / 2) + '" y="' + (axisY + 31) + '">' + rc + '</text>');
    }
    h.push('<text class="seglabel" x="' + x0 + '" y="12">' + ((x1 - x0) < 250 ? 'FROM ' : 'SAMPLE WINDOW FROM ') + esc(fmtDay(SAMPLE_START).toUpperCase()) + '</text>');
    var monthW = (x1 - x0) / Math.max(1, Math.round((mEnd - mStart) / (30.44 * DAY)));
    for (var t = mStart; t < mEnd;) {
      var d = new Date(t), nx = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      var xa = sx(t), xb = sx(nx);
      h.push('<line class="tick" x1="' + xa + '" x2="' + xa + '" y1="' + (axisY - 4) + '" y2="' + (axisY + 4) + '"/>');
      var cnt = main.filter(function (r) { return r._t >= t && r._t < nx && fset[r.incident_id]; }).length;
      var lab = MONTHS[d.getUTCMonth()];
      if (monthW < 30) lab = lab.charAt(0);
      if (d.getUTCMonth() === 0) lab += ' ' + String(d.getUTCFullYear()).slice(2);
      h.push('<text class="mlabel" x="' + ((xa + xb) / 2) + '" y="' + (axisY + 16) + '">' + lab + '</text>');
      h.push('<text class="mcount" x="' + ((xa + xb) / 2) + '" y="' + (axisY + 31) + '">' + cnt + '</text>');
      t = nx;
    }
    var tx = sx(todayUTC);
    if (tx <= x1 && tx >= x0) h.push('<line class="today" x1="' + tx + '" x2="' + tx + '" y1="18" y2="' + axisY + '"><title>Today</title></line>');
    marks.forEach(function (m) {
      var r = m.r, y = axisY - 6 - mh - m.row * rowH;
      var dim = !fset[r.incident_id];
      h.push('<g class="mark' + (r._new ? ' isnew' : '') + (dim ? ' dim' : '') + (r.incident_id === openId ? ' sel' : '') + '" role="button" ' + (dim ? 'tabindex="-1" aria-hidden="true"' : 'tabindex="0"') + ' data-id="' + esc(r.incident_id) + '" aria-label="' + esc(r.incident_id + ', disclosed ' + fmtDay(r.published.disclosed_on) + ': ' + (r.published.title || '')) + '">' +
        '<rect class="hit" x="' + (m.x - mw / 2 - 2) + '" y="' + (y - 2) + '" width="' + (mw + 4) + '" height="' + (mh + 4) + '"/>' +
        '<rect class="m" x="' + (m.x - mw / 2) + '" y="' + y + '" width="' + mw + '" height="' + mh + '" rx="1.5"/><title>' + esc(r.incident_id + ' / ' + fmtDay(r.published.disclosed_on)) + '</title></g>');
    });
    svg.innerHTML = h.join('');
    svg.onclick = function (e) { var g = e.target.closest('.mark'); if (g && !g.classList.contains('dim')) openCase(g.dataset.id, { trigger: g }); };
    svg.onkeydown = function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var g = e.target.closest('.mark'); if (!g) return;
      e.preventDefault(); openCase(g.dataset.id, { trigger: g });
    };
  }

  /* ---------- Case file ---------- */
  function navList() {
    var list = filtered();
    if (openId && !list.some(function (r) { return r.incident_id === openId; })) list = D.rows;
    return list;
  }
  function updateCaseNav() {
    var list = navList();
    var i = list.findIndex(function (r) { return r.incident_id === openId; });
    $('case-pos').textContent = i >= 0 ? (i + 1) + ' of ' + list.length + (list.length !== D.rows.length ? ' filtered' : '') : '';
    $('case-prev').disabled = i <= 0;
    $('case-next').disabled = i < 0 || i >= list.length - 1;
    var fb = document.querySelectorAll('.case-foot .btn');
    if (fb.length === 2) { fb[0].disabled = $('case-prev').disabled; fb[1].disabled = $('case-next').disabled; }
  }
  function step(dir) {
    var list = navList();
    var i = list.findIndex(function (r) { return r.incident_id === openId; });
    var nx = list[i + dir];
    if (nx) openCase(nx.incident_id, { replace: true });
  }

  function openCase(id, opts) {
    opts = opts || {};
    var r = D.byId[id]; if (!r) return;
    var wasOpen = !!openId;
    if (!wasOpen) lastTrigger = opts.trigger || document.activeElement;
    openId = id;
    $('case-body').innerHTML = caseMarkup(r);
    $('case-body').scrollTop = 0;
    $('case').classList.add('on'); $('case').setAttribute('aria-hidden', 'false');
    $('scrim').classList.add('on');
    document.body.classList.add('locked');
    updateCaseNav();
    if (!opts.fromHash && location.hash !== '#' + id) {
      if (wasOpen || opts.replace) history.replaceState(null, '', '#' + id);
      else { history.pushState(null, '', '#' + id); pushedHash = true; }
    }
    Array.prototype.forEach.call(document.querySelectorAll('.tile'), function (t) { t.classList.toggle('sel', t.dataset.id === id); });
    Array.prototype.forEach.call(document.querySelectorAll('#timeline .mark'), function (g) { g.classList.toggle('sel', g.dataset.id === id); });
    markMapSelection(true);
    requestAnimationFrame(function () { setTimeout(function () { var h = $('case-title'); if (h && openId === id) h.focus({ preventScroll: true }); }, 30); });
  }
  function closeCase(opts) {
    opts = opts || {};
    if (!openId) return;
    openId = null;
    $('case').classList.remove('on'); $('case').setAttribute('aria-hidden', 'true');
    $('scrim').classList.remove('on');
    document.body.classList.remove('locked');
    if (!opts.fromHash) {
      if (pushedHash) { pushedHash = false; history.back(); }
      else history.replaceState(null, '', location.pathname + location.search);
    } else pushedHash = false;
    Array.prototype.forEach.call(document.querySelectorAll('.tile.sel, #timeline .mark.sel'), function (t) { t.classList.remove('sel'); });
    markMapSelection(false);
    if (lastTrigger && document.contains(lastTrigger) && lastTrigger.focus) lastTrigger.focus({ preventScroll: false });
    lastTrigger = null;
  }
  function syncHash() {
    var m = /^#(INC\d+)$/i.exec(location.hash || '');
    var id = m ? m[1].toUpperCase() : null;
    if (id && D.byId[id]) { if (openId !== id) openCase(id, { fromHash: true }); }
    else if (openId) closeCase({ fromHash: true });
  }
  function trapFocus(e) {
    var nodes = Array.prototype.filter.call($('case').querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), h2[tabindex]'), function (n) { return n.offsetParent !== null || n === document.activeElement; });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (!$('case').contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function linkMarkers(text, id, srcIds) {
    return esc(text).replace(/\[(S\d+)([^\]]*)\]/g, function (all, sid, rest) {
      if (srcIds.indexOf(sid) < 0) return all;
      return '<a class="mk" href="#src-' + esc(id) + '-' + sid + '" data-target="src-' + esc(id) + '-' + sid + '" aria-label="Source ' + sid + esc(rest) + '">[' + sid + rest + ']</a>';
    });
  }
  function listItems(items, cls) {
    items = arr(items); if (!items.length) return '';
    return '<ul class="cf-list ' + (cls || '') + '">' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }

  function caseMarkup(r) {
    var p = r.published, id = r.incident_id, a = p.authority || {};
    var srcs = arr(p.sources);
    var srcIds = srcs.map(function (s) { return s.id; });
    var h = [];
    var sectionN = 0;
    function sec(title, body, extra) {
      if (!body) return '';
      sectionN++;
      return '<section class="cf-sec"><h3><span class="step">' + String(sectionN).padStart(2, '0') + '</span>' + title + (extra || '') + '</h3>' + body + '</section>';
    }

    // Head
    h.push('<header class="case-head">');
    h.push('<div class="chips"><span class="chip">' + esc(id) + '</span>' + (r._new ? '<span class="chip new">Disclosed in the last 3 days</span>' : '') +
      (a.status ? '<span class="chip auth-' + esc(a.status) + '">' + esc(authLabel(a.status)) + '</span>' : '') +
      (p.deployment ? '<span class="chip">' + esc(depLabel(p.deployment)) + '</span>' : '') + '</div>');
    h.push('<h2 id="case-title" tabindex="-1">' + esc(p.title || id) + '</h2>');
    if (p.defect_category || p.defect_label) h.push('<div class="defect-line">' + icon(p.defect_category) + '<span>' + esc(p.defect_label || humanize(p.defect_category)) + '</span></div>');
    if (has(p.summary)) h.push('<p class="summary">' + esc(p.summary) + '</p>');
    if (has(p.cluster)) {
      var mates = D.rows.filter(function (x) { return x.published.cluster === p.cluster; }).sort(function (x, y) { return incNum(x.incident_id) - incNum(y.incident_id); });
      if (mates.length > 1) {
        h.push('<div class="cluster-box"><span class="label">Related incidents / ' + mates.length + ' in this group</span><p class="cl-name">' + esc(clusterName(p.cluster)) + '</p><div class="cl-list">' +
          mates.map(function (x) { return '<button type="button" data-goto="' + esc(x.incident_id) + '"' + (x.incident_id === id ? ' aria-current="true"' : '') + ' title="' + esc(x.published.title || '') + '">' + esc(x.incident_id) + '</button>'; }).join('') + '</div></div>');
      } else {
        h.push('<div class="cluster-box"><span class="label">Group</span><p class="cl-name" style="margin-bottom:0">' + esc(clusterName(p.cluster)) + '</p></div>');
      }
    }
    // Facts strip
    var fs = [];
    function fact(label, val, small, wide) { if (has(val)) fs.push('<div' + (wide ? ' class="wide"' : '') + '><dt>' + label + '</dt><dd>' + esc(val) + (has(small) ? '<small>' + esc(small) + '</small>' : '') + '</dd></div>'); }
    fact('Organization', p.organization, null, true);
    fact('System', p.system);
    fact('Workflow', p.workflow);
    fact('Incident date', p.incident_date, p.incident_date_basis);
    fact('Disclosed', p.disclosed_on ? fmtDay(p.disclosed_on) : '', p.disclosed_basis);
    if (p.location && has(p.location.label)) fact('Location', p.location.label, p.location.basis, true);
    var nrep = arr(r.report_ids).length;
    if (nrep) fact('Reports merged', String(nrep), r.last_updated ? 'Last updated ' + fmtDay(r.last_updated) : null);
    var run = 0;
    fs.forEach(function (x, i) {
      if (x.indexOf('<div class="wide">') === 0) { if (run % 2 === 1) { var pi = i - 1; fs[pi] = fs[pi].replace(/^<div>/, '<div class="wide">'); } run = 0; }
      else run++;
    });
    if (run % 2 === 1) fs[fs.length - 1] = fs[fs.length - 1].replace(/^<div>/, '<div class="wide">');
    if (fs.length) h.push('<dl class="facts-strip">' + fs.join('') + '</dl>');
    h.push('</header>');

    // What happened
    var act = p.actions || {};
    var wh = '';
    if (has(p.why_it_mattered)) wh += '<p class="why">' + esc(p.why_it_mattered) + '</p>';
    if (arr(act.completed).length) wh += '<h4>Actions completed</h4>' + listItems(act.completed, 'done');
    if (arr(act.attempted).length) wh += '<h4>Actions attempted</h4>' + listItems(act.attempted);
    if (arr(p.consequences).length) wh += '<h4>Consequences</h4>' + listItems(p.consequences);
    h.push(sec('What happened', wh));

    // Controls stack
    var ctr = arr(p.controls).filter(function (c) { return c && (has(c.control) || has(c.failure)); });
    if (ctr.length) {
      var cs = '<p style="color:var(--text-muted);font-size:0.9rem">Each card is one control, with how it held or failed.</p><ol class="stack">' + ctr.map(function (c, i) {
        return '<li><span class="lvl" aria-hidden="true">' + (i + 1) + '</span><div class="card">' +
          (has(c.control) ? '<div class="c">' + esc(c.control) + '</div>' : '') +
          (has(c.failure) ? '<div class="f">' + esc(c.failure) + '</div>' : '') +
          (has(c.basis) ? '<div class="b">' + basisTag(c.basis) + '</div>' : '') + '</div></li>';
      }).join('') + '</ol><div class="stack-end">Action executed</div>';
      h.push(sec('Controls that existed', cs));
    }

    // Authority
    var au = '';
    if (a.status) au += '<div class="auth-big"><span class="chip auth-' + esc(a.status) + '">' + esc(authLabel(a.status)) + '</span></div>';
    if (has(a.statement)) au += '<p>' + esc(a.statement) + '</p>';
    var tri = '';
    if (arr(a.present).length) tri += '<div class="present"><h5>Present</h5><ul>' + arr(a.present).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    if (arr(a.absent).length) tri += '<div class="absent"><h5>Absent</h5><ul>' + arr(a.absent).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    if (arr(a.unknown).length) tri += '<div class="unknown"><h5>Unknown</h5><ul>' + arr(a.unknown).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    if (tri) au += '<div class="tri">' + tri + '</div>';
    if (has(a.basis)) au += '<p class="basis">' + esc(a.basis) + '</p>';
    h.push(sec('What authority applied', au));

    // Evidence
    var ev = '';
    if (arr(p.facts).length) ev += '<h4>Facts</h4><ul class="ev-list">' + arr(p.facts).map(function (t) { return '<li><span class="tag-doc">Documented</span><span>' + linkMarkers(t, id, srcIds) + '</span></li>'; }).join('') + '</ul>';
    if (arr(p.inferences).length) ev += '<h4>Reasoning</h4><ul class="ev-list inf">' + arr(p.inferences).map(function (t) { return '<li><span class="tag-inf">Inference</span><span>' + linkMarkers(t, id, srcIds) + '</span></li>'; }).join('') + '</ul>';
    if (has(p.evidence_strength) || has(p.evidence_note)) {
      var lvl = { limited: 1, moderate: 2, strong: 3 }[p.evidence_strength] || 0;
      ev += '<div class="strength"><span class="label">Evidence strength</span>' + (lvl ? '<span class="meter" aria-hidden="true"><i class="on"></i><i' + (lvl > 1 ? ' class="on"' : '') + '></i><i' + (lvl > 2 ? ' class="on"' : '') + '></i></span>' : '') +
        (has(p.evidence_strength) ? '<span class="mono" style="color:var(--white)">' + esc(humanize(p.evidence_strength)) + '</span>' : '') +
        (has(p.evidence_note) ? '<span>' + esc(p.evidence_note) + '</span>' : '') + '</div>';
    }
    h.push(sec('Documented and inferred', ev));

    // Enforcement (Proposed)
    var en = p.enforcement || {};
    if (Object.keys(en).some(function (k) { return has(en[k]); })) {
      var arrow = '<svg class="garrow" viewBox="0 0 22 12" aria-hidden="true"><path d="M1 6h18M15 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
      var e = '<div class="enf">';
      e += '<div class="gate-diagram" role="img" aria-label="' + esc('Proposed enforcement: the AI action is held at the enforcement point with decision state ' + (en.decision_state || 'not stated') + ' before it reaches execution.') + '">' +
        '<div class="gnode"><b>AI action</b>' + esc(p.system ? 'From ' + p.system : 'Agent output') + '</div>' + arrow +
        '<div class="gnode gate">' + icon('gate') + '<b>Decision state</b><span class="state">' + esc(en.decision_state || 'Not stated') + '</span></div>' + arrow +
        (has(en.responsible_role) ? '<div class="gnode"><b>Decided by</b>' + esc(en.responsible_role) + '</div></div>' : '<div class="gnode"><b>Next</b>Held for a named decision</div></div>');
      var rowsE = [
        ['Enforcement point', en.enforcement_point], ['Condition', en.condition], ['Reason', en.reason],
        ['Authority required', en.authority_requirement], ['Responsible role', en.responsible_role, 'role'],
        ['Responder action', en.responder_action], ['Required response', en.required_response], ['Next event', en.next_event]
      ].filter(function (x) { return has(x[1]); });
      e += '<dl>' + rowsE.map(function (x) { return '<div' + (x[2] ? ' class="' + x[2] + '"' : '') + '><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
      e += '<p class="enf-note">Proposed: a decision governance outcome, not a finding of fact.</p></div>';
      h.push(sec('Where DAL-X would have enforced', e, ' <span class="tag-prop">Proposed</span>'));
    }

    // Rules
    var rules = arr(p.rules).filter(function (x) { return x && has(x.name); });
    if (rules.length) {
      h.push(sec('Rules that applied', '<ul class="rules">' + rules.map(function (x) {
        var meta = [x.issuer, x.level, x.scope].filter(has).map(esc).join(' / ');
        return '<li><div class="rn">' + (has(x.url) ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.name) + '</a>' : esc(x.name)) + '</div>' +
          (meta ? '<div class="rm">' + meta + '</div>' : '') +
          (has(x.applicability) ? '<p>' + esc(x.applicability) + '</p>' : '') +
          (has(x.uncertainty) ? '<p><span class="label">Uncertainty</span> ' + esc(x.uncertainty) + '</p>' : '') + '</li>';
      }).join('') + '</ul>'));
    }

    // Sources
    if (srcs.length) {
      h.push(sec('Sources', '<ol class="srcs">' + srcs.map(function (s) {
        var meta = [s.type, s.published ? 'Published ' + fmtDay(s.published) : '', s.retrieved ? 'Retrieved ' + fmtDay(s.retrieved) : '', s.report_id ? 'Report ' + s.report_id : ''].filter(has).map(esc).join(' / ');
        return '<li id="src-' + esc(id) + '-' + esc(s.id) + '"><span class="sid">' + esc(s.id || '') + '</span><div><div class="sn">' + (has(s.url) ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name || s.url) + '</a>' : esc(s.name || '')) + '</div>' + (meta ? '<div class="sm">' + meta + '</div>' : '') + '</div></li>';
      }).join('') + '</ol>'));
    }
    h.push('<div class="case-foot"><button class="btn" type="button" onclick="document.getElementById(\'case-prev\').click()">Previous</button><button class="btn primary" type="button" onclick="document.getElementById(\'case-next\').click()">Next</button></div>');
    return h.join('');
  }
  function basisTag(b) {
    var s = String(b).toLowerCase();
    if (s === 'documented') return '<span class="tag-doc">Documented</span>';
    if (s === 'inference' || s === 'inferred') return '<span class="tag-inf">Inference</span>';
    return '<span class="chip">' + esc(humanize(b)) + '</span>';
  }
})();
