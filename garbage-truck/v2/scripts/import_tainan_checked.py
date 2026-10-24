#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, sys, tempfile, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent
CITY_DIR=HERE.parent/'data'/'cities'/'tainan'
MANIFEST=CITY_DIR/'manifest.json'
HISTORY=CITY_DIR/'source-history.json'
SOURCE_URL='https://data.tainan.gov.tw/Resource/84df8cd6-8741-41ed-919c-5105a28ecd6d'
UA='study-in-taiwan-garbage-v2/2.3 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS=2

def now(): return datetime.now(timezone.utc)
def iso(d=None): return (d or now()).replace(microsecond=0).isoformat()
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,obj): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def next_monday():
    local=now().astimezone(timezone(timedelta(hours=8))); delta=(7-local.weekday())%7 or 7
    return (local+timedelta(days=delta)).replace(hour=0,minute=0,second=0,microsecond=0).isoformat()
def record_failure(msg):
    t=iso(); nxt=next_monday(); m=load(MANIFEST)
    m.setdefault('refresh',{}).update({'last_checked':t,'last_attempt':t,'last_attempt_status':'source-response-unusable','next_retry_not_before':nxt,'last_error':msg})
    save(MANIFEST,m)
    h=load(HISTORY) if HISTORY.exists() else {'version':1,'city':'tainan','checks':[]}
    h['checks']=(h.get('checks',[])+[{'checked_at':t,'provider':'Tainan City Government Open Data','direct_download_url':SOURCE_URL,'status':'source-response-unusable','next_retry_not_before':nxt,'notes':msg}])[-120:]
    save(HISTORY,h)
def fetch_once():
    req=Request(SOURCE_URL,headers={'User-Agent':UA,'Accept':'application/json,text/plain,*/*'})
    with urlopen(req,timeout=60) as r: return r.read()
def normalize(obj):
    if isinstance(obj,dict):
        if 'WORKDAY' in obj and 'WORDDAY' not in obj: obj['WORDDAY']=obj['WORKDAY']
        for v in obj.values(): normalize(v)
    elif isinstance(obj,list):
        for v in obj: normalize(v)

def main():
    m=load(MANIFEST)
    retry=m.get('refresh',{}).get('next_retry_not_before')
    if retry:
        try:
            if now()<datetime.fromisoformat(retry).astimezone(timezone.utc):
                print('skip: Tainan source is in Monday cooldown'); return 0
        except ValueError: pass
    last=None
    for attempt in range(1,MAX_ATTEMPTS+1):
        try:
            raw=fetch_once()
            obj=json.loads(raw.decode('utf-8-sig'))
            normalize(obj)
            with tempfile.NamedTemporaryFile('w',encoding='utf-8',suffix='.json',delete=False) as f:
                json.dump(obj,f,ensure_ascii=False); tmp=f.name
            try: return subprocess.call([sys.executable,str(HERE/'import_tainan.py'),'--input',tmp,'--force'])
            finally: Path(tmp).unlink(missing_ok=True)
        except (HTTPError,URLError,TimeoutError,UnicodeDecodeError,json.JSONDecodeError) as e:
            last=e
            if attempt<MAX_ATTEMPTS: time.sleep(1)
    record_failure(f'Official Tainan direct-download source was unusable after {MAX_ATTEMPTS} attempts: {last}')
    return 2
if __name__=='__main__': raise SystemExit(main())
