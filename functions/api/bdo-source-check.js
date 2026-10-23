// Temporary public connectivity check, to be removed after verifying the BDO feed.
export async function onRequestGet(){
  const origin='https://mxfuel.pages.dev/api/forex';
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const resp=await fetch(origin,{
      headers:{Accept:'application/json','Accept-Language':'en-US,en;q=0.9'},
      signal:ctrl.signal,cf:{cacheTtl:60,cacheEverything:true}
    });
    const body=await resp.text();
    return Response.json({ok:resp.ok,http:resp.status,
      contentType:resp.headers.get('content-type'),
      bodyStart:body.slice(0,650)});
  }catch(e){
    return Response.json({ok:false,error:String(e.message||e)});
  }finally{clearTimeout(timer)}
}
