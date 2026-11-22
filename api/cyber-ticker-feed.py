import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

UTC = timezone.utc
HOUR = 3600
DAY = 24 * HOUR
MAX_BYTES = 5 * 1024 * 1024
SOURCES = {
    'breach': ('California DOJ', 'https://oag.ca.gov/privacy/databreach/list', HOUR),
    'wa': ('Washington AG', 'https://www.atg.wa.gov/data-breach-notifications', HOUR),
    'or': ('Oregon DOJ', 'https://justice.oregon.gov/consumer/databreach/', HOUR),
    'vt': ('Vermont AG', 'https://ago.vermont.gov/categories/security-breach-notices', HOUR),
    'advisory': ('CISA', 'https://www.cisa.gov/cybersecurity-advisories/all.xml', HOUR / 2),
    'hhs': ('HHS Office for Civil Rights', 'https://ocrportal.hhs.gov/ocr/breach/breach_report_hip.jsf', HOUR),
    'ia': ('Iowa Attorney General', 'https://www.iowaattorneygeneral.gov/for-consumers/security-breach-notifications/2026-security-breach-notification', HOUR),
    'ic3': ('FBI / IC3', 'https://www.ic3.gov/CSA/', HOUR),
    'id': ('Idaho Attorney General', 'https://www.ag.idaho.gov/consumer-protection/security-breaches/', HOUR),
    'sc': ('South Carolina Consumer Affairs', 'https://consumer.sc.gov/identity-theft-unit/security-breach-notices', HOUR),
    'kev': ('CISA KEV', 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', HOUR),
}

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def clean(s):
    return ' '.join(s.split())[:220] if isinstance(s, str) else ''


def safe_url(raw, base, prefixes):
    if not raw:
        return ''
    u = urlsplit(urljoin(base, raw))
    if u.scheme == 'https' and u.netloc == urlsplit(base).netloc and u.path.startswith(prefixes):
        return urlunsplit((u.scheme, u.netloc, u.path, '', ''))
    return ''


def timestamp(v):
    t = datetime.fromisoformat(v)
    return t.replace(tzinfo=t.tzinfo or UTC).timestamp()


def parse(key, body):
    _, base, _ = SOURCES[key]
    items = {}
    def add(title, date, url, id=None):
        if title and date and url:
            items[id or url] = dict(id=id or url, title=title, date=date, url=url)
    if key == 'breach':
        for row in BeautifulSoup(body, 'html.parser').select('tbody tr'):
            a = row.select_one('td.views-field-field-sb24-org-name a')
            d = row.select_one('td.views-field-created')
            if a and d:
                try:
                    date = datetime.strptime(clean(d.get_text()), '%m/%d/%Y').date().isoformat()
                    add(clean(a.get_text()), date, safe_url(a.get('href'), base, ('/ecrime/databreach/reports/',)))
                except ValueError:
                    continue
    elif key in ('wa', 'or', 'vt'):
        html = BeautifulSoup(body, 'html.parser')
        expected = {
            'wa': ('Date Reported', 'Organization Name'),
            'or': ('Organization', 'Reported Date'),
            'vt': ('Date Reported to AGO', 'Reporting Organization Name'),
        }[key]
        for table in html.select('table'):
            columns = tuple(clean(h.get_text(' ', strip=True)) for h in table.select('th')[:2])
            if columns != expected:
                continue
            for row in table.select('tbody tr'):
                cells = row.find_all('td', recursive=False)
                if len(cells) < 2:
                    continue
                d, n = (cells[1], cells[0]) if key == 'or' else cells[:2]
                name = clean(n.get_text(' ', strip=True))
                date_text = clean(d.get_text(' ', strip=True))
                try:
                    date = datetime.strptime(date_text, '%m-%d-%Y' if key == 'vt' else '%m/%d/%Y').date().isoformat()
                    link = base
                    if key == 'wa' and n.a:
                        direct = safe_url(n.a.get('href'), 'https://agportal-s3bucket.s3.amazonaws.com/', ('/databreach/',))
                        link = direct if direct.lower().endswith('.pdf') else base
                    elif key == 'or':
                        link = base + '#grid'
                    add(name, date, link, link if key == 'wa' and link != base else f'{key}:{date}:{name.casefold()}')
                except ValueError:
                    continue
    elif key in ('id', 'sc'):
        html = BeautifulSoup(body, 'html.parser')
        for table in html.select('table'):
            first = clean(table.select_one('tr').get_text(' ', strip=True)) if table.select_one('tr') else ''
            required = 'Notifying Agency or Entity' if key == 'id' else 'Organization Name Date Reported'
            if required not in first:
                continue
            for row in table.select('tbody tr'):
                cells = row.find_all('td', recursive=False)
                if len(cells) < 2:
                    continue
                name = clean(cells[0].get_text(' ', strip=True))
                try:
                    date = datetime.strptime(clean(cells[1].get_text()), '%m/%d/%Y').date().isoformat()
                    link = cells[0].select_one('a[href]')
                    prefix = '/content/uploads/' if key == 'id' else '/sites/consumer/files/'
                    url = safe_url(link['href'], base, (prefix,)) if link else ''
                    add(name, date, url or base, url or f'{key}:{date}:{name.casefold()}')
                except ValueError:
                    continue
    elif key in ('hhs', 'ia', 'ic3'):
        html = BeautifulSoup(body, 'html.parser')
        if key == 'hhs':
            for row in html.select('table tbody tr'):
                cols = [clean(c.get_text(' ', strip=True)) for c in row.find_all('td', recursive=False)]
                if len(cols) != 10 or 'hacking/it incident' not in cols[6].lower():
                    continue
                try:
                    date = datetime.strptime(cols[5], '%m/%d/%Y').date().isoformat()
                    if int(cols[4].replace(',', '')) >= 500 and cols[1]:
                        title = f'{cols[1]} ({cols[2]})'
                        add(title, date, base, f'{key}:{date}:{title}')
                except ValueError:
                    continue
        elif key == 'ia':
            for row in html.select('article.sby-record-card'):
                name = row.select_one('.sby-business-name')
                stamp = row.select_one('.sby-date-value')
                link = row.select_one('a.sby-file-link.primary[href]')
                if name and stamp and link:
                    try:
                        date = datetime.strptime(clean(stamp.get_text()), '%m-%d-%Y').date().isoformat()
                        add(clean(name.get_text()), date, safe_url(link['href'], base, ('/media/cms/',)))
                    except ValueError:
                        continue
        else:
            for row in html.select('.usa-collection__item'):
                link = row.select_one('a.usa-collection__heading[href]')
                stamp = row.select_one('time[datetime]')
                if not link or not stamp:
                    continue
                title = clean(link.get_text())
                if re.search(r'artex|penetration testing framework', title, re.I):
                    continue
                try:
                    date = datetime.fromisoformat(stamp['datetime'].replace('Z', '+00:00')).date().isoformat()
                    add(title, date, safe_url(link['href'], base, ('/CSA/',)))
                except ValueError:
                    continue
    elif key == 'advisory':
        # Refuse DTDs/custom entities. No article HTML is emitted.
        decoded = body.decode('utf-8-sig')
        if re.search(r'<!\s*(?:DOCTYPE|ENTITY)', decoded, re.I):
            raise ValueError('Unexpected RSS DTD or entity')
        for row in ET.fromstring(decoded).findall('./channel/item'):
            try:
                t = parsedate_to_datetime(row.findtext('pubDate') or '')
                date = t.replace(tzinfo=t.tzinfo or UTC).astimezone(UTC).isoformat()
                add(clean(row.findtext('title')), date, safe_url(row.findtext('link'), base, ('/news-events/', '/cybersecurity-advisories/')))
            except (TypeError, ValueError):
                continue
    else:
        rows = json.loads(body)['vulnerabilities']
        if not isinstance(rows, list):
            raise ValueError('Unexpected KEV schema')
        for row in rows:
            if not isinstance(row, dict):
                continue
            id = clean(row.get('cveID'))
            title = clean(row.get('vulnerabilityName'))
            try:
                date = datetime.strptime(clean(row.get('dateAdded')), '%Y-%m-%d').date().isoformat()
            except ValueError:
                continue
            if title and re.fullmatch(r'CVE-\d{4}-\d{4,}', id):
                add(f'{id}: {title}', date, 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog?' + urlencode({'search': id}), id)
    if not items:
        raise ValueError('Feed returned no recognizable entries')
    if key == 'advisory':
        items = {k: v for k, v in items.items() if not re.match(r'CISA Adds?\b.*Known Exploited Vulnerabilit', v['title'], re.I)}
    return sorted(items.values(), key=lambda item: timestamp(item['date']), reverse=True)


from http.server import BaseHTTPRequestHandler
from threading import Lock

SEED = Path(__file__).resolve().parent.parent / 'public' / 'cybersecurity-data' / 'snapshot.json'
CACHE_SECONDS = HOUR
CACHE = {'body': None, 'expires': 0, 'records': {}, 'lastSuccess': None}
LOCK = Lock()


def pull(key):
    _, url, _ = SOURCES[key]
    try:
        request = Request(url, headers={'User-Agent': 'DAL-X-Cyber-Ticker/1.0 (https://www.dal-x.com/)'})
        with build_opener(NoRedirect()).open(request, timeout=6) as response:
            body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError('Oversized response')
        return parse(key, body)
    except (OSError, ValueError, TypeError, KeyError, ET.ParseError) as error:
        print(f'{key}: {type(error).__name__}')
        return None


AGENT_TOPIC = re.compile(r'\b(?:agentic AI|AI agents?|agentic (?:security|attack|tooling)|AI (?:coding|security|research) agents?|MCP (?:server|gateway)|model context protocol)\b', re.I)


def public_topic(item, kind):
    if kind in ('advisory', 'kev') and AGENT_TOPIC.search(item['title']):
        return 'ai-agent-security'
    return None


def clean_output(item):
    return dict(item, title=re.sub(r'\s*[\u2013\u2014]\s*', ': ', item['title']))


def source_key(url):
    ref = urlsplit(url)
    return ref.hostname, ref.path.rstrip('/'), ref.query


EASTERN = ZoneInfo('America/New_York')


def report_day(value):
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return value
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(EASTERN).date().isoformat()


def build_daily_brief(now, checked, records, eligible_example):
    eastern_day = datetime.fromtimestamp(now, EASTERN).date()
    # Include tomorrow so the browser can roll over at midnight without extra requests.
    days = {(eastern_day + timedelta(days=offset)).isoformat(): {'total': 0, 'byType': {}, 'examples': []}
            for offset in (-2, -1, 0, 1)}
    seen = set()
    for item in sorted(records, key=lambda i: timestamp(i['date']), reverse=True):
        day = report_day(item['date'])
        key = item['sourceId'], item['id'], day
        if day not in days or key in seen:
            continue
        seen.add(key)
        row = days[day]
        row['total'] += 1
        kind = item['kind']
        row['byType'][kind] = row['byType'].get(kind, 0) + 1
        if eligible_example(item) and len(row['examples']) < 3 and all(x['sourceId'] != item['sourceId'] for x in row['examples']):
            row['examples'].append({k: item[k] for k in ('title', 'url', 'source', 'sourceId', 'kind')})
    return {'checkedSources': checked, 'days': days}


def make_snapshot(seed, results, old_records, now, previous_success=None):
    stamp = datetime.fromtimestamp(now, UTC).isoformat()
    health = {k: dict(v) for k, v in seed['sources'].items()}
    records = dict(old_records)
    reviewed_links = {source_key(url) for url in seed.get('reviewedSourceUrls', [])}

    def public_report(item):
        return item.get('kind') != 'incident' and item.get('sourceId') != 'reviewed' and source_key(item['url']) not in reviewed_links

    items = [i for i in seed['items'] if i['sourceId'] not in SOURCES and public_report(i)
             and now - 14 * DAY <= timestamp(i['date']) <= now + DAY]
    failures = []
    archive_rows = []
    feed_health = {}
    daily_rows = []
    recovered_count = 0
    for key, (label, _, _) in SOURCES.items():
        fresh = results[key]
        if fresh is None:
            failures.append(label)
            prior = records.get(key)
            checked = prior[0] if prior else health.get(key, {}).get('checkedAt')
            health[key] = dict(label=label, checkedAt=checked, status='stale')
            current = prior[1] if prior else [i for i in seed['items'] if i['sourceId'] == key]
        else:
            recovered_count += 1
            records[key] = (stamp, fresh[:100])
            health[key] = dict(label=label, checkedAt=stamp, status='current')
            current = fresh
        kind = 'advisory' if key in ('ic3', 'advisory') else 'kev' if key == 'kev' else 'breach'
        recent = [i for i in current if now - 14 * DAY <= timestamp(i['date']) <= now + DAY]
        recent.sort(key=lambda i: timestamp(i['date']), reverse=True)
        feed_health[key] = dict(health[key], latestReportAt=current[0]['date'] if current else None)
        shaped = [dict(clean_output(i), kind=kind, sourceId=key, source=label, topic=public_topic(i, kind)) for i in recent]
        archive_rows.extend(shaped[:25])
        if fresh is not None:
            daily_rows.extend(shaped)
        items.extend([i for i in shaped if public_report(i)][:2])
    other = sorted(items, key=lambda i: timestamp(i['date']), reverse=True)
    # Give each automatically checked source with recent rows a slot before filling by date.
    reserved = {}
    for i in other:
        if i['sourceId'] in SOURCES:
            reserved.setdefault(i['sourceId'], i)
    picked = set(i['id'] for i in reserved.values())
    remaining = [i for i in other if i['id'] not in picked]
    selected = [*reserved.values(), *remaining[:max(0, 24 - len(reserved))]]
    selected.sort(key=lambda i: timestamp(i['date']), reverse=True)
    last_success = stamp if recovered_count else previous_success
    return (dict(version=2, generatedAt=stamp, lastSuccessfulCheck=last_success, archiveAsOf=seed['generatedAt'],
                 live=True, cachedMinutes=60, sources=health, items=selected[:24],
                 failedSources=failures, connectedSources=len(SOURCES), feedHealth=feed_health, recentReports=archive_rows,
                 dailyBrief=build_daily_brief(now, recovered_count, daily_rows, public_report)), records, last_success)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if '?' in self.path:
            self.send_error(400, 'Query parameters are not supported')
            return
        with LOCK:
            now = time.time()
            if CACHE['body'] is None or now >= CACHE['expires']:
                try:
                    seed = json.loads(SEED.read_text(encoding='utf-8'))
                    with ThreadPoolExecutor(max_workers=len(SOURCES)) as pool:
                        results = dict(zip(SOURCES, pool.map(pull, SOURCES)))
                    doc, records, last = make_snapshot(seed, results, CACHE['records'], now, CACHE['lastSuccess'])
                    # Reuse the last response even after partial failure; never retry a publisher per visitor.
                    CACHE.update(body=json.dumps(doc, separators=(',', ':')).encode('utf-8'),
                                 records=records, lastSuccess=last, expires=now + CACHE_SECONDS)
                except (OSError, ValueError, TypeError, KeyError) as error:
                    print(f'ticker: {type(error).__name__}')
                    if CACHE['body'] is None:
                        self.send_error(503, 'Ticker temporarily unavailable')
                        return
            body = CACHE['body']
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'public, max-age=60')
        self.send_header('Vercel-CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)
