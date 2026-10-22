#!/usr/bin/env python3
import csv
import io
import json
import math
import shutil
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CSV_URL = "https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=a6e90031-7ec4-4089-afb5-361a4efe7202"
OUT = Path("garbage-truck/data")
CITY = "taipei"
STEP = 0.06
ORIGIN_LNG = 121.4
ORIGIN_LAT = 24.9


def clean_float(value):
    return float(str(value or "").strip().replace(",", ""))


def time_parts(value):
    raw = str(value or "").strip().replace(":", "").zfill(4)
    if len(raw) != 4 or not raw.isdigit():
        return None
    hour, minute = int(raw[:2]), int(raw[2:])
    if hour > 23 or minute > 59:
        return None
    return f"{hour:02d}:{minute:02d}", hour * 60 + minute


def compact(row):
    try:
        x = clean_float(row.get("經度"))
        y = clean_float(row.get("緯度"))
        arrival = time_parts(row.get("抵達時間"))
        departure = time_parts(row.get("離開時間"))
        place = str(row.get("地點") or "").strip()
    except (TypeError, ValueError):
        return None
    if not place or not arrival or not departure:
        return None
    return {
        "p": place,
        "x": x,
        "y": y,
        "a": arrival[0],
        "d": departure[0],
        "am": arrival[1],
        "dm": departure[1],
    }


def tile_id(row):
    ix = math.floor((row["x"] - ORIGIN_LNG) / STEP)
    iy = math.floor((row["y"] - ORIGIN_LAT) / STEP)
    return f"{ix}_{iy}"


req = urllib.request.Request(CSV_URL, headers={"User-Agent": "study-in-taiwan-garbage-truck-grid/1.0"})
with urllib.request.urlopen(req, timeout=60) as response:
    raw_bytes = response.read()

text = raw_bytes.decode("utf-8-sig")
source_rows = list(csv.DictReader(io.StringIO(text)))
if len(source_rows) < 1000:
    raise RuntimeError(f"Unexpected Taipei CSV size: {len(source_rows)}")

rows = [item for item in (compact(row) for row in source_rows) if item]
if len(rows) < 1000:
    raise RuntimeError(f"Too few valid rows after normalization: {len(rows)}")

tiles = {}
for row in rows:
    tiles.setdefault(tile_id(row), []).append(row)

shutil.rmtree(OUT, ignore_errors=True)
(OUT / CITY).mkdir(parents=True, exist_ok=True)

manifest = {
    "version": 1,
    "city": CITY,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "source": "Taipei Open Data garbage-truck pickup-point CSV",
    "source_csv": CSV_URL,
    "grid_deg": STEP,
    "origin": [ORIGIN_LNG, ORIGIN_LAT],
    "total_rows": len(rows),
    "tiles": [],
}

for tid in sorted(tiles, key=lambda value: tuple(int(part) for part in value.split("_"))):
    data = tiles[tid]
    ix, iy = (int(part) for part in tid.split("_"))
    west = ORIGIN_LNG + ix * STEP
    south = ORIGIN_LAT + iy * STEP
    file_name = f"{CITY}/{tid}.json"
    (OUT / file_name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["tiles"].append({
        "id": tid,
        "bounds": [
            round(west, 5),
            round(south, 5),
            round(west + STEP, 5),
            round(south + STEP, 5),
        ],
        "count": len(data),
        "file": file_name,
    })

(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Built {len(manifest['tiles'])} tiles from {len(rows)} Taipei schedules.")
