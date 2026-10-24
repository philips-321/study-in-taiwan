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

# 2. Registry must contain exactly Taiwan's 22 unique local jurisdictions.
EXPECTED_JURISDICTIONS = {
    'taipei', 'new-taipei', 'taoyuan', 'taichung', 'tainan', 'kaohsiung',
    'keelung', 'hsinchu-city', 'chiayi-city',
    'yilan', 'hsinchu-county', 'miaoli', 'changhua', 'nantou', 'yunlin',
    'chiayi-county', 'pingtung', 'hualien', 'taitung', 'penghu', 'kinmen',
    'lienchiang',
}
registry = load_json(DATA / 'cities.json')
if registry:
    cities = registry.get('cities') or []
    slugs = [c.get('slug') for c in cities]
    slug_set = set(slugs)
    if len(cities) != 22:
        fail(f'cities.json expected 22 jurisdictions, found {len(cities)}')
    if len(slug_set) != len(slugs):
        fail('cities.json contains duplicate slugs')
    if slug_set != EXPECTED_JURISDICTIONS:
        missing = sorted(EXPECTED_JURISDICTIONS - slug_set)
        extra = sorted(slug_set - EXPECTED_JURISDICTIONS)
        fail(f'cities.json jurisdiction mismatch; missing={missing}, extra={extra}')
    by_slug = {c.get('slug'): c for c in cities}
    if by_slug.get('new-taipei', {}).get('name_zh') != '新北市':
        fail('new-taipei must map to 新北市 / New Taipei City')
    if by_slug.get('keelung', {}).get('name_zh') != '基隆市':
        fail('keelung must map to 基隆市 / Keelung City')

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
    schedule_index_path = city_dir / manifest['schedule_index'] if manifest.get('schedule_index') else None
    schedule_index = load_json(schedule_index_path) if schedule_index_path and schedule_index_path.exists() else None

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

    if manifest.get('schedule_index'):
        if schedule_index is None:
            fail(f'{city}: schedule_index declared but file is missing')
        else:
            areas = schedule_index.get('areas') or []
            row_count = int(schedule_index.get('row_count') or 0)
            area_count = int(schedule_index.get('area_count') or 0)
            area_row_sum = sum(int(a.get('count') or 0) for a in areas)
            if row_count <= 0:
                fail(f'{city}: schedule index has no rows')
            if area_count != len(areas):
                fail(f'{city}: schedule area_count={area_count} but areas={len(areas)}')
            if area_row_sum != row_count:
                fail(f'{city}: schedule area row sum={area_row_sum} but row_count={row_count}')
            if manifest.get('row_count') is not None and int(manifest['row_count']) != row_count:
                fail(f'{city}: manifest row_count={manifest["row_count"]} index={row_count}')
            if manifest.get('area_count') is not None and int(manifest['area_count']) != area_count:
                fail(f'{city}: manifest area_count={manifest["area_count"]} index={area_count}')

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
        has_route_model = int(manifest.get('route_count') or 0) > 0 and int(manifest.get('stop_count') or 0) > 0 and route_index is not None
        has_schedule_model = schedule_index is not None and int(schedule_index.get('row_count') or 0) > 0
        if not (has_route_model or has_schedule_model):
            fail(f'{city}: status=schedule-only but neither route-index nor schedule-index coverage is present')
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

# 6. Mobile V2 regression contract.
# The base mobile layout uses an auto-height second grid row. When #panel.collapsed
# hides the body, that auto row must shrink so the map receives the freed space.
main_html = (REPO / 'garbage-truck/index.html').read_text(encoding='utf-8')
mobile_parity = (V2 / 'mobile-parity.js').read_text(encoding='utf-8')
nationwide = (V2 / 'nationwide.js').read_text(encoding='utf-8')

if 'grid-template-rows:minmax(0,1fr) auto' not in main_html:
    fail('base mobile layout no longer exposes an auto-height sheet row')
if '#panel.collapsed' not in main_html or 'classList.toggle("collapsed")' not in main_html:
    fail('base mobile sheet collapse behavior is missing')
if 'html[data-v2] #content{grid-template-rows:minmax(0,1fr) auto!important}' not in mobile_parity:
    fail('V2 mobile sheet must override fixed-height nationwide rows with an auto sheet row')
if 'html[data-v2] #cityV2{display:block!important' not in mobile_parity:
    fail('V2 city selector must remain visible on narrow mobile screens for testing')
if '.sheet-toggle{display:none!important}' in mobile_parity:
    fail('V2 must not hide the mobile sheet toggle')
if 'grid-template-rows:minmax(48dvh' in mobile_parity or 'grid-template-rows:minmax(50dvh' in mobile_parity:
    fail('V2 mobile parity must not pin the panel to a fixed viewport-height row')
if '#cityV2{display:none!important}' not in nationwide:
    warnings.append('nationwide.js no longer hides #cityV2 at <=560px; mobile-parity override may be simplified')

print(f'V2 JSON files parsed: {len(json_files)}')
for warning in warnings:
    print(f'WARNING: {warning}')
if errors:
    for error in errors:
        print(f'ERROR: {error}', file=sys.stderr)
    raise SystemExit(1)
print('Garbage Truck V2 structural validation passed.')
