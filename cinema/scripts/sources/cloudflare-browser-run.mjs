const API = 'https://api.cloudflare.com/client/v4/accounts';
const ALLOWED_HOSTS = new Set(['www.showtimes.com.tw', 'meet.eslite.com']);

export function cloudflareBrowserAvailable() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

export async function fetchRenderedCinemaPage(rawUrl) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error('Cloudflare Browser Rendering credentials are not configured');

  const target = new URL(rawUrl);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    throw new Error(`Cloudflare Browser Rendering URL is not on the cinema allowlist: ${target.hostname}`);
  }

  const response = await fetch(`${API}/${encodeURIComponent(accountId)}/browser-rendering/content?cacheTTL=0`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      url: target.href,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
      gotoOptions: { waitUntil: 'networkidle2', timeout: 45_000 },
      actionTimeout: 45_000,
      waitForTimeout: 300
    }),
    signal: AbortSignal.timeout(60_000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success !== true || typeof payload.result !== 'string') {
    const detail = (payload.errors || []).map(error => error.message).filter(Boolean).join('; ')
      || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare Browser Rendering failed for ${target.hostname}: ${detail}`);
  }

  return {
    html: payload.result,
    status: Number(payload.meta?.status) || 200,
    finalUrl: payload.meta?.url || target.href,
    provider: 'cloudflare-browser-rendering'
  };
}
