const MOC_MOVIE_API_PREFIX = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do';
const originalFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async function resilientFetch(input, init) {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : String(input?.url || input);

  if (url.startsWith(MOC_MOVIE_API_PREFIX) && url.includes('category=8')) {
    console.warn('Cinema resilience: MOC movie API circuit is open for this run; returning an empty fresh payload so independent sources can continue.');
    return new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  return originalFetch(input, init);
};
