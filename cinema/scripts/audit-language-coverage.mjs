import fs from 'node:fs';
import path from 'node:path';
import { screeningIdentityKey } from './movie-schema.mjs';
const root='cinema/data/showtimes/by-date';
const groups=new Map();
const seen=new Map();
for(const date of fs.readdirSync(root)){
  const file=path.join(root,date,'taipei.json');
  if(!fs.existsSync(file))continue;
  const rows=JSON.parse(fs.readFileSync(file,'utf8')).showtimes||[];
  for(const row of rows){
    const key=row.cinema_id||'unknown';
    const group=groups.get(key)||{cinema_id:key,total:0,audio_verified:0,subtitles_verified:0,both_verified:0,by_source:{}};
    const audio=Boolean(row.audio_language);
    const subtitles=Array.isArray(row.subtitles)&&row.subtitles.length>0;
    group.total++;if(audio)group.audio_verified++;if(subtitles)group.subtitles_verified++;if(audio&&subtitles)group.both_verified++;
    const src=group.by_source[row.source]||{total:0,audio_verified:0,subtitles_verified:0};
    src.total++;if(audio)src.audio_verified++;if(subtitles)src.subtitles_verified++;
    group.by_source[row.source]=src;groups.set(key,group);
    const id=screeningIdentityKey(row);
    const prev=seen.get(id);
    if(prev){
      if(prev.audio_language && row.audio_language && prev.audio_language!==row.audio_language)
        console.warn('LANGUAGE_CONFLICT_AUDIO',id);
      if(prev.subtitles?.length && row.subtitles?.length && JSON.stringify(prev.subtitles)!==JSON.stringify(row.subtitles))
        console.warn('LANGUAGE_CONFLICT_SUBTITLES',id);
    }
    seen.set(id,row);
  }
}
const percent=(n,d)=>d?Number((n*100/d).toFixed(2)):0;
const report={schema:'cinema-language-coverage-v1',policy:'Verified source facts only. Missing does not mean no audio/subtitles. Never infer subtitles from audio.',cinemas:[...groups.values()].map(g=>({...g,audio_pct:percent(g.audio_verified,g.total),subtitles_pct:percent(g.subtitles_verified,g.total),both_pct:percent(g.both_verified,g.total)})).sort((a,b)=>a.cinema_id.localeCompare(b.cinema_id))};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--write')){
  fs.mkdirSync('cinema/data/reports',{recursive:true});
  fs.writeFileSync('cinema/data/reports/language-coverage.json',JSON.stringify(report,null,2)+'\n');
}
