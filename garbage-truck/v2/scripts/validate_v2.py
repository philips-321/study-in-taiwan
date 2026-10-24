#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
V2 = HERE.parent
DATA = V2 / 'data'
REPO = V2.parent.parent

errors: list[str] = []
warnings: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        fail(f'invalid JSON {path.relative_to(REPO)}: {type(exc).__name__}: {exc}')
        return None


# 1. Every committed V2 JSON file must parse.
json_files = sorted(DATA.rglob('*.json'))
for path in json_files:
    load_json(path)

# 2. Registry must contain exactly 22 unique jurisdictions.
registry = load_json(DATA / 'cities.json')
if registry:
    cities = registry.get('cities') or []
    slugs = [c.get('slug') for c in cities]
    if len(cities) != 22:
        fail(f'cities.json expected 22 jurisdictions, found {len(cities)}')
    if len(set(slugs)) != len(slugs):
        fail('cities.json contains duplicate slugs')

# 3. Per-city manifest/index/tile invariants.
for manifest_path in sorted((DATA / 'cities').glob('*/manifest.json')):
    manifest = load_json(manifest_path)
    if not manifest:
        continue
    city_dir = manifest_path.parent
    city = manifest.get('city') or city_dir.name
    status = manifest.get('status')
    route_index_path = city_dir / (manifest.get('routes_index') or 'routes/index.json')
    route_index = load_json(route_index_path) if route_index_path.exists() else None

    if manifest.get('route_count', 0) or manifest.get('stop_count', 0):
        if route_index is None:
            fail(f'{city}: manifest has route/stop counts but route index is missing')
        else:
            routes = route_index.get('routes') or []
            route_count = len(routes)
            stop_count = sum(int(r.get('stop_count') or 0) for r in routes)
            if int(manifest.get('route_count') or 0) != route_count:
                fail(f'{city}: route_count manifest={manifest.get("route_count")} index={route_count}')
            if int(manifest.get('stop_count') or 0) != stop_count:
                fail(f'{city}: stop_count manifest={manifest.get("stop_count")} index={stop_count}')

    tile_manifest_path = city_dir / (manifest.get('tiles_manifest') or 'tiles/manifest.json')
    if status == 'ready':
        if not tile_manifest_path.exists():
            fail(f'{city}: status=ready but tiles manifest is missing')
        else:
            tiles = load_json(tile_manifest_path)
            if tiles:
                mapped = int(tiles.get('mapped_stop_count') or 0)
                if mapped <= 0:
                    fail(f'{city}: status=ready but mapped_stop_count={mapped}')
                manifest_mapped = manifest.get('mapped_stop_count')
                if manifest_mapped is not None and int(manifest_mapped) != mapped:
                    fail(f'{city}: mapped_stop_count manifest={manifest_mapped} tiles={mapped}')
                tile_sum = sum(int(t.get('count') or 0) for t in tiles.get('tiles') or [])
                if tile_sum != mapped:
                    fail(f'{city}: tile counts sum={tile_sum} but mapped_stop_count={mapped}')
    elif status == 'schedule-only':
        if int(manifest.get('route_count') or 0) <= 0 or int(manifest.get('stop_count') or 0) <= 0:
            fail(f'{city}: status=schedule-only but no schedule counts are present')
        if tile_manifest_path.exists():
            tiles = load_json(tile_manifest_path)
            if tiles and int(tiles.get('mapped_stop_count') or 0) > 0:
                warnings.append(f'{city}: schedule-only has mapped tiles; consider status=ready after verifying coordinates')

# 4. User policy: refresh/bootstrap are explicit/manual, not scheduled cron jobs.
for rel in (
    '.github/workflows/refresh-garbage-v2-city.yml',
    '.github/workflows/bootstrap-garbage-v2-data.yml',
):
    path = REPO / rel
    if not path.exists():
        fail(f'missing workflow {rel}')
        continue
    text = path.read_text(encoding='utf-8')
    if '\n  schedule:' in text or '\n    - cron:' in text:
        fail(f'{rel}: scheduled cron detected; garbage V2 refresh policy is manual/explicit only')

# 5. The runtime architecture must remain no-D1 for garbage V2.
workflow = (REPO / '.github/workflows/refresh-garbage-v2-city.yml').read_text(encoding='utf-8')
for forbidden in ('wrangler d1', 'D1_DATABASE', 'database_id'):
    if forbidden.lower() in workflow.lower():
        fail(f'refresh-garbage-v2-city.yml contains forbidden D1 runtime token: {forbidden}')

print(f'V2 JSON files parsed: {len(json_files)}')
for warning in warnings:
    print(f'WARNING: {warning}')
if errors:
    for error in errors:
        print(f'ERROR: {error}', file=sys.stderr)
    raise SystemExit(1)
print('Garbage Truck V2 structural validation passed.')
