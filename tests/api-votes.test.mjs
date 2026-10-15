import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
// Runs the Edge Function against an in-memory stand-in for the database.
let handler;
const secret='local-test-only',rows=new Map();
globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://example.invalid':secret},serve:fn=>{handler=fn;}};
await import('../supabase/functions/reunion-api/index.ts');
const value=(Date.now()+86400000)+'.'+'a'.repeat(32);
const token=value+'.'+createHmac('sha256',secret).update(value).digest('hex');
rows.set('c1',{id:'c1',year:2099,kind:'photo',data:{path:'2099/c1.jpg',caption:'Flag',candidate:true}});
rows.set('c2',{id:'c2',year:2099,kind:'photo',data:{path:'2099/c2.jpg',caption:'Car',candidate:true}});
rows.set('p1',{id:'p1',year:2099,kind:'photo',data:{path:'2099/p1.jpg',caption:'Album photo'}});
globalThis.fetch=async(url,init={})=>{
  url=decodeURIComponent(String(url));
  if(url.includes('/storage/'))return new Response(null,{status:200});
  if(init.method==='POST'){const row=JSON.parse(init.body);rows.set(row.id,row);return Response.json([row]);}
  if(init.method==='DELETE'){
    const c=url.match(/data->>candidate=eq\.([^&]+)/);
    for(const [k,r] of rows)if(c?r.kind==='vote'&&r.data.candidate===c[1]:k===url.match(/id=eq\.([^&]+)/)[1])rows.delete(k);
    return new Response(null,{status:204});
  }
  const id=url.match(/id=eq\.([^&]+)/)[1];
  return Response.json(rows.has(id)?[rows.get(id)]:[]);
};
const call=(action,method,body,extra='')=>handler(new Request('https://example.invalid/?action='+action+'&year=2099'+extra,{method,headers:{'content-type':'application/json','x-reunion-session':token},body:body&&JSON.stringify(body)}));
const vote=(voter,candidate)=>call('save','POST',{kind:'vote',data:{voter,candidate}});
const tally=()=>[...rows.values()].filter(r=>r.kind==='vote').map(r=>r.data.voter+':'+r.data.candidate).sort();

test('each name gets one vote; voting again switches it, regardless of capitalization',async()=>{
  assert.equal((await vote('Valerie','c1')).status,200);
  assert.equal((await vote('Linda','c1')).status,200);
  assert.equal((await vote('valerie ','c2')).status,200);
  assert.deepEqual(tally(),['Linda:c1','valerie:c2']);
});
test('only design candidates can be voted on',async()=>{
  assert.equal((await vote('Brett','p1')).status,400);
  assert.equal((await vote('Brett','missing')).status,400);
  assert.equal((await vote('','c1')).status,400);
});
test('votes can be taken back, and removing a design removes its votes',async()=>{
  const linda=[...rows.values()].find(r=>r.kind==='vote'&&r.data.voter==='Linda');
  assert.equal((await call('delete','DELETE',undefined,'&id='+linda.id)).status,200);
  assert.deepEqual(tally(),['valerie:c2']);
  assert.equal((await call('delete','DELETE',undefined,'&id=c2')).status,200);
  assert.deepEqual(tally(),[]);
});
test('designs can be renamed without losing their photo or candidate flag',async()=>{
  assert.equal((await call('save','POST',{kind:'photo',id:'c1',data:{caption:'  Checkered flag v2 '}})).status,200);
  assert.deepEqual(rows.get('c1').data,{path:'2099/c1.jpg',caption:'Checkered flag v2',candidate:true});
  assert.equal((await call('save','POST',{kind:'photo',id:'nope',data:{caption:'x'}})).status,400);
});
