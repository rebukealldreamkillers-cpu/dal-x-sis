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


if __name__ == '__main__':
    unittest.main()
