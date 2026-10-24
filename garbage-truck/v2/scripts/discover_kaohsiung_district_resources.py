#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / 'data' / 'cities' / 'kaohsiung' / 'district-source-catalog.json'
UA = 'study-in-taiwan-garbage-v2/2.7 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS = 2
ALLOWED_RESOURCE_HOSTS = {'openapi.kcg.gov.tw', 'data.kcg.gov.tw'}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != 'a':
            return
        for k, v in attrs:
            if k.lower() == 'href' and v:
                self.hrefs.append(v)


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def atomic_json(path, obj):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, path)


def fetch_text(url):
    last = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            req = Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,*/*'})
            with urlopen(req, timeout=35) as r:
                raw = r.read()
                if len(raw) < 500:
                    raise RuntimeError(f'page too small: {len(raw)} bytes')
                for enc in ('utf-8-sig', 'utf-8', 'cp950', 'big5'):
                    try:
                        return raw.decode(enc), {
                            'http_status': getattr(r, 'status', 200),
                            'etag': r.headers.get('ETag'),
                            'last_modified': r.headers.get('Last-Modified'),
                            'attempt': attempt,
                        }
                    except UnicodeDecodeError:
                        pass
                return raw.decode('utf-8', errors='replace'), {'http_status': getattr(r, 'status', 200), 'attempt': attempt}
        except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
            last = f'{type(exc).__name__}: {exc}'
            if attempt < MAX_ATTEMPTS:
                time.sleep(1)
    raise RuntimeError(last or 'unknown fetch error')


def classify_resource(url):
    p = urlparse(url)
    if p.hostname not in ALLOWED_RESOURCE_HOSTS:
        return None
    lower = url.lower()
    if 'openapi.kcg.gov.tw/api/service/get/' in lower:
        return 'json_url'
    if lower.endswith('.csv') or '/download/' in lower and '.csv' in lower:
        return 'csv_url'
    return 'resource_url'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--limit', type=int, default=0, help='0 = all catalog entries')
    args = ap.parse_args()

    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    checked = now_iso()
    changed = 0
    attempted = 0

    for district in catalog.get('districts', []):
        if args.limit and attempted >= args.limit:
            break
        if not args.force and (district.get('json_url') or district.get('csv_url')):
            continue
        attempted += 1
        url = district['dataset_url']
        district['discovery_checked_at'] = checked
        try:
            html, headers = fetch_text(url)
            parser = Links()
            parser.feed(html)
            found = {}
            for href in parser.hrefs:
                absolute = urljoin(url, href)
                kind = classify_resource(absolute)
                if kind and kind not in found:
                    found[kind] = absolute
            if found:
                for k, v in found.items():
                    if district.get(k) != v:
                        district[k] = v
                        changed += 1
                district['discovery_status'] = 'resource-link-found'
            else:
                district['discovery_status'] = 'no-kcg-resource-link-found'
            district['dataset_page_http_status'] = headers.get('http_status')
            district['dataset_page_etag'] = headers.get('etag')
            district['dataset_page_last_modified'] = headers.get('last_modified')
        except Exception as exc:
            district['discovery_status'] = 'dataset-page-unavailable-after-2-attempts'
            district['discovery_error'] = str(exc)
        time.sleep(0.2)

    catalog['resource_discovery'] = {
        'last_checked_at': checked,
        'attempted_districts': attempted,
        'new_or_changed_resource_links': changed,
        'network_attempts_per_dataset_page': MAX_ATTEMPTS,
        'policy': 'Discovery only. Does not download or publish district route data.'
    }
    atomic_json(CATALOG, catalog)
    print(f'Kaohsiung resource discovery: attempted={attempted} changed={changed}')


if __name__ == '__main__':
    main()
