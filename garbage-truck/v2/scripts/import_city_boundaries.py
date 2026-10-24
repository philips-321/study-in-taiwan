#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, shutil, tempfile, time, zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE=Path(__file__).resolve().parent
V2=HERE.parent
DATA=V2/'data'
OUT=DATA/'city-boundaries.geojson'
META=DATA/'city-boundaries-source.json'
SOURCE_PAGE='https://data.gov.tw/dataset/7442'
SOURCE_URL='https://www.tgos.tw/tgos/VirtualDir/Product/1cd4f4c9-6b01-4cf9-bf6c-23a73aa17d24/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3%28%E5%B8%82%29%E7%95%8C%E7%B7%9A1140318.zip'
UA='study-in-taiwan-garbage-v2/2.2 (+https://study-in-taiwan.com/garbage-truck/)'
MAX_ATTEMPTS=2

def now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    os.replace(tmp,path)

def download():
    last=None
    for attempt in range(MAX_ATTEMPTS):
        try:
            req=Request(SOURCE_URL,headers={'User-Agent':UA,'Accept':'application/zip,*/*'})
            with urlopen(req,timeout=90) as r:
                raw=r.read()
                if len(raw)<1000: raise RuntimeError(f'boundary zip too small: {len(raw)} bytes')
                return raw, {'etag':r.headers.get('ETag'),'last_modified':r.headers.get('Last-Modified'),'http_status':getattr(r,'status',200)}
        except (HTTPError,URLError,TimeoutError,RuntimeError) as e:
            last=e
            if attempt+1<MAX_ATTEMPTS: time.sleep(1)
    raise RuntimeError(f'official boundary download failed twice: {last}')

def main():
    import shapefile
    from shapely.geometry import shape, mapping
    raw,headers=download()
    sha=hashlib.sha256(raw).hexdigest(); checked=now_iso()
    with tempfile.TemporaryDirectory() as td:
        td=Path(td); z=td/'county.zip'; z.write_bytes(raw)
        with zipfile.ZipFile(z) as f: f.extractall(td/'unzipped')
        shp=next((p for p in (td/'unzipped').rglob('*.shp')),None)
        if not shp: raise SystemExit('no .shp found in official boundary archive')
        cpg=shp.with_suffix('.cpg'); enc='utf-8'
        if cpg.exists():
            rawenc=cpg.read_text(errors='ignore').strip().lower()
            if rawenc in ('950','big5','cp950'): enc='cp950'
            elif rawenc: enc=rawenc
        reader=shapefile.Reader(str(shp),encoding=enc)
        fields=[f[0] for f in reader.fields[1:]]
        features=[]
        for sr in reader.iterShapeRecords():
            props=dict(zip(fields,sr.record))
            zh=str(props.get('COUNTYNAME') or '').strip()
            if not zh: continue
            geom=shape(sr.shape.__geo_interface__)
            geom=geom.simplify(0.0008,preserve_topology=True)
            features.append({'type':'Feature','properties':{'name_zh':zh,'county_id':props.get('COUNTYID'),'county_code':props.get('COUNTYCODE'),'name_en':props.get('COUNTYENG')},'geometry':mapping(geom)})
    if len(features)<22: raise SystemExit(f'refusing to publish boundary file: only {len(features)} features')
    atomic_json(OUT,{'type':'FeatureCollection','source':SOURCE_PAGE,'source_download':SOURCE_URL,'generated_at':checked,'features':features})
    atomic_json(META,{'version':1,'provider':'內政部國土測繪中心 / National Land Surveying Center','dataset':'直轄市、縣市界線(TWD97經緯度)','landing_url':SOURCE_PAGE,'direct_download_url':SOURCE_URL,'source_file_hint':'直轄市、縣(市)界線1140318.zip','checked_at':checked,'content_sha256':sha,'etag':headers.get('etag'),'last_modified':headers.get('last_modified'),'feature_count':len(features),'simplify_tolerance_degrees':0.0008})
    print(f'ok: {len(features)} official city/county boundary features')
if __name__=='__main__': main()
