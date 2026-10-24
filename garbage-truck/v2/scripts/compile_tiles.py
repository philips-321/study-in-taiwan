#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,math,os
from pathlib import Path
from datetime import datetime,timezone
HERE=Path(__file__).resolve().parent; DATA=HERE.parent/'data'; STEP=.02
def load(path): return json.loads(path.read_text(encoding='utf-8'))
def atomic_json(path,obj): path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+'.tmp'); tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8'); os.replace(tmp,path)
def minutes(t): h,m=map(int,t.split(':')); return h*60+m
def mask(days):
    n=0
    for d in days: n|=1<<int(d)
    return n
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--city',required=True); ap.add_argument('--allow-empty',action='store_true'); args=ap.parse_args(); city_dir=DATA/'cities'/args.city; routes_dir=city_dir/'routes'; idx_path=routes_dir/'index.json'
    if not idx_path.exists(): raise SystemExit('no routes/index.json; collect schedules first')
    idx=load(idx_path); buckets={}; mapped=0
    for entry in idx.get('routes',[]):
        obj=load(routes_dir/entry['file'])
        for s in obj.get('stops',[]):
            lat,lng=s.get('lat'),s.get('lng')
            if not isinstance(lat,(int,float)) or not isinstance(lng,(int,float)): continue
            mapped+=1; ix=math.floor(lng/STEP); iy=math.floor(lat/STEP); key=(ix,iy); am=minutes(s['time'])
            buckets.setdefault(key,[]).append({'x':round(lng,6),'y':round(lat,6),'p':s['name'],'c':s.get('district') or '','l':s.get('route_name') or '','am':am,'dm':am,'g':mask(s['services']['general']['days']),'r':mask(s['services']['recycling']['days']),'f':mask(s['services']['food']['days']),'rid':s['route_id'],'o':s['stop_order']})
    tiles_dir=city_dir/'tiles'; manifest_path=tiles_dir/'manifest.json'
    if mapped==0 and not args.allow_empty: print('no mapped stops; preserving any existing last-known-good tiles'); return
    tiles_dir.mkdir(parents=True,exist_ok=True); keep={'manifest.json'}; tiles=[]
    for (ix,iy),rows in sorted(buckets.items()):
        west,south=ix*STEP,iy*STEP; east,north=west+STEP,south+STEP; tile_id=f'{ix}_{iy}'; filename=f'{tile_id}.json'; keep.add(filename); atomic_json(tiles_dir/filename,rows); tiles.append({'id':tile_id,'file':filename,'bounds':[round(west,6),round(south,6),round(east,6),round(north,6)],'count':len(rows)})
    for old in tiles_dir.glob('*.json'):
        if old.name not in keep: old.unlink()
    generated=datetime.now(timezone.utc).replace(microsecond=0).isoformat(); atomic_json(manifest_path,{'version':2,'city':args.city,'generated_at':generated,'step':STEP,'mapped_stop_count':mapped,'tiles':tiles})
    mf=city_dir/'manifest.json'; manifest=load(mf); manifest['status']='ready' if mapped else 'schedule-only'; manifest['mapped_stop_count']=mapped; manifest['tiles_generated_at']=generated; atomic_json(mf,manifest); print(f'ok: {mapped} mapped stops in {len(tiles)} tiles')
if __name__=='__main__': main()
