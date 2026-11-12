import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BROWSER_SOURCE_NAMES = [
  'showtimes-official-cloudflare-bootstrap',
  'showtimes-official-browser',
  'eslite-official-browser'
];

const ACCESS_FAILURE = /\b403\b|Cloudflare Browser Rendering|Browser Run/i;

export function summarizeBrowserSourceHealth(sources = {}) {
  const statuses = BROWSER_SOURCE_NAMES.map(source => {
    const status = sources[source] || null;
    const error = String(status?.error || '');
    const accessBlocked = status?.ok === false && ACCESS_FAILURE.test(error);
    const fallbackRows = Number(status?.fallback_showtimes || 0);
    const retained = fallbackRows > 0 || status?.fallback === 'last-known-good' || status?.fallback === 'manual-browser-snapshot';
    return {
      source,
      ok: status?.ok === true,
      present: Boolean(status),
      access_blocked: accessBlocked,
      retained,
      showtimes: Number(status?.showtimes || 0),
      fallback_showtimes: fallbackRows,
      error: error || null
    };
  });

  return {
    statuses,
    blocked: statuses.filter(status => status.access_blocked),
    missing: statuses.filter(status => !status.present),
    healthy: statuses.filter(status => status.ok)
  };
}

function main() {
  const manifestFile = path.resolve(process.argv[2] || 'cinema/data/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const summary = summarizeBrowserSourceHealth(manifest.sources?.showtimes || {});

  for (const status of summary.blocked) {
    const retained = status.retained ? `; retained fallback rows=${status.fallback_showtimes}` : '; no fallback rows reported';
    console.warn(`::warning::${status.source} is temporarily unavailable through the browser path: ${status.error}${retained}. Continuing so source health and cooldown history can be committed.`);
  }
  for (const status of summary.missing) {
    console.warn(`::warning::${status.source} did not report a status. Continuing to let generated-data validation decide whether the refresh is usable.`);
  }
  if (!summary.blocked.length && !summary.missing.length) {
    console.log('Official browser source health: all tracked paths reported without access-block errors.');
  }
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
