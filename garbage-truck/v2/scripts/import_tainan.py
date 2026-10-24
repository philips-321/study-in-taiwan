#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent
V2=HERE.parent
DATA=V2/'data'
CITY='tainan'
CITY_DIR=DATA/'cities'/CITY
STAGE=V2/'.cache'/'staging'/CITY
SOURCE_URL='https://data.tainan.gov.tw/Resource/84df8cd6-8741-41ed-919c-5105a28ecd6d'
LANDING_URL='https://data.tainan.gov.tw/DataSet/Detail/57aaa860-bb03-43c2-a797-73971d6cc73d'
METADATA_UPDATED='2026-01-28 16:41:37'
UA='study-in-taiwan-garbage-v2/2.1 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS=2
DAY_MAP={'日':0,'天':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6}

def now_dt(): return datetime.now(timezone.utc)
def now_iso(): return now_dt().replace(microsecond=0).isoformat()
def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    os.replace(tmp,path)
def load_json(path): return json.loads(path.read_text(encoding='utf-8'))
def next_monday_iso():
    n=now_dt(); days=(7-n.weekday())%7
    if days==0: days=7
    return (n+timedelta(days=days)).replace(hour=0,minute=0,second=0,microsecond=0).isoformat()
def parse_iso(s):
    try: return datetime.fromisoformat(s) if s else None
    except ValueError: return None

def history(entry):
    path=CITY_DIR/'source-history.json'
    obj=load_json(path) if path.exists() else {'version':1,'city':CITY,'checks':[]}
    obj['checks']=(obj.get('checks',[])+[entry])[-120:]
    atomic_json(path,obj)

def base_manifest():
    return {'version':2,'city':CITY,'name_zh':'臺南市','name_en':'Tainan City','status':'pending-import','source_priority':['local_official','moenv_national'],'source_provider':'Tainan City Government Open Data','source_landing_url':LANDING_URL,'source_direct_download_url':SOURCE_URL,'source_updated':METADATA_UPDATED,'refresh':{'mode':'manual','source_change_guard':True,'network_attempts_per_request':2,'retry_after_failure':'next Monday','last_success':None,'last_checked':None,'last_attempt':None,'last_attempt_status':None,'next_retry_not_before':None},'routes_index':'routes/index.json','tiles_manifest':'tiles/manifest.json','route_count':0,'stop_count':0,'notes':'Official Tainan JSON with coordinates. Static JSON only; no D1.'}

def get_manifest():
    path=CITY_DIR/'manifest.json'
    return load_json(path) if path.exists() else base_manifest()

def record_failure(manifest,error):
    t=now_iso(); nxt=next_monday_iso(); r=manifest.setdefault('refresh',{})
    r.update({'last_checked':t,'last_attempt':t,'last_attempt_status':'upstream-failed-after-2-attempts','next_retry_not_before':nxt,'last_error':str(error)})
    atomic_json(CITY_DIR/'manifest.json',manifest)
    history({'checked_at':t,'provider':'Tainan City Government Open Data','landing_url':LANDING_URL,'direct_download_url':SOURCE_URL,'status':'upstream-failed-after-2-attempts','next_retry_not_before':nxt,'error':str(error)})

def download():
    last=None
    for attempt in range(MAX_ATTEMPTS):
        try:
            req=Request(SOURCE_URL,headers={'User-Agent':UA,'Accept':'application/json,text/plain,*/*'})
            with urlopen(req,timeout=60) as r:
                raw=r.read()
                if len(raw)<100: raise RuntimeError(f'response too small: {len(raw)} bytes')
                return raw, {'etag':r.headers.get('ETag'),'last_modified':r.headers.get('Last-Modified'),'http_status':getattr(r,'status',200)}
        except (HTTPError,URLError,TimeoutError,RuntimeError) as e:
            last=e
            if attempt+1<MAX_ATTEMPTS: time.sleep(1)
    raise RuntimeError(f'Tainan official download failed twice: {last}')

def extract_rows(obj):
    if isinstance(obj,list): return obj
    if isinstance(obj,dict):
        for k in ('data','records','result','items'):
            v=obj.get(k)
            if isinstance(v,list): return v
            if isinstance(v,dict):
                for kk in ('records','data','items'):
                    if isinstance(v.get(kk),list): return v[kk]
        vals=list(obj.values())
        if vals and all(isinstance(x,dict) for x in vals): return vals
    raise ValueError('unsupported Tainan JSON shape')
def val(row,key):
    if key in row: return row[key]
    low={str(k).lower():v for k,v in row.items()}
    return low.get(key.lower())
def as_float(x):
    try: return float(str(x).strip())
    except Exception: return None
def as_int(x,default):
    try: return int(float(str(x).strip()))
    except Exception: return default
def parse_time(x):
    s=str(x or '').strip(); m=re.search(r'([0-2]?\d)[:：]([0-5]\d)',s)
    if not m: return None
    return f'{int(m.group(1)):02d}:{m.group(2)}'
def parse_days(x):
    s=str(x or '').strip(); days=set()
    for ch in s:
        if ch in DAY_MAP: days.add(DAY_MAP[ch])
    if not days:
        for n in re.findall(r'(?<!\d)([0-7])(?!\d)',s):
            v=int(n); days.add(0 if v in (0,7) else v)
    return sorted(days)
def safe_route_id(x,i):
    s=re.sub(r'[^A-Za-z0-9._-]+','-',str(x or '').strip()).strip('-')
    return s or f'tainan-route-{i:04d}'

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--input'); ap.add_argument('--force',action='store_true'); args=ap.parse_args()
    CITY_DIR.mkdir(parents=True,exist_ok=True); manifest=get_manifest(); cooldown=parse_iso(manifest.get('refresh',{}).get('next_retry_not_before'))
    if cooldown and now_dt()<cooldown and not args.force:
        print(f'skip: Tainan source cooldown until {cooldown.isoformat()}'); return
    checked=now_iso()
    try:
        if args.input:
            raw=Path(args.input).read_bytes(); meta={'etag':None,'last_modified':None,'http_status':None,'input_file':str(args.input)}
        else: raw,meta=download()
    except Exception as e:
        record_failure(manifest,e); raise SystemExit(2)
    content_hash=hashlib.sha256(raw).hexdigest()
    previous_hash=manifest.get('source_content_sha256')
    history({'checked_at':checked,'provider':'Tainan City Government Open Data','landing_url':LANDING_URL,'direct_download_url':SOURCE_URL,'status':'checked','metadata_updated':METADATA_UPDATED,'etag':meta.get('etag'),'last_modified':meta.get('last_modified'),'content_sha256':content_hash,'http_status':meta.get('http_status')})
    if previous_hash==content_hash and not args.force:
        manifest['refresh'].update({'last_checked':checked,'last_attempt':checked,'last_attempt_status':'source-unchanged-skip-import','next_retry_not_before':None,'last_error':None})
        atomic_json(CITY_DIR/'manifest.json',manifest); print('skip import: Tainan source content hash unchanged'); return
    try: obj=json.loads(raw.decode('utf-8-sig'))
    except Exception as e: raise SystemExit(f'refusing to publish invalid JSON: {e}')
    rows=extract_rows(obj)
    if not rows: raise SystemExit('refusing to publish empty Tainan dataset')
    if STAGE.exists(): shutil.rmtree(STAGE)
    routes_dir=STAGE/'routes'; routes_dir.mkdir(parents=True,exist_ok=True)
    grouped={}
    for i,row in enumerate(rows,1):
        if not isinstance(row,dict): continue
        rid=safe_route_id(val(row,'ROUTEID'),i); t=parse_time(val(row,'TIME')); lat=as_float(val(row,'LATITUDE')); lng=as_float(val(row,'LONGITUDE'))
        if not t or lat is None or lng is None: continue
        stop={'city':CITY,'district':str(val(row,'AREA') or '').strip() or None,'route_id':rid,'route_name':str(val(row,'ROUTEID') or rid),'collection_method':None,'stop_order':as_int(val(row,'ROUTEORDER'),i),'name':str(val(row,'POINTNAME') or val(row,'VILLAGE') or '').strip() or f'Stop {i}','time':t,'lat':lat,'lng':lng,'geo_status':'official','services':{'general':{'known':True,'days':parse_days(val(row,'WORDDAY'))},'food':{'known':False,'days':[]},'recycling':{'known':True,'days':parse_days(val(row,'RECYCLEDAY'))}},'source':{'provider':'Tainan City Government Open Data','url':SOURCE_URL,'source_updated':METADATA_UPDATED,'fetched_at':checked}}
        grouped.setdefault(rid,[]).append(stop)
    if not grouped: shutil.rmtree(STAGE,ignore_errors=True); raise SystemExit('refusing to publish: no valid Tainan stops with coordinates/time')
    index=[]; stop_count=0
    for rid,stops in sorted(grouped.items()):
        stops.sort(key=lambda x:(x['stop_order'],x['time'],x['name'])); district=stops[0].get('district')
        atomic_json(routes_dir/f'{rid}.json',{'version':2,'city':CITY,'district':district,'route_id':rid,'route_name':rid,'collection_method':None,'source':'tainan_local_official','source_updated':METADATA_UPDATED,'fetched_at':checked,'stops':stops})
        index.append({'route_id':rid,'district':district,'route_name':rid,'file':f'{rid}.json','stop_count':len(stops)}); stop_count+=len(stops)
    atomic_json(routes_dir/'index.json',{'version':2,'city':CITY,'source':'tainan_local_official','source_updated':METADATA_UPDATED,'generated_at':checked,'complete_refresh':True,'routes':index})
    published=CITY_DIR/'routes'; backup=CITY_DIR/'routes.prev'
    if backup.exists(): shutil.rmtree(backup)
    if published.exists(): published.replace(backup)
    routes_dir.replace(published); shutil.rmtree(backup,ignore_errors=True); shutil.rmtree(STAGE,ignore_errors=True)
    manifest.update({'status':'ready','source_provider':'Tainan City Government Open Data','source_landing_url':LANDING_URL,'source_direct_download_url':SOURCE_URL,'source_updated':METADATA_UPDATED,'source_content_sha256':content_hash,'route_count':len(index),'stop_count':stop_count})
    manifest['refresh'].update({'last_success':checked,'last_checked':checked,'last_attempt':checked,'last_attempt_status':'success','next_retry_not_before':None,'last_error':None})
    atomic_json(CITY_DIR/'manifest.json',manifest)
    history({'checked_at':checked,'provider':'Tainan City Government Open Data','landing_url':LANDING_URL,'direct_download_url':SOURCE_URL,'status':'published','metadata_updated':METADATA_UPDATED,'content_sha256':content_hash,'route_count':len(index),'stop_count':stop_count})
    print(f'ok: Tainan official source -> {len(index)} routes / {stop_count} mapped stops')
if __name__=='__main__': main()
