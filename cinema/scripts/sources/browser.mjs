const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function loadChromium() {
  const modulePath = process.env.CINEMA_PLAYWRIGHT_MODULE || 'playwright';
  let playwright;
  try {
    playwright = await import(modulePath);
  } catch (error) {
    throw new Error(`Playwright is unavailable at ${modulePath}: ${String(error?.message || error)}`);
  }
  return playwright.chromium;
}

export async function browseOfficialPages(targets, { concurrency = 3, settleMs = 1200 } = {}) {
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = Array(targets.length);
  let cursor = 0;
  let blockedBy403 = false;

  try {
    const context = await browser.newContext({
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
      userAgent: BROWSER_UA,
      viewport: { width: 1365, height: 900 }
    });
    async function worker() {
      while (cursor < targets.length) {
        const index = cursor++;
        const target = targets[index];
        if (blockedBy403) {
          results[index] = { target, status: null, html: '', error: 'Skipped after official site returned HTTP 403' };
          continue;
        }
        let page;
        try {
          page = await context.newPage();
          page.setDefaultNavigationTimeout(25_000);
          const response = await page.goto(target.url, { waitUntil: 'domcontentloaded' });
          const initialStatus = response?.status() ?? null;
          if (initialStatus === 403) {
            // Allow a browser-side challenge or redirect to finish once before stopping the crawl.
            await page.waitForTimeout(2500);
          } else {
            await page.waitForTimeout(settleMs);
          }
          const html = await page.content();
          const finalResponse = await page.evaluate(() => ({
            title: document.title,
            url: location.href,
            bodyLength: document.body?.innerText?.length || 0
          }));
          const status = initialStatus;
          results[index] = {
            target,
            status,
            html,
            finalUrl: finalResponse.url,
            title: finalResponse.title,
            bodyLength: finalResponse.bodyLength
          };
          if (status === 403) blockedBy403 = true;
        } catch (error) {
          results[index] = { target, status: null, html: '', error: String(error?.message || error).slice(0, 240) };
        } finally {
          await page?.close().catch(() => {});
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  } finally {
    await browser.close();
  }
  results.blocked_by_403 = blockedBy403;
  results.pages_requested = results.filter(result => result?.status !== null).length;
  return results;
}
