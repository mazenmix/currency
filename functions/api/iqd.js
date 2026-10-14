// Baghdad parallel IQD: take the highest USD BUY rate per $100 at MXDollar.
export async function onRequestGet() {
  try {
    const url='https://mxdollar.pages.dev/api/market?v='+Math.floor(Date.now()/60000);
    const response=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},cf:{cacheTtl:0,cacheEverything:false}});
    if(!response.ok)throw Error('MXDollar unavailable: '+response.status);
    const data=await response.json();
    const normalize=raw=>{
      const x=Number(String(raw??'').replace(/,/g,''));
      if(x>=80000&&x<=350000)return x;
      if(x>=800&&x<=3500)return x*100;
      if(x>=80&&x<=350)return x*1000;
      return null;
    };
    const quotes=[['Kifah',data?.kifah],['Harithiya',data?.harithiya],['Kukh',data?.kukh]]
      .map(([name,q])=>({market:name,perHundred:normalize(q?.buy)}))
      .filter(x=>x.perHundred!==null)
      .sort((a,b)=>b.perHundred-a.perHundred);
    if(!quotes.length)throw Error('No valid cash BUY quote');
    return Response.json({rate:quotes[0].perHundred/100,perHundred:quotes[0].perHundred,market:quotes[0].market,source:'MXDollar • Highest BUY',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    return Response.json({error:'Live MXDollar BUY quote unavailable',details:String(e.message||e)},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}