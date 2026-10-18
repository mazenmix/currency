// Sole world-reference currency data source: IQWealth public currencies feed.
export async function onRequestGet(){
  try{
    const response=await fetch('https://iraqsm.com/data/currencies.json',{
      headers:{Accept:'application/json'},cf:{cacheTtl:60,cacheEverything:true}
    });
    if(!response.ok)throw Error('IQWealth HTTP '+response.status);
    const d=await response.json();
    if(d?.kind!=='currencies'||d?.publisher!=='IQWealth (iraqsm.com)'||!d.perUsd)throw Error('Invalid IQWealth currency feed');
    const rates={USD:1};
    for(const [code,v] of Object.entries(d.perUsd)){
      const n=Number(v);
      if(/^[A-Z]{3}$/.test(code)&&Number.isFinite(n)&&n>0&&code!=='IQD')rates[code]=n;
    }
    return Response.json({base:'USD',source:'IQWealth',rates,meta:{},updatedAt:d.generatedAt||null,
      asOf:d.asOf||null,attribution:'Data: IQWealth — https://iraqsm.com'},{
      headers:{'Cache-Control':'public, max-age=60'}
    });
  }catch(e){
    return Response.json({error:'IQWealth world reference data unavailable; no other source used',details:String(e.message||e)},{
      status:503,headers:{'Cache-Control':'no-store'}
    });
  }
}
