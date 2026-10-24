#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import shutil
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
V2 = HERE.parent
DATA = V2 / 'data'
CITY = 'keelung'
CITY_DIR = DATA / 'cities' / CITY
STAGE = V2 / '.cache' / 'staging' / CITY
SOURCE_URL = 'https://opendata-kl.askeycloud.com/route_klepb.csv'
LANDING_URL = 'https://data.gov.tw/dataset/128678'
UA = 'study-in-taiwan-garbage-v2/2.5 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS = 2
GENERAL_DAYS = [1, 2, 4, 5, 6]
DISTRICTS = ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區']
EXPECTED_FIELDS = {
    '編號', '班別', '清運路線名稱', '順序', 'stopId', '清運點', '經度', '緯度',
    '預估到達時間', '預估離開時間', '停留時間', '回收日(星期幾)'
}


def now_dt():
    return datetime.now(timezone.utc)


def now_iso():
    return now_dt().replace(microsecond=0).isoformat()


def atomic_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, path)


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def next_monday_iso():
    n = now_dt()
    days = (7 - n.weekday()) % 7
    if days == 0:
        days = 7
    return (n + timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def parse_iso(s):
    try:
        return datetime.fromisoformat(s) if s else None
    except ValueError:
        return None


def history(entry):
    path = CITY_DIR / 'source-history.json'
    obj = load_json(path) if path.exists() else {'version': 1, 'city': CITY, 'checks': []}
    obj['checks'] = (obj.get('checks', []) + [entry])[-120:]
    atomic_json(path, obj)


def base_manifest():
    return {
        'version': 2,
        'city': CITY,
        'name_zh': '基隆市',
        'name_en': 'Keelung City',
        'status': 'pending-import',
        'source_priority': ['local_official', 'moenv_national'],
        'source_provider': 'Keelung City Environmental Protection Bureau Open Data',
        'source_landing_url': LANDING_URL,
        'source_direct_download_url': SOURCE_URL,
        'source_updated': None,
        'refresh': {
            'mode': 'manual',
            'source_change_guard': True,
            'network_attempts_per_request': 2,
            'retry_after_failure': 'next Monday',
            'last_success': None,
            'last_checked': None,
            'last_attempt': None,
            'last_attempt_status': None,
            'next_retry_not_before': None,
        },
        'routes_index': 'routes/index.json',
        'tiles_manifest': 'tiles/manifest.json',
        'route_count': 0,
        'stop_count': 0,
        'notes': (
            'Official Keelung CSV with coordinates and per-stop recycling weekdays. '
            'General-garbage weekdays use the city cleanup-service closure pattern (Wed/Sun off) '
            'with explicit provenance; food-waste weekdays are not exposed by this CSV and remain unknown. '
            'Static JSON only; no D1.'
        ),
    }


def get_manifest():
    path = CITY_DIR / 'manifest.json'
    return load_json(path) if path.exists() else base_manifest()


def record_failure(manifest, error):
    t = now_iso()
    nxt = next_monday_iso()
    r = manifest.setdefault('refresh', {})
    r.update({
        'last_checked': t,
        'last_attempt': t,
        'last_attempt_status': 'upstream-failed-after-2-attempts',
        'next_retry_not_before': nxt,
        'last_error': str(error),
    })
    atomic_json(CITY_DIR / 'manifest.json', manifest)
    history({
        'checked_at': t,
        'provider': 'Keelung City Environmental Protection Bureau Open Data',
        'landing_url': LANDING_URL,
        'direct_download_url': SOURCE_URL,
        'status': 'upstream-failed-after-2-attempts',
        'next_retry_not_before': nxt,
        'error': str(error),
    })


def download():
    last = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            req = Request(SOURCE_URL, headers={
                'User-Agent': UA,
                'Accept': 'text/csv,text/plain,*/*',
            })
            with urlopen(req, timeout=60) as r:
                raw = r.read()
                if len(raw) < 1000:
                    raise RuntimeError(f'response too small: {len(raw)} bytes')
                return raw, {
                    'etag': r.headers.get('ETag'),
                    'last_modified': r.headers.get('Last-Modified'),
                    'http_status': getattr(r, 'status', 200),
                    'attempt': attempt,
                }
        except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
            last = exc
            if attempt < MAX_ATTEMPTS:
                time.sleep(1)
    raise RuntimeError(f'Keelung official download failed twice: {last}')


def decode_csv(raw: bytes):
    for encoding in ('utf-8-sig', 'utf-8', 'cp950', 'big5'):
        try:
            text = raw.decode(encoding)
            return text, encoding
        except UnicodeDecodeError:
            pass
    raise ValueError('unsupported Keelung CSV encoding')


def parse_time(value):
    s = str(value or '').strip()
    m = re.search(r'([0-2]?\d)[:：]([0-5]\d)', s)
    if not m:
        return None
    return f'{int(m.group(1)):02d}:{m.group(2)}'


def as_float(value):
    try:
        return float(str(value).strip())
    except Exception:
        return None


def as_int(value, default):
    try:
        return int(float(str(value).strip()))
    except Exception:
        return default


def parse_recycling_days(value):
    days = set()
    for token in re.findall(r'\d+', str(value or '')):
        n = int(token)
        if n in (0, 7):
            days.add(0)
        elif 1 <= n <= 6:
            days.add(n)
    return sorted(days)


def district_from(route_name, stop_name):
    text = f'{route_name} {stop_name}'
    for district in DISTRICTS:
        if district in text:
            return district
    return None


def route_id(team, route_name):
    key = f'{team}\x1f{route_name}'.encode('utf-8')
    return 'keelung-' + hashlib.sha1(key).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    CITY_DIR.mkdir(parents=True, exist_ok=True)
    manifest = get_manifest()
    cooldown = parse_iso(manifest.get('refresh', {}).get('next_retry_not_before'))
    if cooldown and now_dt() < cooldown and not args.force:
        print(f'skip: Keelung source cooldown until {cooldown.isoformat()}')
        return

    checked = now_iso()
    try:
        if args.input:
            raw = Path(args.input).read_bytes()
            meta = {'etag': None, 'last_modified': None, 'http_status': None, 'input_file': str(args.input)}
        else:
            raw, meta = download()
    except Exception as exc:
        record_failure(manifest, exc)
        raise SystemExit(2)

    content_hash = hashlib.sha256(raw).hexdigest()
    previous_hash = manifest.get('source_content_sha256')
    source_updated = meta.get('last_modified')
    history({
        'checked_at': checked,
        'provider': 'Keelung City Environmental Protection Bureau Open Data',
        'landing_url': LANDING_URL,
        'direct_download_url': SOURCE_URL,
        'status': 'checked',
        'etag': meta.get('etag'),
        'last_modified': source_updated,
        'content_sha256': content_hash,
        'http_status': meta.get('http_status'),
    })

    if previous_hash == content_hash and not args.force:
        manifest.setdefault('refresh', {}).update({
            'last_checked': checked,
            'last_attempt': checked,
            'last_attempt_status': 'source-unchanged-skip-import',
            'next_retry_not_before': None,
            'last_error': None,
        })
        atomic_json(CITY_DIR / 'manifest.json', manifest)
        print('skip import: Keelung source content hash unchanged')
        return

    try:
        text, encoding = decode_csv(raw)
        reader = csv.DictReader(io.StringIO(text))
        fields = {str(x or '').strip() for x in (reader.fieldnames or [])}
        missing = sorted(EXPECTED_FIELDS - fields)
        if missing:
            raise ValueError(f'missing expected fields: {missing}')
        rows = list(reader)
    except Exception as exc:
        raise SystemExit(f'refusing to publish invalid Keelung CSV: {exc}')

    if not rows:
        raise SystemExit('refusing to publish empty Keelung dataset')

    if STAGE.exists():
        shutil.rmtree(STAGE)
    routes_dir = STAGE / 'routes'
    routes_dir.mkdir(parents=True, exist_ok=True)

    grouped = {}
    invalid = 0
    for i, row in enumerate(rows, 1):
        team = str(row.get('班別') or '').strip()
        rname = str(row.get('清運路線名稱') or '').strip()
        name = str(row.get('清運點') or '').strip()
        t = parse_time(row.get('預估到達時間'))
        lat = as_float(row.get('緯度'))
        lng = as_float(row.get('經度'))
        if not rname or not name or not t or lat is None or lng is None:
            invalid += 1
            continue
        if not (24.9 <= lat <= 25.3 and 121.5 <= lng <= 122.0):
            invalid += 1
            continue
        rid = route_id(team, rname)
        district = district_from(rname, name)
        stop = {
            'city': CITY,
            'district': district,
            'route_id': rid,
            'route_name': rname,
            'collection_method': str(row.get('停留時間') or '').strip() or None,
            'stop_order': as_int(row.get('順序'), i),
            'name': name,
            'time': t,
            'departure_time': parse_time(row.get('預估離開時間')),
            'source_stop_id': str(row.get('stopId') or '').strip() or None,
            'lat': lat,
            'lng': lng,
            'geo_status': 'official',
            'services': {
                'general': {
                    'known': True,
                    'days': GENERAL_DAYS,
                    'note': 'Keelung city cleanup-service closure pattern: Wednesday and Sunday off; source CSV supplies stop time but not a separate general-waste weekday field.',
                },
                'food': {
                    'known': False,
                    'days': [],
                    'note': 'Food-waste collection weekdays are not exposed by this official route CSV; do not infer them.',
                },
                'recycling': {
                    'known': True,
                    'days': parse_recycling_days(row.get('回收日(星期幾)')),
                    'note': 'Parsed directly from 回收日(星期幾) in the official Keelung CSV.',
                },
            },
            'source': {
                'provider': 'Keelung City Environmental Protection Bureau Open Data',
                'url': SOURCE_URL,
                'source_updated': source_updated,
                'fetched_at': checked,
            },
        }
        grouped.setdefault(rid, {'team': team, 'route_name': rname, 'stops': []})['stops'].append(stop)

    valid_count = sum(len(x['stops']) for x in grouped.values())
    if valid_count < 100:
        shutil.rmtree(STAGE, ignore_errors=True)
        raise SystemExit(f'refusing to publish suspiciously small Keelung dataset: {valid_count} valid stops')

    index = []
    stop_count = 0
    for rid, group in sorted(grouped.items(), key=lambda kv: (kv[1]['team'], kv[1]['route_name'], kv[0])):
        stops = group['stops']
        stops.sort(key=lambda x: (x['stop_order'], x['time'], x['name']))
        district = next((x.get('district') for x in stops if x.get('district')), None)
        filename = f'{rid}.json'
        atomic_json(routes_dir / filename, {
            'version': 2,
            'city': CITY,
            'district': district,
            'team': group['team'],
            'route_id': rid,
            'route_name': group['route_name'],
            'source': 'keelung_local_official',
            'source_updated': source_updated,
            'fetched_at': checked,
            'stops': stops,
        })
        index.append({
            'route_id': rid,
            'district': district,
            'team': group['team'],
            'route_name': group['route_name'],
            'file': filename,
            'stop_count': len(stops),
        })
        stop_count += len(stops)

    atomic_json(routes_dir / 'index.json', {
        'version': 2,
        'city': CITY,
        'source': 'keelung_local_official',
        'source_updated': source_updated,
        'source_encoding': encoding,
        'generated_at': checked,
        'complete_refresh': True,
        'invalid_row_count': invalid,
        'routes': index,
    })

    published = CITY_DIR / 'routes'
    backup = CITY_DIR / 'routes.prev'
    if backup.exists():
        shutil.rmtree(backup)
    if published.exists():
        published.replace(backup)
    routes_dir.replace(published)
    shutil.rmtree(backup, ignore_errors=True)
    shutil.rmtree(STAGE, ignore_errors=True)

    manifest.update({
        'status': 'ready',
        'source_provider': 'Keelung City Environmental Protection Bureau Open Data',
        'source_landing_url': LANDING_URL,
        'source_direct_download_url': SOURCE_URL,
        'source_updated': source_updated,
        'source_etag': meta.get('etag'),
        'source_content_sha256': content_hash,
        'route_count': len(index),
        'stop_count': stop_count,
        'invalid_row_count': invalid,
        'notes': (
            'Official Keelung CSV with official stop coordinates and recycling weekdays. '
            'General weekday mask uses the official city cleanup-service closure pattern (Wed/Sun off) and is provenance-noted per stop. '
            'Food-waste weekdays remain unknown because this source does not expose them. Static JSON only; no D1.'
        ),
    })
    manifest.setdefault('refresh', {}).update({
        'last_success': checked,
        'last_checked': checked,
        'last_attempt': checked,
        'last_attempt_status': 'success',
        'next_retry_not_before': None,
        'last_error': None,
    })
    atomic_json(CITY_DIR / 'manifest.json', manifest)
    history({
        'checked_at': checked,
        'provider': 'Keelung City Environmental Protection Bureau Open Data',
        'landing_url': LANDING_URL,
        'direct_download_url': SOURCE_URL,
        'status': 'published',
        'last_modified': source_updated,
        'etag': meta.get('etag'),
        'content_sha256': content_hash,
        'route_count': len(index),
        'stop_count': stop_count,
        'invalid_row_count': invalid,
    })
    print(f'ok: Keelung official source -> {len(index)} routes / {stop_count} mapped stops; invalid={invalid}')


if __name__ == '__main__':
    main()
