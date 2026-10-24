#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, re, time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent
V2=HERE.parent
DATA=V2/'data'
CITY_DIR=DATA/'cities'/'taichung'
SOURCE_URL='https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid=68d1a87f-7baa-4b50-8408-c36a3a7eda68'
LANDING_URL='https://data.gov.tw/dataset/84004'
UA='study-in-taiwan-garbage-v2/2.3 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS=2
AREA_SLUG={
'中區':'central','東區':'east','南區':'south','西區':'west','北區':'north','北屯區':'beitun','西屯區':'xitun','南屯區':'nantun',
'太平區':'taiping','大里區':'dali','霧峰區':'wufeng','烏日區':'wuri','豐原區':'fengyuan','后里區':'houli','石岡區':'shigang','東勢區':'dongshi','和平區':'heping','新社區':'xinshe','潭子區':'tanzi','大雅區':'daya','神岡區':'shengang','大甲區':'dajia','外埔區':'waipu','大安區':'daan','沙鹿區':'shalu','龍井區':'longjing','大肚區':'dadu','梧棲區':'wuqi','清水區':'qingshui'}
DAY=[(1,'1'),(2,'2'),(3,'3'),(4,'4'),(5,'5'),(6,'6'),(7,'0')]

def iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
def atomic_json(path,obj,pretty=False):
    path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+'.tmp')
    text=json.dumps(obj,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (',',':'))+'\n'
    tmp.write_text(text,encoding='utf-8'); os.replace(tmp,path)
def fetch():
    last=None
    for attempt in range(MAX_ATTEMPTS):
        try:
            req=Request(SOURCE_URL,headers={'User-Agent':UA,'Accept':'application/json,application/octet-stream,*/*'})
            with urlopen(req,timeout=90) as r:
                raw=r.read()
                if len(raw)<1000: raise RuntimeError(f'source too small: {len(raw)} bytes')
                return raw,dict(etag=r.headers.get('ETag'),last_modified=r.headers.get('Last-Modified'))
        except (HTTPError,URLError,TimeoutError,RuntimeError) as e:
            last=e
            if attempt+1<MAX_ATTEMPTS: time.sleep(1)
    raise RuntimeError(f'Taichung source failed after {MAX_ATTEMPTS} attempts: {last}')
def compact(row):
    x={'v':str(row.get('village') or ''),'c':str(row.get('car_licence') or ''),'p':str(row.get('caption') or ''),'t':str(row.get('task_type') or ''),'g':{},'r':{}}
    for n,day in DAY:
        gs=str(row.get(f'g_d{n}_time_s') or '').strip(); ge=str(row.get(f'g_d{n}_time_e') or '').strip()
        rs=str(row.get(f'r_d{n}_time_s') or '').strip(); re_=str(row.get(f'r_d{n}_time_e') or '').strip()
        if gs or ge: x['g'][day]=[gs,ge]
        if rs or re_: x['r'][day]=[rs,re_]
    return x
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--input'); args=ap.parse_args(); checked=iso()
    if args.input:
        raw=Path(args.input).read_bytes(); headers={'etag':None,'last_modified':None}
    else: raw,headers=fetch()
    sha=hashlib.sha256(raw).hexdigest()
    try: rows=json.loads(raw.decode('utf-8-sig'))
    except Exception as e: raise SystemExit(f'refusing to publish invalid Taichung JSON: {e}')
    if not isinstance(rows,list) or not rows: raise SystemExit('refusing to publish empty/non-list Taichung dataset')
    groups=defaultdict(list)
    for row in rows:
        if not isinstance(row,dict): continue
        area=str(row.get('area') or '').strip()
        if not area: continue
        groups[area].append(compact(row))
    if len(groups)<20: raise SystemExit(f'refusing to publish suspicious Taichung area count: {len(groups)}')
    schedule=CITY_DIR/'schedule'; schedule.mkdir(parents=True,exist_ok=True); keep={'index.json'}; files=[]
    for area,items in sorted(groups.items()):
        slug=AREA_SLUG.get(area) or hashlib.sha1(area.encode()).hexdigest()[:10]; name=f'{slug}.json'; keep.add(name)
        obj={'version':1,'city':'taichung','area':area,'count':len(items),'stops':items}
        atomic_json(schedule/name,obj); files.append({'area':area,'slug':slug,'file':name,'count':len(items)})
    for old in schedule.glob('*.json'):
        if old.name not in keep: old.unlink()
    index={'version':1,'city':'taichung','source':'Taichung City Government Environmental Protection Bureau','source_url':SOURCE_URL,'landing_url':LANDING_URL,'source_metadata_updated':'2026-07-31 11:59','source_sha256':sha,'generated_at':checked,'row_count':len(rows),'area_count':len(files),'areas':files}
    atomic_json(schedule/'index.json',index,pretty=True)
    manifest={'version':2,'city':'taichung','name_zh':'臺中市','name_en':'Taichung City','status':'schedule-only','source_priority':['local_official','moenv_national'],'source_provider':'Taichung City Government Environmental Protection Bureau','source_landing_url':LANDING_URL,'source_direct_download_url':SOURCE_URL,'source_updated':'2026-07-31 11:59','source_content_sha256':sha,'row_count':len(rows),'area_count':len(files),'mapped_stop_count':0,'schedule_index':'schedule/index.json','tiles_manifest':'tiles/manifest.json','refresh':{'mode':'manual','network_attempts_per_request':2,'retry_after_failure':'next Monday','last_success':checked,'last_checked':checked,'last_attempt_status':'success','next_retry_not_before':None},'notes':'Official static schedule imported and split into 29 district JSON files. Source has no documented lat/lng, so this city remains schedule-only until coordinates are resolved from an official/cached source.'}
    atomic_json(CITY_DIR/'manifest.json',manifest,pretty=True)
    hist=CITY_DIR/'source-history.json'; h=json.loads(hist.read_text(encoding='utf-8')) if hist.exists() else {'version':1,'city':'taichung','checks':[]}
    h['checks']=(h.get('checks',[])+[{'checked_at':checked,'provider':manifest['source_provider'],'landing_url':LANDING_URL,'direct_download_url':SOURCE_URL,'status':'success','metadata_updated':'2026-07-31 11:59','content_sha256':sha,'row_count':len(rows),'area_count':len(files),'etag':headers.get('etag'),'last_modified':headers.get('last_modified')}])[-120:]
    atomic_json(hist,h,pretty=True)
    print(f'ok: Taichung {len(rows)} rows split across {len(files)} district JSON files; sha256={sha}')
if __name__=='__main__': main()
