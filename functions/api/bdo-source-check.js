// Temporary public connectivity check, to be removed after verifying the BDO feed.
export async function onRequestGet(){
  const origin='https://mxfuel.pages.dev/api/forex';
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const resp=await fetch(origin,{headers:{Accept:'application/json','Accept-Language':'en-US,en;q=0.9'},signal:ctrl.signal,cf:{cacheTtl:60,cacheEverything:true}});
    const data=await resp.json();
    const provider=data?.providers?.find(p=>String(p?.name||'').trim().toUpperCase()==='BDO');
    const usd=provider?.rates?.USD;
    const buy=Number(usd?.[0]),sell=Number(usd?.[1]);
    const status=String(provider?.status||'').toLowerCase();
    return Response.json({http:resp.status,contentType:resp.headers.get('content-type'),
      ok:data?.ok,isOkBoolean:data?.ok===true,isArray:Array.isArray(data?.providers),
      providerCount:data?.providers?.length,providerName:provider?.name,
      usd,isArrayUsd:Array.isArray(usd),buy,sell,status,
      parsed:!!(data?.ok===true&&Array.isArray(data.providers)&&Array.isArray(usd)&&usd.length>=2&&Number.isFinite(buy)&&Number.isFinite(sell)&&buy>=35&&sell<=100&&sell>=buy&&['live','last_verified'].includes(status))
    },{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:String(e.message||e),name:e.name},{headers:{'Cache-Control':'no-store'}})}
  finally{clearTimeout(timer)}
}
