#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, re, sys, time
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent; V2=HERE.parent; DATA=V2/'data'; REGISTRY=DATA/'cities.json'; CACHE=V2/'.cache'/'moenv'
BASE='https://hwms.moenv.gov.tw/'; LIST_URL=BASE+'dispPageBox/route/routeCP.aspx?ddsPageID=ROUTE&p={page}'
UA='study-in-taiwan-garbage-v2/2.0 (+https://study-in-taiwan.com/garbage-truck/)'
DAY_MAP={'日':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6}
def now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
def load_json(path): return json.loads(path.read_text(encoding='utf-8'))
def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+'.tmp'); tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); os.replace(tmp,path)
class TableParser(HTMLParser):
    def __init__(self): super().__init__(); self.tables=[]; self._table=None; self._row=None; self._cell=None
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
@dataclass
class HttpResult: text:str; from_cache:bool; stale:bool
class HttpCache:
    def __init__(self,root,min_age_days,force,delay): self.root=root; self.min_age=max(0,min_age_days)*86400; self.force=force; self.delay=max(0.0,delay); self.last_network_at=0.0
    def _paths(self,url):
        h=hashlib.sha256(url.encode()).hexdigest(); return self.root/f'{h}.html', self.root/f'{h}.meta.json'
    def get(self,url):
        body,meta_path=self._paths(url); body.parent.mkdir(parents=True,exist_ok=True); meta=load_json(meta_path) if meta_path.exists() else {}
        if body.exists() and not self.force and time.time()-body.stat().st_mtime<self.min_age: return HttpResult(body.read_text(encoding='utf-8'),True,False)
        headers={'User-Agent':UA,'Accept':'text/html,application/xhtml+xml'}
        if meta.get('etag'): headers['If-None-Match']=meta['etag']
        if meta.get('last_modified'): headers['If-Modified-Since']=meta['last_modified']
        last=None
        for attempt in range(3):
            try:
                wait=self.delay-(time.time()-self.last_network_at)
                if wait>0: time.sleep(wait)
                self.last_network_at=time.time(); req=Request(url,headers=headers)
                with urlopen(req,timeout=35) as r:
                    raw=r.read(); text=raw.decode(r.headers.get_content_charset() or 'utf-8',errors='replace')
                    if len(text.strip())<200: raise RuntimeError(f'upstream response too small ({len(text)} bytes)')
                    body.write_text(text,encoding='utf-8'); atomic_json(meta_path,{'url':url,'checked_at':now_iso(),'etag':r.headers.get('ETag'),'last_modified':r.headers.get('Last-Modified')}); return HttpResult(text,False,False)
            except HTTPError as e:
                if e.code==304 and body.exists(): meta['checked_at']=now_iso(); atomic_json(meta_path,meta); return HttpResult(body.read_text(encoding='utf-8'),True,False)
                last=e
            except (URLError,TimeoutError,RuntimeError) as e: last=e
            if attempt<2: time.sleep(2**attempt)
        if body.exists(): print(f'warning: upstream failed; using stale cache for {url}: {last}',file=sys.stderr); return HttpResult(body.read_text(encoding='utf-8'),True,True)
        raise RuntimeError(f'upstream failed and no cache exists for {url}: {last}')
def parse_tables(html): p=TableParser(); p.feed(html); return p.tables
def find_last_page(html): return max([int(x) for x in re.findall(r'[?&]p=(\d+)',html)] or [1])
def parse_source_updated(html):
    m=re.search(r'資料更新日期[:：]\s*([0-9]+年[0-9]+月[0-9]+日)',html); return m.group(1) if m else None
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
        stops.append({'city':city_slug,'district':route['district'],'route_id':route['route_id'],'route_name':route['route_name'],'collection_method':route['method'],'stop_order':int(vals[0]),'name':vals[1],'time':vals[2].strip(),'lat':None,'lng':None,'geo_status':'unresolved','services':{'general':{'days':parse_days(vals[3])},'food':{'days':parse_days(vals[4])},'recycling':{'days':parse_days(vals[5])}},'source':{'provider':'MOENV nationwide garbage route database','url':route['detail_url'],'source_updated':source_updated,'fetched_at':fetched_at}})
    if not stops: raise RuntimeError(f"no usable stops parsed for {route['route_id']}")
    return {'version':2,'city':city_slug,'district':route['district'],'route_id':route['route_id'],'route_name':route['route_name'],'collection_method':route['method'],'source':'moenv_national','source_updated':source_updated,'fetched_at':fetched_at,'stops':stops}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--city',required=True); ap.add_argument('--min-age-days',type=int,default=30); ap.add_argument('--force',action='store_true'); ap.add_argument('--delay',type=float,default=.35); args=ap.parse_args()
    reg=load_json(REGISTRY); city=next((c for c in reg['cities'] if c['slug']==args.city),None)
    if not city: raise SystemExit(f'unknown city slug: {args.city}')
    city_dir=DATA/'cities'/args.city; manifest_path=city_dir/'manifest.json'
    if manifest_path.exists(): manifest=load_json(manifest_path)
    else: manifest={'version':2,'city':args.city,'name_zh':city['name_zh'],'name_en':city['name_en'],'status':'pending-import','source_priority':['local_official','moenv_national'],'refresh':{'mode':'manual','minimum_interval_days':args.min_age_days,'stale_if_error':True,'overwrite_on_empty':False,'last_success':None},'routes_index':'routes/index.json','tiles_manifest':'tiles/manifest.json','route_count':0,'stop_count':0,'notes':'V2 static JSON. No D1. Manual refresh; last-known-good is preserved on failure.'}
    last=manifest.get('refresh',{}).get('last_success')
    if last and not args.force:
        try:
            age=(datetime.now(timezone.utc)-datetime.fromisoformat(last)).total_seconds()/86400
            if age<args.min_age_days: print(f'skip: last successful refresh {age:.1f} days ago (< {args.min_age_days})'); return
        except ValueError: pass
    http=HttpCache(CACHE,args.min_age_days,args.force,args.delay); first=http.get(LIST_URL.format(page=1)); last_page=find_last_page(first.text); source_updated=parse_source_updated(first.text); routes=route_rows(first.text,city['name_zh'])
    for p in range(2,last_page+1):
        page=http.get(LIST_URL.format(page=p)); routes.extend(route_rows(page.text,city['name_zh'])); source_updated=source_updated or parse_source_updated(page.text)
    routes=sorted({r['route_id']:r for r in routes}.values(),key=lambda r:r['route_id'])
    if not routes: raise SystemExit('refusing to publish: upstream returned zero routes for this city')
    routes_dir=city_dir/'routes'; routes_dir.mkdir(parents=True,exist_ok=True); fetched_at=now_iso(); failures=[]; successful=set()
    for i,route in enumerate(routes,1):
        print(f"[{i}/{len(routes)}] {route['route_id']} {route['route_name']}")
        try: obj=parse_detail(http.get(route['detail_url']).text,route,args.city,source_updated,fetched_at); atomic_json(routes_dir/f"{route['route_id']}.json",obj); successful.add(route['route_id'])
        except Exception as e: failures.append((route['route_id'],str(e))); print(f"warning: {route['route_id']} kept last-known-good if available: {e}",file=sys.stderr)
    if not failures:
        for old in routes_dir.glob('*.json'):
            if old.name!='index.json' and old.stem not in successful: old.unlink()
    route_files=[]; stop_count=0
    for path in sorted(routes_dir.glob('*.json')):
        if path.name=='index.json': continue
        try:
            obj=load_json(path); stops=obj.get('stops') or []
            if not stops: continue
            stop_count+=len(stops); route_files.append({'route_id':obj['route_id'],'district':obj.get('district'),'route_name':obj.get('route_name'),'file':path.name,'stop_count':len(stops)})
        except Exception as e: print(f'warning: ignoring invalid existing route file {path}: {e}',file=sys.stderr)
    if not route_files: raise SystemExit('refusing to publish: no valid route files remain')
    atomic_json(routes_dir/'index.json',{'version':2,'city':args.city,'source':'moenv_national','source_updated':source_updated,'generated_at':fetched_at,'complete_refresh':not failures,'failed_route_count':len(failures),'routes':route_files})
    manifest['route_count']=len(route_files); manifest['stop_count']=stop_count; manifest['status']='schedule-only' if manifest.get('status')!='ready' else 'ready'; manifest['source_updated']=source_updated
    if not failures: manifest['refresh']['last_success']=fetched_at
    manifest['refresh']['last_attempt']=fetched_at; manifest['refresh']['last_attempt_failures']=len(failures); atomic_json(manifest_path,manifest)
    if failures: print(f'partial refresh: {len(failures)} route(s) failed; last-known-good files were preserved',file=sys.stderr); raise SystemExit(2)
    print(f'ok: {len(route_files)} routes / {stop_count} stops')
if __name__=='__main__': main()
