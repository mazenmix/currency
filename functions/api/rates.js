// MX Currency global catalogue: restore full world FX coverage (including PHP).
// IQD is deliberately excluded: USD/IQD must come only from /api/iqd (IQWealth).
// IQWealth publishes only a limited currency subset, so keep the original
// full-catalogue reference rate book for non-IQD currency conversions.
const BOOK='https://raw.githubusercontent.com/mazenmix/MX-Currency-/main/data/rates.json';
const FALLBACK='https://open.er-api.com/v6/latest/USD';
async function json(url) {
  const r=await fetch(url,{headers:{Accept:'application/json'},cf:{cacheTtl:60,cacheEverything:true}});
  if(!r.ok)throw Error('HTTP '+r.status);
  return r.json();
}
export async function onRequestGet(){
  try{
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
    if(!Number.isFinite(Number(rates.PHP)))throw Error('Essential currency PHP is missing');
    const updatedAt=raw.updatedAt||(raw.time_last_update_unix?new Date(raw.time_last_update_unix*1000).toISOString():null);
    return Response.json({base:'USD',rates,meta,source,updatedAt,
      iqdSource:'IQWealth only (separate /api/iqd)'},{
      headers:{'Cache-Control':'public, max-age=60'}
    });
  }catch(e){
    return Response.json({error:'Global reference rates unavailable',
      details:String(e.message||e)},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
