#!/usr/bin/env node
// Validates the Let's Talk About It data files before any commit.
// Usage: node scripts/validate-incidents.mjs [incidents.json] [context.json]
// Exit code 0 means safe to commit. Any other code means do not commit.
import fs from 'node:fs';

const DIR = 'public/weekly/lets-talk-about-it';
const incPath = process.argv[2] || `${DIR}/incidents.json`;
const ctxPath = process.argv[3] || `${DIR}/context.json`;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function load(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { err(`${p}: cannot parse JSON (${e.message})`); return null; }
}

const DEFECTS = {
  boundary_unenforced: 'Agent acted outside its authorized environment',
  external_output_unverified: 'Unverified AI output released to an outside party',
  irreversible_unverified: 'Irreversible action without a verified precondition',
  unverified_release: 'Unverified change released through automation',
  requester_unverified: 'Account control changed without verifying the requester',
  unbounded_execution: 'Agent ran without a spend or iteration limit',
  human_review_absent: 'Decision affecting a person executed without human review',
};
const AUTH = ['exceeded', 'unverified', 'missing'];
const DEPLOY = ['deployed', 'evaluation_real_systems', 'research_simulation'];
const STRENGTH = ['strong', 'moderate', 'limited'];
const REQUIRED = ['title', 'summary', 'why_it_mattered', 'organization', 'system', 'workflow',
  'incident_date', 'disclosed_on', 'authority', 'defect_category', 'defect_label', 'deployment',
  'evidence_strength', 'facts', 'enforcement', 'location', 'sources'];
const ENFORCEMENT = ['enforcement_point', 'decision_state', 'responsible_role', 'next_event'];

// Text checks applied to every string the agent writes.
const DASH = /[\u2013\u2014]/;
const OPENER = /(?:^|[.!?]["')\]]?\s+)(And|But|Or|That|Then)\s/;

function walkStrings(o, path, fn) {
  if (typeof o === 'string') fn(o, path);
  else if (Array.isArray(o)) o.forEach((v, i) => walkStrings(v, `${path}[${i}]`, fn));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walkStrings(v, `${path}.${k}`, fn);
}

const inc = load(incPath);
const ctx = load(ctxPath);

if (inc) {
  for (const k of ['updated', 'last_check', 'next_incident_number', 'next_report_number', 'excluded_candidates', 'rows']) {
    if (!(k in inc)) err(`incidents.json: missing top level field "${k}"`);
  }
  const rows = Array.isArray(inc.rows) ? inc.rows : [];
  const ids = new Set();
  let maxInc = 0, maxRep = 0;
  const sourceIndex = new Map(); // S id -> url, to catch one id used for two different sources

  rows.forEach((r, i) => {
    const where = r.incident_id || `rows[${i}]`;
    if (!/^INC\d{4}$/.test(r.incident_id || '')) err(`${where}: incident_id must look like INC0001`);
    if (ids.has(r.incident_id)) err(`${where}: duplicate incident_id`);
    ids.add(r.incident_id);
    maxInc = Math.max(maxInc, parseInt(String(r.incident_id).slice(3), 10) || 0);
    if (!Array.isArray(r.report_ids) || r.report_ids.length === 0) err(`${where}: report_ids must be a non empty array`);
    (r.report_ids || []).forEach((rid) => {
      if (!/^R\d{4}$/.test(rid)) err(`${where}: report id "${rid}" must look like R0001`);
      maxRep = Math.max(maxRep, parseInt(String(rid).slice(1), 10) || 0);
    });
    if (r.review_status !== 'published') warn(`${where}: review_status is "${r.review_status}", page will hide it`);
    for (const k of ['last_updated', 'snapshot_at', 'published_version', 'schema_version', 'published']) {
      if (!(k in r)) err(`${where}: missing "${k}"`);
    }
    const p = r.published || {};
    for (const k of REQUIRED) if (!(k in p) || p[k] === '' || p[k] == null) err(`${where}: published.${k} is missing or empty`);

    if (p.authority && !AUTH.includes(p.authority.status)) err(`${where}: authority.status "${p.authority && p.authority.status}" is not one of ${AUTH.join(', ')}`);
    if (p.defect_category && !(p.defect_category in DEFECTS)) err(`${where}: unknown defect_category "${p.defect_category}" (new categories need Kevin's approval)`);
    else if (p.defect_category && p.defect_label !== DEFECTS[p.defect_category]) err(`${where}: defect_label does not match the label for ${p.defect_category}`);
    if (p.deployment && !DEPLOY.includes(p.deployment)) err(`${where}: unknown deployment "${p.deployment}"`);
    if (p.evidence_strength && !STRENGTH.includes(p.evidence_strength)) err(`${where}: unknown evidence_strength "${p.evidence_strength}"`);
    if (p.disclosed_on && isNaN(Date.parse(p.disclosed_on))) err(`${where}: disclosed_on "${p.disclosed_on}" is not a date`);

    const e = p.enforcement || {};
    for (const k of ENFORCEMENT) if (!e[k]) err(`${where}: enforcement.${k} is missing`);
    if (e.responsible_role && !/\(proposed roles?\)/i.test(e.responsible_role)) err(`${where}: enforcement.responsible_role must be marked "(proposed role)" or "(proposed roles)"`);

    const loc = p.location || {};
    if (loc.documented === true) {
      if (typeof loc.lat !== 'number' || typeof loc.lon !== 'number') err(`${where}: documented location needs numeric lat and lon`);
      else if (Math.abs(loc.lat) > 90 || Math.abs(loc.lon) > 180) err(`${where}: lat or lon out of range`);
    } else if (loc.documented === false) {
      if (loc.lat != null || loc.lon != null) err(`${where}: undocumented location must have null lat and lon`);
    } else err(`${where}: location.documented must be true or false`);

    const srcIds = new Set();
    (p.sources || []).forEach((s) => {
      if (!/^S\d+$/.test(s.id || '')) err(`${where}: source id "${s.id}" must look like S1`);
      if (!/^https?:\/\//.test(s.url || '')) err(`${where}: source ${s.id} needs an http url`);
      // Rule sources (policies, statutes) carry report_id null; incident reports carry R0001 style ids.
      const isRuleSource = /rule source/i.test(s.type || '');
      if (s.report_id == null) { if (!isRuleSource) err(`${where}: source ${s.id} needs a report_id like R0001 (only rule sources may leave it null)`); }
      else if (!/^R\d{4}$/.test(s.report_id)) err(`${where}: source ${s.id} report_id "${s.report_id}" must look like R0001`);
      if (sourceIndex.has(s.id) && sourceIndex.get(s.id) !== s.url) err(`${where}: source id ${s.id} is already used for a different url`);
      sourceIndex.set(s.id, s.url);
      srcIds.add(s.id);
    });
    (p.facts || []).forEach((f, j) => {
      // Markers look like [S2], [S2, S3], or with a pinpoint such as [S5 para 15].
      const marks = String(f).match(/\[(S\d+)[^\]]*\]/g) || [];
      if (marks.length === 0) err(`${where}: facts[${j}] has no [S#] source marker`);
      marks.forEach((m) => (m.match(/S\d+/g) || []).forEach((sid) => { if (!srcIds.has(sid)) err(`${where}: facts[${j}] cites ${sid}, which is not in this incident's sources`); }));
    });

    walkStrings(p, `${where}.published`, (s, path) => {
      if (DASH.test(s)) err(`${path}: contains an em dash or en dash`);
      const m = s.match(OPENER);
      if (m) err(`${path}: a sentence begins with "${m[1]}"`);
    });
  });

  if (Number(inc.next_incident_number) <= maxInc) err(`next_incident_number (${inc.next_incident_number}) must be greater than the highest incident number (${maxInc})`);
  if (Number(inc.next_report_number) <= maxRep) err(`next_report_number (${inc.next_report_number}) must be greater than the highest report number (${maxRep})`);
  const nums = [...ids].map((x) => parseInt(String(x).slice(3), 10)).sort((a, b) => a - b);
  nums.forEach((n, k) => { if (n !== k + 1) warn(`incident numbers skip at INC${String(k + 1).padStart(4, '0')}`); });
  (inc.excluded_candidates || []).forEach((c, i) => {
    if (!c.name || !c.reason) err(`excluded_candidates[${i}]: needs name and reason`);
  });
}

if (ctx) {
  if (!Array.isArray(ctx.rows)) err('context.json: rows must be an array');
  (ctx.rows || []).forEach((r, i) => {
    for (const k of ['id', 'order', 'figure', 'label', 'source', 'url', 'published', 'kind']) {
      if (r[k] == null || r[k] === '') err(`context.json rows[${i}]: missing "${k}"`);
    }
    walkStrings(r, `context.rows[${i}]`, (s, path) => {
      if (DASH.test(s)) err(`${path}: contains an em dash or en dash`);
      const m = s.match(OPENER);
      if (m) err(`${path}: a sentence begins with "${m[1]}"`);
    });
  });
}

warnings.forEach((w) => console.log(`warning: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.log(`error: ${e}`));
  console.log(`\nFAILED: ${errors.length} error(s). Do not commit.`);
  process.exit(1);
}
console.log(`PASSED: ${inc ? inc.rows.length : 0} incidents, ${ctx ? ctx.rows.length : 0} context figures. Safe to commit.`);
