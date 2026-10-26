// MX Currency world FX rates. IQD is exclusively sourced from /api/iqd (IQWealth).
// USD/PHP follows the BDO bank's USD SELL quote from MX Fuel's forex feed.
// The BDO USD BUY quote must never be used as the calculator conversion rate.
const BOOK='https://raw.githubusercontent.com/mazenmix/MX-Currency-/main/data/rates.json';
const FALLBACK='https://open.er-api.com/v6/latest/USD';
const MX_FUEL_FOREX='https://mxfuel.pages.dev/api/forex';

async function get(url,accept,timeout=6000,cacheSeconds=120){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{
      headers:{Accept:accept,'Accept-Language':'en-US,en;q=0.9'},
      signal:controller.signal,
      cf:{cacheTtl:cacheSeconds,cacheEverything:true}
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    return response;
  }finally{clearTimeout(timer)}
}
async function json(url){return (await get(url,'application/json')).json()}

// MX Fuel already normalizes the BDO bank's USD [buy, sell] board.
async function bdoUsdSellQuote(){
  try{
    const response=await get(MX_FUEL_FOREX,'application/json',5500,15);
    if(!String(response.headers.get('content-type')||'').toLowerCase().includes('json'))return null;
    const data=await response.json();
    if(data?.ok!==true||!Array.isArray(data.providers))return null;
    const provider=data.providers.find(p=>String(p?.name||'').trim().toUpperCase()==='BDO');
    const usd=provider?.rates?.USD;
    if(!Array.isArray(usd)||usd.length<2)return null;
    const buy=Number(usd[0]),sell=Number(usd[1]);
    if(!Number.isFinite(buy)||!Number.isFinite(sell)||buy<35||sell>100||sell<buy)return null;
    const status=String(provider.status||'').toLowerCase();
    if(!['live','last_verified'].includes(status))return null;
    return {
      rate:sell,bankBuy:buy,
      source:'MX Fuel · BDO USD SELL',
      sourceUrl:provider.source_url||MX_FUEL_FOREX,
      publishedAt:provider.updated||null,
      checkedAt:data.checked_at||null,
      fetchedAt:provider.fetched_at||null,
      stale:status!=='live'
    };
  }catch(_){return null}
}
export async function onRequestGet(){
  try{
    // Fetch BDO and the global catalogue in parallel to avoid slowing other currencies.
    const bdoPromise=bdoUsdSellQuote();
    let raw,source;
    try{
      raw=await json(BOOK);
      if(raw?.base!=='USD'||!raw?.rates)throw Error('Invalid global rate book');
      source='MX Currency global FX catalogue';
    }catch(_){
      raw=await json(FALLBACK);
      if(raw?.result!=='success'||!raw?.rates)throw Error('Global FX temporarily unavailable');
      source='Global FX reference fallback';
    }
    const rates={USD:1},meta={};
    for(const [code,value] of Object.entries(raw.rates)){
      const n=Number(value);
      if(/^[A-Z]{3}$/.test(code)&&code!=='IQD'&&Number.isFinite(n)&&n>0)rates[code]=n;
    }
    for(const [code,entry] of Object.entries(raw.meta||{})){
      if(code!=='IQD'&&/^[A-Z]{3}$/.test(code)&&entry&&typeof entry==='object')meta[code]=entry;
    }
    // PHP is exclusively a verified BDO SELL quote. The global book is NOT a substitute.
    const globalTime=raw.updatedAt||(raw.time_last_update_unix?
      new Date(raw.time_last_update_unix*1000).toISOString():null);
    const bdo=await bdoPromise;
    if(bdo){
      rates.PHP=bdo.rate;
      // Both conversion sides use BDO SELL so other UI paths cannot select BUY.
      meta.PHP={buy:bdo.rate,sell:bdo.rate,bankBuy:bdo.bankBuy,
        kind:'bank-sell',bank:'BDO',quoteSide:'SELL',
        source:bdo.source,sourceUrl:bdo.sourceUrl,
        publishedAt:bdo.publishedAt,checkedAt:bdo.checkedAt,
        fetchedAt:bdo.fetchedAt,stale:bdo.stale};
    }else{
      // Never show the global mid-market rate as if it were BDO Sell.
      // The client retains its last verified BDO value (clearly cached) if available.
      delete rates.PHP;
      delete meta.PHP;
    }
    return Response.json({
      base:'USD',rates,meta,source,updatedAt:globalTime,
      phpSource:meta.PHP?.source||'BDO SELL temporarily unavailable',
      phpUpdatedAt:meta.PHP?.publishedAt||meta.PHP?.checkedAt||meta.PHP?.fetchedAt||null,
      phpLive:!!bdo&&!bdo.stale,
      iqdSource:'IQWealth only (separate /api/iqd)'
    },{headers:{'Cache-Control':'no-store, max-age=0', 'CDN-Cache-Control':'no-store'}});
  }catch(e){
    return Response.json({error:'Global reference rates unavailable',
      details:String(e.message||e)},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
