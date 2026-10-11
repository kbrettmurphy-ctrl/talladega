import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
let handler, saved;
const secret='local-test-only';
globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://example.invalid':secret},serve:fn=>{handler=fn;}};
await import('../supabase/functions/reunion-api/index.ts');
const value=(Date.now()+86400000)+'.'+'a'.repeat(32);
const token=value+'.'+createHmac('sha256',secret).update(value).digest('hex');
const fakeTrip={start:'2099-10-07',end:'2099-10-13',camp:'',sites:'',notes:''};
function request(kind,data){return new Request('https://example.invalid/?action=save&year=2099',{method:'POST',headers:{'content-type':'application/json','x-reunion-session':token},body:JSON.stringify({kind,data})});}
test('API accepts flexible dates and any meal within the full range',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  if(init.method==='POST'){saved=JSON.parse(init.body);return Response.json([saved]);}
  return Response.json(String(url).includes('&select=data')?[{data:fakeTrip}]:[]);
 };
 try{
  assert.equal((await handler(request('trip',fakeTrip))).status,200);
  assert.equal(saved.data.end,'2099-10-13');
  assert.equal((await handler(request('trip',{...fakeTrip,start:'2099-12-30',end:'2100-01-03'}))).status,200);
  for(const data of [{...fakeTrip,end:'2099-10-06'},{...fakeTrip,end:''},{...fakeTrip,start:'2099-02-30'},{...fakeTrip,start:'2098-10-07'}]) assert.equal((await handler(request('trip',data))).status,400);
  assert.equal((await handler(request('meal',{slot:'2099-10-13-Lunch',family:'Test',menu:'',included:true}))).status,200);
  assert.equal(saved.data.included,true);
  assert.equal((await handler(request('meal',{slot:'2099-10-13-Lunch',family:'Test',menu:'',included:false}))).status,200);
  assert.equal(saved.data.included,false);
  assert.equal((await handler(request('meal',{slot:'2099-10-14-Lunch',family:'Test',menu:''}))).status,400);
 } finally {globalThis.fetch=original;}
});
