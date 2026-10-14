export async function onRequestGet(){
  try{
    const url='https://raw.githubusercontent.com/mazenmix/MX-Currency-/main/data/rates.json?v='+Math.floor(Date.now()/300000);
    const response=await fetch(url,{cf:{cacheTtl:0},headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Rate book unavailable');
    const body=await response.json();
    if(body.base!=='USD'||!body.rates)throw Error('Invalid rate book');
    return Response.json(body,{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:String(e.message||e)},{status:503,headers:{'Cache-Control':'no-store'}})}
}