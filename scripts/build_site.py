"""Validate and assemble the static website for GitHub Pages."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'site'
OUTPUT = ROOT / '_site'
content = json.loads((SOURCE / 'content.json').read_text())
assert isinstance(content['writing'], list), 'Writing must be a list of entries'
for post in content['writing']:
    if post.get('contentPath'):
        assert (SOURCE / post['contentPath']).is_file(), post['contentPath']
    if post.get('image', '').startswith('assets/'):
        assert (SOURCE / post['image']).is_file(), post['image']
for collection in ['projects', 'books', 'other']:
    for item in content.get(collection, []):
        if item.get('image', '').startswith('assets/'):
            assert (SOURCE / item['image']).is_file(), item['image']
if content['profile']['portrait'].startswith('assets/'):
    assert (SOURCE / content['profile']['portrait']).is_file()
json.loads((SOURCE / 'substack-feed.json').read_text())
if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
shutil.copytree(SOURCE, OUTPUT)
print('Built', sum(p.is_file() for p in OUTPUT.rglob('*')), 'static files into _site/')
