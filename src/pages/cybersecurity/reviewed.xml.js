import reviewed from '../../data/reviewedIncidents.json';

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function GET({ site }) {
  const page = new URL('/cybersecurity/', site).href;
  const items = reviewed.map(incident => {
    const link = escapeXml(page + '#' + incident.id);
    const description = [
      incident.happened, incident.affected,
      'Confirmation: ' + incident.confirmed,
      'Still unknown: ' + incident.unknown,
      ...incident.sources.map(source => source.label + ': ' + source.url)
    ].join('\n\n');
    return `<item>
      <title>${escapeXml(incident.title)}</title>
      <link>${link}</link><guid>${link}</guid>
      <pubDate>${new Date(incident.date + 'T00:00:00Z').toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
  });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>DAL-X | Reviewed U.S. cybersecurity incidents</title>
  <link>${escapeXml(page)}</link>
  <description>Public incident briefings from Jochanni Labs, with sources and outstanding questions.</description>
  ${items.join('\n')}
</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
