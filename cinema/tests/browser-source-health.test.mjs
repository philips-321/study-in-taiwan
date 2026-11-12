import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBrowserSourceHealth } from '../scripts/report-browser-source-health.mjs';

const healthyBootstrap = {
  ok: true,
  showtimes: 6619,
  fallback_showtimes: 0
};

test('a blocked optional fallback is warning-only when the Cloudflare path is healthy', () => {
  const summary = summarizeBrowserSourceHealth({
    'showtimes-official-cloudflare-bootstrap': healthyBootstrap,
    'showtimes-official-browser': {
      ok: false,
      showtimes: 0,
      error: 'HTTP 403 from first-party ShowTimes page; stopped remaining browser navigations',
      fallback: 'last-known-good',
      fallback_showtimes: 28
    },
    'eslite-official-browser': { ok: true, showtimes: 130 }
  });

  assert.equal(summary.blocked.length, 1);
  assert.equal(summary.blocked[0].source, 'showtimes-official-browser');
  assert.equal(summary.blocked[0].retained, true);
  assert.equal(summary.healthy.length, 2);
});

test('Cloudflare Browser Run failure is recorded without turning source health into a workflow exception', () => {
  const summary = summarizeBrowserSourceHealth({
    'showtimes-official-cloudflare-bootstrap': {
      ok: false,
      showtimes: 0,
      error: 'Cloudflare Browser Rendering failed for www.showtimes.com.tw: HTTP 403'
    },
    'showtimes-official-browser': {
      ok: false,
      showtimes: 0,
      error: 'HTTP 403 from first-party ShowTimes page',
      fallback: 'last-known-good',
      fallback_showtimes: 6619
    },
    'eslite-official-browser': { ok: true, showtimes: 130 }
  });

  assert.equal(summary.blocked.length, 2);
  assert.equal(summary.blocked[0].source, 'showtimes-official-cloudflare-bootstrap');
  assert.equal(summary.blocked[1].retained, true);
});

test('missing source status is reported so schema validation can handle it', () => {
  const summary = summarizeBrowserSourceHealth({
    'showtimes-official-cloudflare-bootstrap': healthyBootstrap
  });

  assert.deepEqual(summary.missing.map(status => status.source), [
    'showtimes-official-browser',
    'eslite-official-browser'
  ]);
});
