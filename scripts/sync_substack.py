"""Sync the author's fixed public RSS feed; preserve previous posts on failure.

Uses only the Python standard library. Does not require an API key.
"""
import argparse
import copy
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED_URL = 'https://rohanmarar.substack.com/feed'
DEFAULT_OUTPUT = ROOT / 'site' / 'substack-feed.json'

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
    def handle_data(self, data):
        self.parts.append(data)

def plain_text(markup):
    parser = PlainText()
    parser.feed(markup or '')
    return re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()

def parse_feed(xml):
    # The fixed first-party feed has no reason to contain a DTD or custom entities.
    if re.search(br'<!DOCTYPE|<!ENTITY', xml, re.I):
        raise ValueError('Unexpected XML declarations')
    rss = ET.fromstring(xml)
    if rss.tag != 'rss':
        raise ValueError('The upstream response is not RSS')
    posts = []
    for item in rss.findall('./channel/item'):
        url = (item.findtext('link') or '').strip()
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname != 'rohanmarar.substack.com' or not parsed.path.startswith('/p/'):
            continue
        slug = parsed.path.rstrip('/').split('/')[-1]
        if not re.fullmatch(r'[A-Za-z0-9-]+', slug):
            continue
        body = item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded') or item.findtext('description') or ''
        description = item.findtext('description') or body
        published = ''
        if item.findtext('pubDate'):
            from email.utils import parsedate_to_datetime
            published = parsedate_to_datetime(item.findtext('pubDate')).astimezone(timezone.utc).strftime('%Y-%m-%d')
        enclosure = item.find('enclosure')
        image = enclosure.get('url', '') if enclosure is not None else ''
        if not image:
            match = re.search(r'<img\b[^>]*\bsrc=["\x27]([^"\x27]+)', body, re.I)
            image = html.unescape(match.group(1)) if match else ''
        posts.append({'id': slug, 'title': item.findtext('title') or 'Untitled', 'date': published, 'category': 'Substack', 'summary': plain_text(description)[:260], 'url': url, 'image': image, 'html': body, 'source': 'substack'})
    return sorted(posts, key=lambda p: p['date'], reverse=True)

def synchronize(path=DEFAULT_OUTPUT, fixture=None):
    previous = json.loads(path.read_text()) if path.exists() else json.loads((ROOT / 'site' / 'substack-snapshot.json').read_text())
    try:
        if fixture:
            xml = Path(fixture).read_bytes()
        else:
            request = urllib.request.Request(FEED_URL, headers={'Accept': 'application/rss+xml, application/xml;q=0.9', 'User-Agent': 'RohanMararPortfolio/1.0 (+https://www.rohanmarar.com)'})
            with urllib.request.urlopen(request, timeout=30) as response:
                xml = response.read(8_000_001)
        if len(xml) > 8_000_000:
            raise ValueError('RSS exceeds the size limit')
        fresh = parse_feed(xml)
        if not fresh:
            raise ValueError('Feed contains no public posts; keeping existing articles')
        merged = {p['id']: p for p in previous.get('posts', [])}
        merged.update({p['id']: p for p in fresh})
        posts = sorted(merged.values(), key=lambda p: p.get('date', ''), reverse=True)
        # Keep unchanged files unchanged, so routine checks do not create commits.
        if posts == previous.get('posts') and previous.get('mode') == 'live':
            print('Substack checked; no article changes.')
            return True
        result = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'mode': 'live', 'posts': posts}
        print('Substack synced:', len(fresh), 'feed posts;', len(posts), 'articles retained.')
    except Exception as error:
        result = copy.deepcopy(previous)
        result['mode'] = 'stale' if any(p.get('html') for p in result.get('posts', [])) else 'snapshot'
        print('::warning::Substack sync unavailable; preserving saved articles. ' + str(error))
        success = False
    else:
        success = True
    path.parent.mkdir(parents=True, exist_ok=True)
    formatted = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if not path.exists() or path.read_text() != formatted:
        path.write_text(formatted)
    return success

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--fixture', type=Path, help='Use a local RSS fixture instead of the network')
    parser.add_argument('--strict', action='store_true', help='Return nonzero if the feed is unavailable')
    args = parser.parse_args()
    success = synchronize(args.output, args.fixture)
    sys.exit(1 if args.strict and not success else 0)
