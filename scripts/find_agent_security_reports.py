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

RSS = {
    'Microsoft Security': ('https://www.microsoft.com/en-us/security/blog/feed/', 'www.microsoft.com'),
    'Unit 42': ('https://unit42.paloaltonetworks.com/feed/', 'unit42.paloaltonetworks.com'),
    'BleepingComputer': ('https://www.bleepingcomputer.com/feed/', 'www.bleepingcomputer.com'),
    'The Record': ('https://therecord.media/feed', 'therecord.media'),
    'SecurityWeek': ('https://www.securityweek.com/feed/', 'www.securityweek.com'),
}
# Competitor incident trackers are never used as sources or lead lists.
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
    inputs = [(name, url, lambda b, n=name, h=host: rss(b, n, h)) for name, (url, host) in RSS.items()]
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
