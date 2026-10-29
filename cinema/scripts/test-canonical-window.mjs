import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cinema-window-test-'));
const canonical = path.join(root, 'canonical'); fs.mkdirSync(canonical, { recursive: true });
const rows = [
  { screening_id: 'a', cinema_id: 'c1', movie_id: 'm1', city: 'taipei', business_date: '2026-10-30', start_time: '2026-10-30T10:00:00+08:00', source_id: 'official', status: 'canonical' },
  { screening_id: 'b', cinema_id: 'c1', movie_id: 'm1', city: 'taipei', business_date: '2026-11-29', start_time: '2026-11-29T10:00:00+08:00', source_id: 'official', status: 'canonical' },
  { screening_id: 'c', cinema_id: 'c1', movie_id: 'm1', city: 'taipei', business_date: '2026-11-30', start_time: '2026-11-30T10:00:00+08:00', source_id: 'official', status: 'canonical' },
  { screening_id: 'd', cinema_id: 'c1', movie_id: 'm1', city: 'taipei', business_date: '2026-10-29', start_time: '2026-10-29T10:00:00+08:00', source_id: 'official', status: 'canonical' }
];
fs.writeFileSync(path.join(canonical, '2026-10.jsonl'), rows.filter(x => x.business_date < '2026-11-01').map(JSON.stringify).join('\n') + '\n');
fs.writeFileSync(path.join(canonical, '2026-11.jsonl'), rows.filter(x => x.business_date >= '2026-11-01').map(JSON.stringify).join('\n') + '\n');
const out = path.join(root, 'public');
execFileSync(process.execPath, ['cinema/scripts/materialize-public-window.mjs', `--canonical-root=${canonical}`, `--output-root=${out}`, '--as-of=2026-10-30', '--days=30'], { stdio: 'ignore' });
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
assert.equal(manifest.public_rows, 2);
assert.equal(manifest.excluded_by_window, 2);
assert.equal(manifest.files, 2);
console.log(JSON.stringify({ passed: true, public_rows: manifest.public_rows, excluded_by_window: manifest.excluded_by_window }));
