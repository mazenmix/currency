export async function onRequestGet(){
  try{
    const response=await fetch('https://dolarapi.com/v1/dolares/blue',{cf:{cacheTtl:0}});
    if(!response.ok)throw Error('Blue market unavailable');
    const data=await response.json();
    if(!(Number(data.compra)>0&&Number(data.venta)>0))throw Error('Invalid quote');
    return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:String(e.message||e)},{status:503})}
}