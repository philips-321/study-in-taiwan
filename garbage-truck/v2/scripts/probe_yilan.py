#!/usr/bin/env python3
from __future__ import annotations
import csv, hashlib, io, json, os, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent
CITY_DIR=HERE.parent/'data'/'cities'/'yilan'
OUT=CITY_DIR/'source-probe.json'
UA='study-in-taiwan-garbage-v2/2.6 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS=2
SOURCES=[
 {'kind':'official_csv','url':'https://opendata.ilepb.gov.tw/ILEPB04004?format=csv&media=file','landing_url':'https://data.gov.tw/dataset/128901'},
 {'kind':'official_json','url':'https://opendata.ilepb.gov.tw/ILEPB04004?media=file','landing_url':'https://data.gov.tw/dataset/128901'}
]

def now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); os.replace(tmp,path)
def fetch(url):
    last=None
    for attempt in range(1,MAX_ATTEMPTS+1):
        try:
            req=Request(url,headers={'User-Agent':UA,'Accept':'text/csv,application/json,text/plain,*/*'})
            with urlopen(req,timeout=45) as r:
                raw=r.read()
                if len(raw)<20: raise RuntimeError(f'response too small: {len(raw)} bytes')
                return raw, {'http_status':getattr(r,'status',200),'content_type':r.headers.get('Content-Type'),'etag':r.headers.get('ETag'),'last_modified':r.headers.get('Last-Modified'),'attempt':attempt}
        except (HTTPError,URLError,TimeoutError,RuntimeError) as e:
            last=f'{type(e).__name__}: {e}'
            if attempt<MAX_ATTEMPTS: time.sleep(1)
    raise RuntimeError(last or 'unknown fetch error')
def decode(raw):
    for enc in ('utf-8-sig','utf-8','cp950','big5'):
        try:return raw.decode(enc),enc
        except UnicodeDecodeError:pass
    return raw.decode('utf-8',errors='replace'),'utf-8-replace'
def inspect_csv(raw):
    text,enc=decode(raw); reader=csv.DictReader(io.StringIO(text)); fields=[str(x or '').strip() for x in (reader.fieldnames or [])]
    rows=[]; count=0
    for row in reader:
        count+=1
        if len(rows)<3: rows.append({str(k or '').strip():str(v or '').strip()[:200] for k,v in row.items()})
    if not fields or count==0: raise RuntimeError('CSV parsed but had no header/rows')
    return {'format':'csv','encoding':enc,'fields':fields,'row_count':count,'sample_rows':rows}
def inspect_json(raw):
    text,enc=decode(raw); obj=json.loads(text); info={'format':'json','encoding':enc,'root_type':type(obj).__name__}
    if isinstance(obj,list): rows=obj
    elif isinstance(obj,dict):
        c=[v for v in obj.values() if isinstance(v,list)]; rows=max(c,key=len) if c else []
        info['root_keys']=list(obj.keys())[:50]
    else: rows=[]
    info['row_count']=len(rows); dict_rows=[x for x in rows if isinstance(x,dict)]
    info['fields']=sorted({str(k) for r in dict_rows[:50] for k in r.keys()}); info['sample_rows']=dict_rows[:3]
    if not rows: raise RuntimeError('JSON parsed but no row list found')
    return info

def main():
    checked=now_iso(); result={'version':1,'city':'yilan','checked_at':checked,'purpose':'Bounded source-shape probe before publishing importer.','publishable_route_data':False,'sources':[]}
    for s in SOURCES:
        e={**s,'checked_at':checked}
        try:
            raw,h=fetch(s['url']); e.update(h); e.update({'status':'reachable','byte_count':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
            try: e.update(inspect_csv(raw) if s['kind']=='official_csv' else inspect_json(raw))
            except Exception as pe:
                text,enc=decode(raw); e.update({'format':'unparsed-text','encoding':enc,'parse_error':f'{type(pe).__name__}: {pe}','text_prefix':' '.join(text[:500].split())})
        except Exception as ex: e.update({'status':'unreachable-after-2-attempts','error':str(ex)})
        result['sources'].append(e)
    reachable=[x for x in result['sources'] if x.get('status')=='reachable' and x.get('row_count')]
    result['recommended_source_kind']=reachable[0]['kind'] if reachable else None
    result['status']='source-shape-captured' if reachable else 'no-parseable-source-reachable'
    atomic_json(OUT,result); print(f"Yilan probe: {result['status']}; parseable={len(reachable)}; wrote {OUT}")
if __name__=='__main__': main()
