#!/usr/bin/env python3
import csv, io, json, math, shutil, urllib.request
from datetime import datetime, timezone
from pathlib import Path

CSV_URL = "https://data.ntpc.gov.tw/api/datasets/edc3ad26-8ae7-4916-a00b-bc6048d19bf8/csv/file"
OUT = Path("garbage-truck/data/new-taipei")
STEP = 0.06
ORIGIN_LNG = 121.2
ORIGIN_LAT = 24.6

DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]

def pick(row, *names):
    for name in names:
        if name in row and str(row[name]).strip() != "": return row[name]
    return ""

def clean_float(v): return float(str(v or "").strip().replace(",", ""))

def parse_time(v):
    s = str(v or "").strip().replace(":", "")
    if not s: return None
    s = s.zfill(4)
    if len(s) != 4 or not s.isdigit(): return None
    h,m = int(s[:2]),int(s[2:])
    if h>23 or m>59: return None
    return f"{h:02d}:{m:02d}", h*60+m

def truth(v):
    s=str(v or "").strip().lower()
    return s in {"1","y","yes","true","是","有","收運","v"}

def mask(row, prefix_en, prefix_zh):
    bits=0
    zh_days=["日","一","二","三","四","五","六"]
    for i,(d,z) in enumerate(zip(DAYS,zh_days)):
        val=pick(row, f"{prefix_en}{d}", f"禮拜{z}是否收運（{prefix_zh}）")
        if truth(val): bits |= (1<<i)
    return bits

def compact(row):
    try:
        x=clean_float(pick(row,"longitude","經度")); y=clean_float(pick(row,"latitude","緯度"))
        t=parse_time(pick(row,"time","表定時間"))
    except (TypeError,ValueError): return None
    place=str(pick(row,"name","清運點名稱")).strip()
    if not place or not t: return None
    return {
      "p":place,"x":x,"y":y,"a":t[0],"am":t[1],
      "c":str(pick(row,"city","行政區")).strip(),
      "l":str(pick(row,"linename","路線名稱")).strip(),
      "g":mask(row,"garbage","一般垃圾"),
      "r":mask(row,"recycling","回收"),
      "f":mask(row,"foodscraps","廚餘")
    }

def tile_id(r):
    return f"{math.floor((r['x']-ORIGIN_LNG)/STEP)}_{math.floor((r['y']-ORIGIN_LAT)/STEP)}"

req=urllib.request.Request(CSV_URL,headers={"User-Agent":"study-in-taiwan-garbage-truck-grid/1.0"})
with urllib.request.urlopen(req,timeout=90) as resp: raw=resp.read()
text=raw.decode("utf-8-sig")
source=list(csv.DictReader(io.StringIO(text)))
if len(source)<20000: raise RuntimeError(f"Unexpected New Taipei CSV size: {len(source)}")
rows=[x for x in (compact(r) for r in source) if x]
if len(rows)<20000: raise RuntimeError(f"Too few valid rows: {len(rows)}")
tiles={}
for r in rows: tiles.setdefault(tile_id(r),[]).append(r)
shutil.rmtree(OUT,ignore_errors=True); OUT.mkdir(parents=True,exist_ok=True)
manifest={"version":1,"city":"new-taipei","generated_at":datetime.now(timezone.utc).isoformat(),"source":"New Taipei Open Data garbage-truck routes","source_csv":CSV_URL,"grid_deg":STEP,"origin":[ORIGIN_LNG,ORIGIN_LAT],"total_rows":len(rows),"tiles":[]}
for tid in sorted(tiles,key=lambda v:tuple(int(x) for x in v.split("_"))):
    ix,iy=map(int,tid.split("_")); west=ORIGIN_LNG+ix*STEP; south=ORIGIN_LAT+iy*STEP
    fn=f"{tid}.json"; (OUT/fn).write_text(json.dumps(tiles[tid],ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    manifest["tiles"].append({"id":tid,"bounds":[round(west,5),round(south,5),round(west+STEP,5),round(south+STEP,5)],"count":len(tiles[tid]),"file":fn})
(OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Built {len(manifest['tiles'])} tiles from {len(rows)} New Taipei schedules.")
