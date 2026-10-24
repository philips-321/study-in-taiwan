#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
CITY_DIR = HERE.parent / "data" / "cities" / "keelung"
OUT = CITY_DIR / "source-probe.json"
UA = "study-in-taiwan-garbage-v2/2.4 (+https://study-in-taiwan.com/garbage-truck/)"
MAX_ATTEMPTS = 2
SOURCES = [
    {
        "kind": "official_csv",
        "url": "https://opendata-kl.askeycloud.com/route_klepb.csv",
        "landing_url": "https://data.gov.tw/dataset/128678",
    },
    {
        "kind": "official_route_json_legacy_endpoint",
        "url": "http://210.61.25.6/BSTruckMIS/subsystem/JSon/keelungroute.ashx",
        "landing_url": "https://data.gov.tw/dataset/128678",
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def atomic_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def fetch(url: str) -> tuple[bytes, dict]:
    last = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            req = Request(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept": "text/csv,application/json,text/plain,*/*",
                },
            )
            with urlopen(req, timeout=45) as r:
                raw = r.read()
                if len(raw) < 20:
                    raise RuntimeError(f"response too small: {len(raw)} bytes")
                return raw, {
                    "http_status": getattr(r, "status", 200),
                    "content_type": r.headers.get("Content-Type"),
                    "etag": r.headers.get("ETag"),
                    "last_modified": r.headers.get("Last-Modified"),
                    "attempt": attempt,
                }
        except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
            last = f"{type(exc).__name__}: {exc}"
            if attempt < MAX_ATTEMPTS:
                time.sleep(1)
    raise RuntimeError(last or "unknown fetch error")


def decode_text(raw: bytes) -> tuple[str, str]:
    for encoding in ("utf-8-sig", "utf-8", "cp950", "big5"):
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            pass
    return raw.decode("utf-8", errors="replace"), "utf-8-replace"


def inspect_csv(raw: bytes) -> dict:
    text, encoding = decode_text(raw)
    sample = text[:65536]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    fields = [str(x or "").strip() for x in (reader.fieldnames or [])]
    rows = []
    count = 0
    for row in reader:
        count += 1
        if len(rows) < 3:
            rows.append({str(k or "").strip(): str(v or "").strip()[:200] for k, v in row.items()})
    if not fields or count == 0:
        raise RuntimeError("CSV parsed but had no header/rows")
    return {
        "format": "csv",
        "encoding": encoding,
        "fields": fields,
        "row_count": count,
        "sample_rows": rows,
    }


def inspect_json(raw: bytes) -> dict:
    text, encoding = decode_text(raw)
    obj = json.loads(text)
    info = {"format": "json", "encoding": encoding, "root_type": type(obj).__name__}
    sample_rows = []
    if isinstance(obj, list):
        info["row_count"] = len(obj)
        dict_rows = [x for x in obj if isinstance(x, dict)]
        info["fields"] = sorted({str(k) for row in dict_rows[:50] for k in row.keys()})
        sample_rows = dict_rows[:3]
    elif isinstance(obj, dict):
        info["root_keys"] = list(obj.keys())[:50]
        candidates = [(k, v) for k, v in obj.items() if isinstance(v, list)]
        if candidates:
            key, rows = max(candidates, key=lambda kv: len(kv[1]))
            info["candidate_list_key"] = key
            info["row_count"] = len(rows)
            dict_rows = [x for x in rows if isinstance(x, dict)]
            info["fields"] = sorted({str(k) for row in dict_rows[:50] for k in row.keys()})
            sample_rows = dict_rows[:3]
    info["sample_rows"] = sample_rows
    return info


def main() -> None:
    checked = now_iso()
    result = {
        "version": 1,
        "city": "keelung",
        "checked_at": checked,
        "purpose": "One-time/bounded source-shape probe before writing a publishing importer.",
        "publishable_route_data": False,
        "sources": [],
    }

    for source in SOURCES:
        entry = {**source, "checked_at": checked}
        try:
            raw, headers = fetch(source["url"])
            entry.update(headers)
            entry["status"] = "reachable"
            entry["byte_count"] = len(raw)
            entry["sha256"] = hashlib.sha256(raw).hexdigest()
            if source["kind"] == "official_csv":
                entry.update(inspect_csv(raw))
            else:
                try:
                    entry.update(inspect_json(raw))
                except Exception as json_exc:
                    text, encoding = decode_text(raw)
                    entry.update({
                        "format": "non-json-text",
                        "encoding": encoding,
                        "parse_error": f"{type(json_exc).__name__}: {json_exc}",
                        "text_prefix": " ".join(text[:500].split()),
                    })
        except Exception as exc:
            entry.update({"status": "unreachable-after-2-attempts", "error": str(exc)})
        result["sources"].append(entry)

    reachable = [x for x in result["sources"] if x.get("status") == "reachable"]
    result["recommended_source_kind"] = reachable[0]["kind"] if reachable else None
    result["status"] = "source-shape-captured" if reachable else "no-source-reachable"
    atomic_json(OUT, result)
    print(f"Keelung probe: {result['status']}; reachable={len(reachable)}; wrote {OUT}")


if __name__ == "__main__":
    main()
