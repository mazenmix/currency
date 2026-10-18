// Sole USD/IQD market source: IQWealth (iraqsm.com), Kifah SELL.
// No Telegram, MXDollar, exchange-rate API or fabricated fallback.
const URL = 'https://iraqsm.com/data/fx.json';
export async function onRequestGet() {
  try {
    const response = await fetch(URL, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 60, cacheEverything: true }
    });
    if (!response.ok) throw Error('IQWealth HTTP ' + response.status);
    const payload = await response.json();
    const parallel = payload?.data?.parallel ?? payload?.parallel
      ?? payload?.data?.fx?.parallel ?? payload?.fx?.parallel;
    const numeric = value => Number(String(value ?? '').replace(/,/g, ''));
    const sell = numeric(parallel?.sell);
    const buy = numeric(parallel?.buy);
    if (!Number.isFinite(sell) || sell < 800 || sell > 3500) {
      throw Error('Missing or invalid Kifah SELL quote from IQWealth');
    }
    const publishedAt = parallel?.publishedAt ?? payload?.data?.publishedAt
      ?? payload?.publishedAt ?? payload?.asOf ?? null;
    const old = publishedAt && !Number.isNaN(Date.parse(publishedAt))
      && Date.now() - Date.parse(publishedAt) > 36 * 3600 * 1000;
    const stale = parallel?.stale === true || !!old;
    return Response.json({
      rate: sell,
      perHundred: Math.round(sell * 100),
      sell,
      buy: Number.isFinite(buy) && buy >= 800 && buy <= 3500 ? buy : null,
      market: 'Kifah',
      source: 'IQWealth · iraqsm.com',
      updatedAt: publishedAt,
      stale,
      asOf: payload?.asOf ?? null,
      attribution: 'Data: IQWealth — https://iraqsm.com'
    }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    return Response.json({
      error: 'IQWealth price unavailable; no alternative source is used',
      details: String(error.message || error)
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
