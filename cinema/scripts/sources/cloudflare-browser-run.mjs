const API = 'https://api.cloudflare.com/client/v4/accounts';
const ALLOWED_HOSTS = new Set(['www.showtimes.com.tw', 'meet.eslite.com']);

export function cloudflareBrowserAvailable() {
  return process.env.CINEMA_USE_LOCAL_BROWSER !== 'true'
    && Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

async function loadLocalChromium() {
  const modulePath = process.env.CINEMA_PLAYWRIGHT_MODULE || 'playwright';
  let playwright;
  try {
    playwright = await import(modulePath);
  } catch (error) {
    throw new Error(`Playwright is unavailable at ${modulePath}: ${String(error?.message || error)}`);
  }
  return playwright.chromium;
}

async function fetchShowTimesBootstrapPayloadLocally() {
  const chromium = await loadLocalChromium();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1365, height: 900 }
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(45_000);
    const response = await page.goto('https://www.showtimes.com.tw/cinemas/91/', { waitUntil: 'domcontentloaded' });
    if ((response?.status() || 0) >= 400) throw new Error(`ShowTimes page HTTP ${response.status()}`);
    await page.waitForTimeout(3_000);
    const payload = await page.evaluate(async () => {
      const response = await fetch('https://capi.showtimes.com.tw/4/app/bootstrap', {
        headers: {
          accept: 'application/json',
          origin: 'https://www.showtimes.com.tw',
          referer: 'https://www.showtimes.com.tw/'
        }
      });
      if (!response.ok) throw new Error(`ShowTimes bootstrap HTTP ${response.status}`);
      return response.json();
    });
    if (!payload?.payload?.corporations || !payload.payload.programs || !payload.payload.eventsForCorporations) {
      throw new Error('Local browser returned an invalid ShowTimes bootstrap payload');
    }
    return payload.payload;
  } finally {
    await browser.close();
  }
}

export async function fetchRenderedCinemaPage(rawUrl, { addScriptTag = [], waitForTimeout = 300 } = {}) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error('Cloudflare Browser Rendering credentials are not configured');

  const target = new URL(rawUrl);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    throw new Error(`Cloudflare Browser Rendering URL is not on the cinema allowlist: ${target.hostname}`);
  }

  const response = await fetch(`${API}/${encodeURIComponent(accountId)}/browser-run/content?cacheTTL=0`, {
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
      waitForTimeout,
      ...(addScriptTag.length ? { addScriptTag } : {})
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

export async function fetchShowTimesBootstrapPayload() {
  if (process.env.CINEMA_USE_LOCAL_BROWSER === 'true') {
    return fetchShowTimesBootstrapPayloadLocally();
  }
  const script = 'setTimeout(async()=>{try{const response=await fetch("https://capi.showtimes.com.tw/4/app/bootstrap",{headers:{accept:"application/json",origin:"https://www.showtimes.com.tw",referer:"https://www.showtimes.com.tw/"}});const payload=await response.json();document.body.textContent=JSON.stringify(payload)}catch(error){document.body.textContent=JSON.stringify({__browser_error:String(error)})}},3000)';
  const rendered = await fetchRenderedCinemaPage('https://www.showtimes.com.tw/cinemas/91/', {
    addScriptTag: [{ content: script }],
    waitForTimeout: 7500
  });
  const body = rendered.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  const decoded = body.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  let payload;
  try {
    payload = JSON.parse(decoded);
  } catch (error) {
    throw new Error('Cloudflare Browser Run did not return ShowTimes bootstrap JSON: ' + String(error?.message || error));
  }
  if (payload.__browser_error) throw new Error('ShowTimes bootstrap fetch inside Cloudflare Browser Run failed: ' + payload.__browser_error);
  if (!payload.payload?.corporations || !payload.payload?.programs || !payload.payload?.eventsForCorporations) {
    throw new Error('ShowTimes bootstrap payload format changed');
  }
  return payload.payload;
}
