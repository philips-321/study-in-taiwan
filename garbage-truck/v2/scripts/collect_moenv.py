#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, sys, time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent
V2=HERE.parent
DATA=V2/'data'
REGISTRY=DATA/'cities.json'
CACHE=V2/'.cache'/'moenv'
STAGING=V2/'.cache'/'staging'
BASE='https://hwms.moenv.gov.tw/'
LANDING_URL=BASE+'dispPageBox/route/routeCP.aspx?ddsPageID=ROUTE'
LIST_URL=LANDING_URL+'&p={page}'
UA='study-in-taiwan-garbage-v2/2.1 (+https://study-in-taiwan.com/garbage-truck/)'
DAY_MAP={'日':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6}
MAX_NETWORK_ATTEMPTS=2

def now_dt(): return datetime.now(timezone.utc)
def now_iso(): return now_dt().replace(microsecond=0).isoformat()
def load_json(path): return json.loads(path.read_text(encoding='utf-8'))
def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    os.replace(tmp,path)
def next_monday_iso():
    n=now_dt()
    days=(7-n.weekday())%7
    if days==0: days=7
    return (n+timedelta(days=days)).replace(hour=0,minute=0,second=0,microsecond=0).isoformat()
def parse_iso(s):
    try: return datetime.fromisoformat(s) if s else None
    except ValueError: return None

def append_history(city_dir,entry):
    path=city_dir/'source-history.json'
    obj=load_json(path) if path.exists() else {'version':1,'city':city_dir.name,'checks':[]}
    checks=obj.setdefault('checks',[])
    checks.append(entry)
    obj['checks']=checks[-120:]
    atomic_json(path,obj)

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self._table=None; self._row=None; self._cell=None
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='table': self._table=[]; self.tables.append(self._table)
        elif tag=='tr' and self._table is not None: self._row=[]; self._table.append(self._row)
        elif tag in ('td','th') and self._row is not None: self._cell={'text':'','hrefs':[]}; self._row.append(self._cell)
        elif tag=='a' and self._cell is not None and attrs.get('href'): self._cell['hrefs'].append(attrs['href'])
    def handle_data(self,data):
        if self._cell is not None: self._cell['text']+=data
    def handle_endtag(self,tag):
        if tag in ('td','th'):
            if self._cell is not None: self._cell['text']=' '.join(self._cell['text'].split())
            self._cell=None
        elif tag=='tr': self._row=None
        elif tag=='table': self._table=None

class UpstreamUnavailable(RuntimeError):
    def __init__(self,url,last_error):
        self.url=url; self.last_error=last_error
        super().__init__(f'upstream failed twice for {url}: {last_error}')

@dataclass
class HttpResult:
    text:str
    from_cache:bool
    meta:dict

class HttpCache:
    def __init__(self,root,min_age_days,force,delay):
        self.root=root; self.min_age=max(0,min_age_days)*86400; self.force=force
        self.delay=max(0.0,delay); self.last_network_at=0.0
    def _paths(self,url):
        h=hashlib.sha256(url.encode()).hexdigest()
        return self.root/f'{h}.html', self.root/f'{h}.meta.json'
    def get(self,url):
        body,meta_path=self._paths(url)
        body.parent.mkdir(parents=True,exist_ok=True)
        meta=load_json(meta_path) if meta_path.exists() else {}
        if body.exists() and self.min_age and not self.force and time.time()-body.stat().st_mtime<self.min_age:
            text=body.read_text(encoding='utf-8')
            meta={**meta,'content_sha256':hashlib.sha256(text.encode()).hexdigest(),'cache_age_guard':True}
            return HttpResult(text,True,meta)
        headers={'User-Agent':UA,'Accept':'text/html,application/xhtml+xml'}
        if meta.get('etag'): headers['If-None-Match']=meta['etag']
        if meta.get('last_modified'): headers['If-Modified-Since']=meta['last_modified']
        last=None
        for attempt in range(MAX_NETWORK_ATTEMPTS):
            try:
                wait=self.delay-(time.time()-self.last_network_at)
                if wait>0: time.sleep(wait)
                self.last_network_at=time.time()
                req=Request(url,headers=headers)
                with urlopen(req,timeout=35) as r:
                    raw=r.read(); text=raw.decode(r.headers.get_content_charset() or 'utf-8',errors='replace')
                    if len(text.strip())<200: raise RuntimeError(f'upstream response too small ({len(text)} bytes)')
                    content_hash=hashlib.sha256(raw).hexdigest()
                    meta={'url':url,'checked_at':now_iso(),'etag':r.headers.get('ETag'),'last_modified':r.headers.get('Last-Modified'),'content_sha256':content_hash,'http_status':getattr(r,'status',200)}
                    body.write_text(text,encoding='utf-8'); atomic_json(meta_path,meta)
                    return HttpResult(text,False,meta)
            except HTTPError as e:
                if e.code==304 and body.exists():
                    text=body.read_text(encoding='utf-8'); meta={**meta,'checked_at':now_iso(),'http_status':304,'content_sha256':hashlib.sha256(text.encode()).hexdigest()}; atomic_json(meta_path,meta)
                    return HttpResult(text,True,meta)
                last=e
            except (URLError,TimeoutError,RuntimeError) as e: last=e
            if attempt+1<MAX_NETWORK_ATTEMPTS: time.sleep(2**attempt)
        raise UpstreamUnavailable(url,last)

def parse_tables(html): p=TableParser(); p.feed(html); return p.tables
def find_last_page(html): return max([int(x) for x in re.findall(r'[?&]p=(\d+)',html)] or [1])
def parse_source_updated(html):
    m=re.search(r'資料更新日期[:：]\s*([0-9]+年[0-9]+月[0-9]+日)',html)
    return m.group(1) if m else None
def route_rows(html,city_zh):
    out=[]
    for table in parse_tables(html):
        for row in table:
            if len(row)<5: continue
            vals=[c['text'] for c in row]
            if vals[0]!=city_zh or not row[4].get('hrefs'): continue
            out.append({'city_zh':vals[0],'district':vals[1],'method':vals[2],'route_id':vals[3],'route_name':vals[4],'detail_url':urljoin(BASE,row[4]['hrefs'][0])})
    return out
def parse_days(s): return sorted({DAY_MAP[ch] for ch in (s or '') if ch in DAY_MAP})
def parse_detail(html,route,city_slug,source_updated,fetched_at):
    target=None
    for table in parse_tables(html):
        if table and {'清運序','清運點名稱描述','清運時間'}.issubset({c['text'] for c in table[0]}): target=table; break
    if not target or len(target)<2: raise RuntimeError(f"schedule table not found for {route['route_id']}")
    stops=[]
    for row in target[1:]:
        vals=[c['text'] for c in row]
        if len(vals)<6 or not vals[0].isdigit() or not re.match(r'^[0-2]\d:[0-5]\d$',vals[2].strip()): continue
        stops.append({'city':city_slug,'district':route['district'],'route_id':route['route_id'],'route_name':route['route_name'],'collection_method':route['method'],'stop_order':int(vals[0]),'name':vals[1],'time':vals[2].strip(),'lat':None,'lng':None,'geo_status':'unresolved','services':{'general':{'known':True,'days':parse_days(vals[3])},'food':{'known':True,'days':parse_days(vals[4])},'recycling':{'known':True,'days':parse_days(vals[5])}},'source':{'provider':'MOENV nationwide garbage route database','url':route['detail_url'],'source_updated':source_updated,'fetched_at':fetched_at}})
    if not stops: raise RuntimeError(f"no usable stops parsed for {route['route_id']}")
    return {'version':2,'city':city_slug,'district':route['district'],'route_id':route['route_id'],'route_name':route['route_name'],'collection_method':route['method'],'source':'moenv_national','source_updated':source_updated,'fetched_at':fetched_at,'stops':stops}

def base_manifest(city,args):
    return {'version':2,'city':args.city,'name_zh':city['name_zh'],'name_en':city['name_en'],'status':'pending-import','source_priority':['local_official','moenv_national'],'refresh':{'mode':'manual','source_change_guard':True,'network_attempts_per_request':MAX_NETWORK_ATTEMPTS,'retry_after_failure':'next Monday','stale_if_error':True,'overwrite_on_empty':False,'last_success':None,'last_checked':None,'last_attempt':None,'last_attempt_status':None,'next_retry_not_before':None},'routes_index':'routes/index.json','tiles_manifest':'tiles/manifest.json','route_count':0,'stop_count':0,'notes':'V2 static JSON. No D1. Manual refresh only. Published last-known-good is never replaced by a failed/partial source pull.'}

def record_failure(city_dir,manifest,error):
    t=now_iso(); next_retry=next_monday_iso()
    r=manifest.setdefault('refresh',{})
    r.update({'last_attempt':t,'last_checked':t,'last_attempt_status':'upstream-failed-after-2-attempts','next_retry_not_before':next_retry,'last_error':str(error)})
    append_history(city_dir,{'checked_at':t,'provider':'MOENV nationwide garbage route database','landing_url':LANDING_URL,'direct_download_url':None,'status':'upstream-failed-after-2-attempts','next_retry_not_before':next_retry,'error':str(error)})
    atomic_json(city_dir/'manifest.json',manifest)
    print(f'upstream stopped after 2 attempts; do not retry before {next_retry} unless --force',file=sys.stderr)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--city',required=True)
    ap.add_argument('--min-age-days',type=int,default=0,help='Optional local HTTP cache age guard. Default 0 because refresh is manual.')
    ap.add_argument('--force',action='store_true')
    ap.add_argument('--delay',type=float,default=.35)
    args=ap.parse_args()
    reg=load_json(REGISTRY); city=next((c for c in reg['cities'] if c['slug']==args.city),None)
    if not city: raise SystemExit(f'unknown city slug: {args.city}')
    city_dir=DATA/'cities'/args.city; city_dir.mkdir(parents=True,exist_ok=True); manifest_path=city_dir/'manifest.json'
    manifest=load_json(manifest_path) if manifest_path.exists() else base_manifest(city,args)
    cooldown=parse_iso(manifest.get('refresh',{}).get('next_retry_not_before'))
    if cooldown and now_dt()<cooldown and not args.force:
        print(f"skip: previous source failure; next manual retry is {cooldown.isoformat()} (use --force only if you intentionally want to override)")
        return
    http=HttpCache(CACHE,args.min_age_days,args.force,args.delay)
    try:
        first=http.get(LIST_URL.format(page=1))
    except UpstreamUnavailable as e:
        record_failure(city_dir,manifest,e); raise SystemExit(2)
    checked=now_iso(); source_updated=parse_source_updated(first.text)
    append_history(city_dir,{'checked_at':checked,'provider':'MOENV nationwide garbage route database','landing_url':LANDING_URL,'direct_download_url':None,'status':'checked','observed_source_updated':source_updated,'etag':first.meta.get('etag'),'last_modified':first.meta.get('last_modified'),'content_sha256':first.meta.get('content_sha256'),'http_status':first.meta.get('http_status')})
    refresh=manifest.setdefault('refresh',{})
    refresh.update({'last_checked':checked,'last_attempt':checked,'next_retry_not_before':None,'last_error':None})
    if source_updated and manifest.get('source_updated')==source_updated and not args.force:
        refresh['last_attempt_status']='source-unchanged-skip-full-crawl'
        atomic_json(manifest_path,manifest)
        print(f'skip full crawl: MOENV source update marker unchanged ({source_updated})')
        return
    last_page=find_last_page(first.text); routes=route_rows(first.text,city['name_zh'])
    try:
        for p in range(2,last_page+1):
            page=http.get(LIST_URL.format(page=p)); routes.extend(route_rows(page.text,city['name_zh'])); source_updated=source_updated or parse_source_updated(page.text)
    except UpstreamUnavailable as e:
        record_failure(city_dir,manifest,e); raise SystemExit(2)
    routes=sorted({r['route_id']:r for r in routes}.values(),key=lambda r:r['route_id'])
    if not routes:
        refresh['last_attempt_status']='refused-zero-routes'; atomic_json(manifest_path,manifest)
        raise SystemExit('refusing to publish: upstream returned zero routes for this city')
    stage=STAGING/args.city
    if stage.exists(): shutil.rmtree(stage)
    routes_stage=stage/'routes'; routes_stage.mkdir(parents=True,exist_ok=True)
    fetched_at=now_iso(); parse_failures=[]
    try:
        for i,route in enumerate(routes,1):
            print(f"[{i}/{len(routes)}] {route['route_id']} {route['route_name']}")
            try:
                obj=parse_detail(http.get(route['detail_url']).text,route,args.city,source_updated,fetched_at)
                atomic_json(routes_stage/f"{route['route_id']}.json",obj)
            except UpstreamUnavailable:
                raise
            except Exception as e:
                parse_failures.append((route['route_id'],str(e))); print(f"warning: staged parse failed for {route['route_id']}: {e}",file=sys.stderr)
    except UpstreamUnavailable as e:
        shutil.rmtree(stage,ignore_errors=True); record_failure(city_dir,manifest,e); raise SystemExit(2)
    if parse_failures:
        shutil.rmtree(stage,ignore_errors=True)
        refresh['last_attempt_status']='parse-failed-no-publish'; refresh['last_attempt_failures']=len(parse_failures); atomic_json(manifest_path,manifest)
        raise SystemExit(f'refusing partial publish: {len(parse_failures)} route parse failure(s); previous JSON remains untouched')
    route_files=[]; stop_count=0
    for path in sorted(routes_stage.glob('*.json')):
        obj=load_json(path); stops=obj.get('stops') or []
        if not stops: continue
        stop_count+=len(stops); route_files.append({'route_id':obj['route_id'],'district':obj.get('district'),'route_name':obj.get('route_name'),'file':path.name,'stop_count':len(stops)})
    if not route_files:
        shutil.rmtree(stage,ignore_errors=True); raise SystemExit('refusing to publish: staged dataset has no valid routes')
    atomic_json(routes_stage/'index.json',{'version':2,'city':args.city,'source':'moenv_national','source_updated':source_updated,'generated_at':fetched_at,'complete_refresh':True,'failed_route_count':0,'routes':route_files})
    published=city_dir/'routes'; backup=city_dir/'routes.prev'
    if backup.exists(): shutil.rmtree(backup)
    if published.exists(): published.replace(backup)
    routes_stage.replace(published)
    shutil.rmtree(backup,ignore_errors=True); shutil.rmtree(stage,ignore_errors=True)
    manifest['route_count']=len(route_files); manifest['stop_count']=stop_count; manifest['status']='schedule-only' if manifest.get('status')!='ready' else 'ready'; manifest['source_updated']=source_updated
    refresh.update({'last_success':fetched_at,'last_checked':fetched_at,'last_attempt':fetched_at,'last_attempt_status':'success','last_attempt_failures':0,'next_retry_not_before':None,'last_error':None})
    atomic_json(manifest_path,manifest)
    append_history(city_dir,{'checked_at':fetched_at,'provider':'MOENV nationwide garbage route database','landing_url':LANDING_URL,'direct_download_url':None,'status':'published','observed_source_updated':source_updated,'route_count':len(route_files),'stop_count':stop_count})
    print(f'ok: {len(route_files)} routes / {stop_count} stops')
if __name__=='__main__': main()
