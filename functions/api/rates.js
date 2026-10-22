// MX Currency world FX rates. IQD is exclusively sourced from /api/iqd (IQWealth).
// Only the USD/PHP quote is attempted from the Investing.com USD/PHP page.
// Investing.com provides no public quotes API. Do not bypass any access restrictions;
// if the public HTML is not accessible, keep the existing reference rate and flag it.
const BOOK='https://raw.githubusercontent.com/mazenmix/MX-Currency-/main/data/rates.json';
const FALLBACK='https://open.er-api.com/v6/latest/USD';
const INVESTING_PHP_PAGE='https://www.investing.com/currencies/usd-php';

async function get(url,accept,timeout=6000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{
      headers:{Accept:accept,'Accept-Language':'en-US,en;q=0.9'},
      signal:controller.signal,
      cf:{cacheTtl:120,cacheEverything:true}
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    return response;
  }finally{clearTimeout(timer)}
}
async function json(url){return (await get(url,'application/json')).json()}

// Only extract the last-traded USD/PHP quote from its instrument-specific element.
// Never extract the day's high, bid, ask, cross-rates or unrelated HTML numbers.
function extractInvestingUsdPhp(html){
  if(!/USD\s*\/\s*PHP|USD\s+PHP|US Dollar Philippine Peso/i.test(html))return null;
  const match=html.match(/<([a-z][a-z0-9]*)\b(?=[^>]*\bdata-test\s*=\s*["']instrument-price-last["'])[^>]*>([\s\S]{0,1200}?)<\/\1>/i);
  if(!match)return null;
  const cleaned=match[2].replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/gi,' ').replace(/\s/g,'').replace(/,/g,'');
  if(!/^\d{2}\.\d{1,6}$/.test(cleaned))return null;
  const rate=Number(cleaned);
  return rate>=35&&rate<=100?rate:null;
}
async function investingPhpQuote(){
  try{
    const response=await get(INVESTING_PHP_PAGE,'text/html',5500);
    if(!String(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return null;
    const html=await response.text();
    const rate=extractInvestingUsdPhp(html);
    if(!rate)return null;
    return {rate,checkedAt:new Date().toISOString(),source:'Investing.com USD/PHP'};
  }catch(_){return null}
}
export async function onRequestGet(){
  try{
    // Fetch the quote and catalogue at the same time so PHP checks do not stall the site.
    const investingPromise=investingPhpQuote();
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
    if(!(Number(rates.PHP)>0))throw Error('Essential currency PHP is missing');
    const globalTime=raw.updatedAt||(raw.time_last_update_unix?
      new Date(raw.time_last_update_unix*1000).toISOString():null);
    const investing=await investingPromise;
    if(investing){
      rates.PHP=investing.rate;
      meta.PHP={buy:investing.rate,sell:investing.rate,kind:'market',
        source:investing.source,checkedAt:investing.checkedAt,stale:false};
    }else{
      // Preserve a usable rate, but explicitly distinguish it from Investing.com.
      meta.PHP={buy:Number(rates.PHP),sell:Number(rates.PHP),kind:'reference',
        source,publishedAt:globalTime,stale:true};
    }
    return Response.json({
      base:'USD',rates,meta,source,updatedAt:globalTime,
      phpSource:meta.PHP.source,
      phpUpdatedAt:meta.PHP.checkedAt||meta.PHP.publishedAt||null,
      phpLive:!meta.PHP.stale,
      iqdSource:'IQWealth only (separate /api/iqd)'
    },{headers:{'Cache-Control':'public, max-age=120'}});
  }catch(e){
    return Response.json({error:'Global reference rates unavailable',
      details:String(e.message||e)},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
