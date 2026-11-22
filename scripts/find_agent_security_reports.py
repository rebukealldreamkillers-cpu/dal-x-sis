"""Read public reporting for editorial leads. Never writes to the site archive."""
import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup

BLUE = 'https://blueradius.io/research/ai-agent-incident-tracker'
RSS = {
    'Microsoft Security': ('https://www.microsoft.com/en-us/security/blog/feed/', 'www.microsoft.com'),
    'Unit 42': ('https://unit42.paloaltonetworks.com/feed/', 'unit42.paloaltonetworks.com'),
    'BleepingComputer': ('https://www.bleepingcomputer.com/feed/', 'www.bleepingcomputer.com'),
}
AGENT = re.compile(r'\b(?:AI agents?|agentic AI|agentic (?:attack|tooling|security)|AI (?:coding|security|research|hacking) agents?|MCP (?:servers?|gateway)|model context protocol)\b', re.I)
EVENT = re.compile(r'\b(?:breach(?:ed|es)?|intrusion|compromis\w*|unauthori[sz]ed|misus\w*|abuse[ds]?|malicious|supply.chain attack|campaign|incident|hijack\w*)\b', re.I)
LIMIT = 2 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def load(url):
    req = Request(url, headers={'User-Agent':'DAL-X-Editorial-Discovery/1.0 (+https://www.dal-x.com/cybersecurity/)'})
    with build_opener(NoRedirect()).open(req, timeout=12) as response:
        data = response.read(LIMIT + 1)
    if len(data) > LIMIT:
        raise ValueError('Response exceeds size limit')
    return data


def ref(url, expected=None):
    try:
        u = urlsplit(url)
        if u.scheme == 'https' and u.hostname and not u.username and not u.password and not u.port and (not expected or u.hostname == expected):
            return 'https://' + u.hostname + u.path.rstrip('/')
    except ValueError:
        pass
    return ''


def text(value, max_len=180):
    return ' '.join((value or '').split())[:max_len]


def tracker(body):
    doc = BeautifulSoup(body, 'html.parser')
    table = next((t for t in doc.select('table') if 'Disclosed' in t.get_text(' ', strip=True)[:150]), None)
    if not table:
        raise ValueError('Tracker format changed')
    parsed = []
    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).strftime('%Y-%m')
    for row in table.select('tbody tr'):
        cells = row.find_all('td', recursive=False)
        if len(cells) != 5 or cells[2].get_text(strip=True) != 'Incident':
            continue
        published = text(cells[0].get_text())
        try:
            if datetime.strptime(published, '%b %Y').strftime('%Y-%m') < cutoff:
                continue
        except ValueError:
            continue
        title, link, evidence = cells[1].find('p'), cells[4].select_one('a[href]'), cells[4].find('p')
        if title and link and ref(link['href']) and evidence:
            parsed.append(dict(source='BlueRadius Research', title=text(title.get_text()), url=link['href'],
                               published=published, sourceSignal=text(evidence.get_text()),
                               decision='Review required'))
    if not parsed:
        raise ValueError('Tracker returned no incident rows')
    return parsed[:35]


def rss(body, name, host):
    if re.search(br'<!\s*(?:DOCTYPE|ENTITY)', body, re.I):
        raise ValueError('Unexpected XML DTD or entity')
    root = ET.fromstring(body)
    entries = root.findall('./channel/item')
    if not entries:
        raise ValueError('No RSS entries')
    out = []
    for item in entries:
        title = text(item.findtext('title'))
        link = text(item.findtext('link'), 1500)
        # Discovery only: no publisher body, exploit instructions, or victim details are copied.
        if ref(link, host) and AGENT.search(title) and EVENT.search(title):
            out.append(dict(source=name, title=title, url=link, published=text(item.findtext('pubDate')),
                            sourceSignal='Headline match only', decision='Review required'))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output', type=Path, default=Path('agent-security-leads.json'))
    args = ap.parse_args()
    data = Path(__file__).resolve().parents[1] / 'public/cybersecurity-data/archive-snapshot.json'
    already = {ref(i['url']) for i in json.loads(data.read_text())['items'] if i.get('topic') == 'ai-agent-security'}
    candidates, failures = [], []
    inputs = [('BlueRadius Research', BLUE, tracker)] + [(name, url, lambda b, n=name, h=host: rss(b, n, h)) for name, (url, host) in RSS.items()]
    for name, url, parse in inputs:
        try:
            candidates.extend(parse(load(url)))
        except (ValueError, OSError, ET.ParseError) as e:
            failures.append({'source':name, 'error':type(e).__name__})
    dedup = {}
    for item in candidates:
        key = ref(item['url'])
        if key and key not in already:
            dedup.setdefault(key, item)
    doc = {'reviewRequired': True, 'publishAutomatically':False,
           'reviewRule':'Check the original evidence, actual environment and impact, U.S. nexus, and existing coverage. Never promote a CVE, lab demonstration, or unconfirmed victim to a confirmed incident.',
           'sourcesChecked':len(inputs), 'failures':failures, 'candidates':list(dedup.values())}
    args.output.write_text(json.dumps(doc, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    print(f"{len(dedup)} leads requiring review; {len(failures)} source failures")
    return int(len(failures) == len(inputs))


if __name__ == '__main__':
    raise SystemExit(main())
