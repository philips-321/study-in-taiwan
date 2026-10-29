import fs from 'node:fs';
import path from 'node:path';

const get = name => { const hit = process.argv.find(x => x.startsWith(`--${name}=`)); return hit ? path.resolve(hit.slice(name.length + 3)) : null; };
const source = get('source');
const target = get('target');
const confirm = process.argv.includes('--confirm');
if (!source || !target) throw new Error('Usage: --source=<materialized-view> --target=<public-by-date> [--confirm]');
const manifestPath = path.join(source, 'manifest.json');
if (!fs.existsSync(manifestPath)) throw new Error(`Missing ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.days !== 30 || manifest.public_rows < 0 || !manifest.sha256) throw new Error('Public view manifest failed safety contract');
const jsonFiles = [];
for (const date of fs.readdirSync(source).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x))) {
  for (const file of fs.readdirSync(path.join(source, date)).filter(x => x.endsWith('.json'))) {
    const chunk = JSON.parse(fs.readFileSync(path.join(source, date, file), 'utf8'));
    if (chunk.date !== date || chunk.city !== file.slice(0, -5) || !Array.isArray(chunk.showtimes) || !chunk.showtimes.length) throw new Error(`Compatibility failure: ${date}/${file}`);
    jsonFiles.push([date, file]);
  }
}
const summary = { source, target, public_rows: manifest.public_rows, files: jsonFiles.length, as_of: manifest.as_of, end_date: manifest.end_date, sha256: manifest.sha256, confirmed: confirm };
if (!confirm) { console.log(JSON.stringify({ ...summary, action: 'dry-run-only' }, null, 2)); process.exit(0); }
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const [date, file] of jsonFiles) { fs.mkdirSync(path.join(target, date), { recursive: true }); fs.copyFileSync(path.join(source, date, file), path.join(target, date, file)); }
fs.writeFileSync(path.join(target, 'PUBLIC-VIEW-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, action: 'promoted' }, null, 2));
