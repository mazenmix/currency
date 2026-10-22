// MX Currency world FX rates. IQD remains exclusive to /api/iqd (IQWealth).
// PHP uses a separately fetched, timestamped USD/PHP market quote where available.
// Currency Pro's proprietary upstream provider is not publicly confirmed:
// do not label this as the same provider or hardcode its screenshot quote.
const BOOK='https://raw.githubusercontent.com/mazenmix/MX-Currency-/main/data/rates.json';
const FALLBACK='https://open.er-api.com/v6/latest/USD';
const PHP_FEEDS=[
  'https://query1.finance.yahoo.com/v8/finance/chart/PHP%3DX?range=1d&interval=1m',
  'https://query2.finance.yahoo.com/v8/finance/chart/PHP%3DX?range=1d&interval=1m'
];
async function json(url,timeout=5500) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try {
    const r=await fetch(url,{
      headers:{Accept:'application/json'},
      signal:controller.signal,
      cf:{cacheTtl:60,cacheEverything:true}
    });
    if(!r.ok)throw Error('HTTP '+r.status);
    return await r.json();
  } finally {clearTimeout(timer)}
}
async function phpMarketQuote(){
  for(const url of PHP_FEEDS){
    try {
      const raw=await json(url,3000);
      const chart=raw?.chart?.result?.[0];
      const value=Number(chart?.meta?.regularMarketPrice);
      const stamp=Number(chart?.meta?.regularMarketTime);
      const age=Date.now()-stamp*1000;
      // Reject missing, reversed, expired and otherwise implausible quotes.
      if(chart?.meta?.symbol!=='PHP=X'||!(value>35&&value<100)||
         !(stamp>0)||age< -300000||age>96*3600000)continue;
      return {rate:value,publishedAt:new Date(stamp*1000).toISOString(),
        source:'Yahoo Finance USD/PHP market quote'};
    }catch(_){}
  }
  return null;
}
export async function onRequestGet(){
  try {
    let raw,source;
    try {
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
    if(!(Number(rates.PHP)>0))throw Error('Essential currency PHP is missing');
    const globalTime=raw.updatedAt||(raw.time_last_update_unix?
      new Date(raw.time_last_update_unix*1000).toISOString():null);
    const market=await phpMarketQuote();
    if(market){
      rates.PHP=market.rate;
      meta.PHP={buy:market.rate,sell:market.rate,kind:'market',
        source:market.source,publishedAt:market.publishedAt,stale:false};
    }else{
      // Explicit fallback, with its true source and publication time.
      meta.PHP={buy:Number(rates.PHP),sell:Number(rates.PHP),kind:'reference',
        source, publishedAt:globalTime,stale:true};
    }
    return Response.json({
      base:'USD',rates,meta,source,updatedAt:globalTime,
      phpSource:meta.PHP.source,phpUpdatedAt:meta.PHP.publishedAt,
      phpLive:!meta.PHP.stale,
      iqdSource:'IQWealth only (separate /api/iqd)'
    },{headers:{'Cache-Control':'public, max-age=60'}});
  }catch(e){
    return Response.json({error:'Global reference rates unavailable',
      details:String(e.message||e)},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
