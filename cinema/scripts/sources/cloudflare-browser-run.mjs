const API = 'https://api.cloudflare.com/client/v4/accounts';
const ALLOWED_HOSTS = new Set(['www.showtimes.com.tw', 'meet.eslite.com']);

export async function fetchRenderedCinemaHtml(url) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error('Missing GitHub Actions secrets CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    throw new Error(`Browser Run URL is not on the cinema source allowlist: ${target.hostname}`);
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
      gotoOptions: { waitUntil: 'networkidle2', timeout: 45000 },
      actionTimeout: 45000,
      waitForTimeout: 300
    }),
    signal: AbortSignal.timeout(60000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success !== true || typeof payload.result !== 'string') {
    const detail = (payload.errors || []).map(error => error.message).filter(Boolean).join('; ')
      || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare Browser Run could not render ${target.hostname}: ${detail}`);
  }
  if (payload.meta?.status && payload.meta.status >= 400) {
    throw new Error(`${target.hostname} returned origin HTTP ${payload.meta.status} in Browser Run`);
  }
  return payload.result;
}
