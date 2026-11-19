import fs from 'node:fs';
import path from 'node:path';
import { screeningIdentityKey } from './movie-schema.mjs';
const publicWindow = process.argv.includes('--public');
const root = publicWindow ? 'cinema/data/showtimes-public/by-date' : 'cinema/data/showtimes/by-date';
const groups=new Map();
const seen=new Map();
for (const date of fs.readdirSync(root).filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))) {
  const dateDir = path.join(root, date);
  for (const name of fs.readdirSync(dateDir).filter(name => name.endsWith('.json'))) {
    const rows = JSON.parse(fs.readFileSync(path.join(dateDir, name), 'utf8')).showtimes || [];
    for (const row of rows) {
      const key = row.cinema_id || 'unknown';
      const group = groups.get(key) || {cinema_id:key,total:0,audio_verified:0,subtitles_verified:0,both_verified:0,by_source:{}};
      const audio = Boolean(row.audio_language);
      const subtitles = Array.isArray(row.subtitles) && row.subtitles.length > 0;
      group.total++;
      if (audio) group.audio_verified++;
      if (subtitles) group.subtitles_verified++;
      if (audio && subtitles) group.both_verified++;
      const source = group.by_source[row.source] || {total:0,audio_verified:0,subtitles_verified:0};
      source.total++;
      if (audio) source.audio_verified++;
      if (subtitles) source.subtitles_verified++;
      group.by_source[row.source] = source;
      groups.set(key, group);

      const id = screeningIdentityKey(row);
      const previous = seen.get(id) || {};
      if (previous.audio && audio && previous.audio !== row.audio_language) console.warn('LANGUAGE_CONFLICT_AUDIO', id);
      if (previous.subtitles && subtitles && previous.subtitles !== JSON.stringify([...row.subtitles].sort())) console.warn('LANGUAGE_CONFLICT_SUBTITLES', id);
      if (!previous.audio && audio) previous.audio = row.audio_language;
      if (!previous.subtitles && subtitles) previous.subtitles = JSON.stringify([...row.subtitles].sort());
      seen.set(id, previous);
    }
  }
}
const percent=(n,d)=>d?Number((n*100/d).toFixed(2)):0;
const report={schema:'cinema-language-coverage-v1',dataset:publicWindow?'public-window':'collector-snapshot',policy:'Verified source facts only. Missing does not mean no audio/subtitles. Never infer subtitles from audio.',cinemas:[...groups.values()].map(g=>({...g,audio_pct:percent(g.audio_verified,g.total),subtitles_pct:percent(g.subtitles_verified,g.total),both_pct:percent(g.both_verified,g.total)})).sort((a,b)=>a.cinema_id.localeCompare(b.cinema_id))};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--write')){
  fs.mkdirSync('cinema/data/reports',{recursive:true});
  fs.writeFileSync('cinema/data/reports/language-coverage.json',JSON.stringify(report,null,2)+'\n');
}
