import importlib.util
from pathlib import Path
import unittest
from xml.etree import ElementTree as ET


SPEC = importlib.util.spec_from_file_location(
    'cyber_ticker_feed', Path(__file__).resolve().parents[1] / 'api' / 'cyber-ticker-feed.py'
)
feed = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(feed)


def rss(*links):
    root = ET.Element('rss')
    channel = ET.SubElement(root, 'channel')
    for link in links:
        item = ET.SubElement(channel, 'item')
        ET.SubElement(item, 'title').text = 'Data breach reported in California'
        ET.SubElement(item, 'source').text = 'BleepingComputer'
        ET.SubElement(item, 'link').text = link
        ET.SubElement(item, 'pubDate').text = 'Sun, 22 Nov 2026 21:30:00 GMT'
    return ET.tostring(root, encoding='utf-8')


class NewsLinksTest(unittest.TestCase):
    def test_keeps_full_google_article_link_and_query(self):
        url = 'https://news.google.com/rss/articles/CBMi' + 'x' * 340 + '?oc=5&ceid=US%3Aen'
        row, = feed.parse('gnews', rss('  ' + url + '  '))
        self.assertEqual(row['url'], url)
        self.assertEqual(row['id'], url)

    def test_skips_invalid_or_oversized_google_links(self):
        self.assertEqual(feed.parse('gnews', rss(
            'https://news.google.com/rss/articles/' + 'x' * feed.MAX_NEWS_URL_LENGTH,
            'https://news.google.com/rss/articles/internal space',
            'https://news.google.com:443/rss/articles/token',
            'https://news.google.com@publisher.example/rss/articles/token',
            'https://news.google.com/rss/search?q=article',
            'http://news.google.com/rss/articles/token',
        )), [])

    def test_keeps_direct_publisher_links_without_tracking_query(self):
        url = 'https://www.bleepingcomputer.com/news/security/' + 'x' * 240
        row, = feed.parse('bleeping', rss(url + '?utm_source=rss'))
        self.assertEqual(row['url'], url)

    def test_incident_disclosure_query_keeps_official_wording(self):
        url = 'https://news.google.com/rss/articles/CBMiFinCEN?oc=5'
        body = rss(url).replace(b'Data breach reported in California', 'US financial crimes bureau discloses ‘cybersecurity incident’'.encode()).replace(b'BleepingComputer', b'The Verge')
        row, = feed.parse('gnewsincident', body)
        self.assertEqual(row['url'], url)
        self.assertEqual(row['title'], 'US financial crimes bureau discloses ‘cybersecurity incident’')
        self.assertTrue(feed.news_quality(row))
        self.assertIn('%22cybersecurity+incident%22', feed.SOURCES['gnewsincident'][1])
        self.assertIn('%22unauthorized+access%22', feed.SOURCES['gnewsincident'][1])

    def test_public_breaking_links_exclude_subscription_only_coverage(self):
        title = 'Example hospital confirms unauthorized access'
        row = dict(title=title, url='https://news.google.com/rss/articles/example',
                   date='2026-11-24T21:00:00+00:00', sourceId='gnewsincident', source='The Verge')
        self.assertEqual(feed.cluster_news([row]), [])
        public = dict(row, source='Associated Press')
        self.assertEqual(feed.cluster_news([row, public])[0]['source'], 'Associated Press')
        direct = dict(row, source='BleepingComputer', sourceId='bleeping',
                      url='https://www.bleepingcomputer.com/news/security/example/')
        self.assertEqual(feed.cluster_news([row, public, direct])[0]['url'], direct['url'])


if __name__ == '__main__':
    unittest.main()
