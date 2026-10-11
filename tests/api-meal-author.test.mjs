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
rows.set('2099-trip',{id:'2099-trip',year:2099,kind:'trip',data:{start:'2099-10-07',end:'2099-10-10'}});
globalThis.fetch=async(url,init={})=>{
  if(init.method==='POST'){const row=JSON.parse(init.body);rows.set(row.id,row);return Response.json([row]);}
  const id=decodeURIComponent(String(url).match(/id=eq\.([^&]+)/)[1]);
  return Response.json(rows.has(id)?[rows.get(id)]:[]);
};
const save=(data)=>handler(new Request('https://example.invalid/?action=save&year=2099',{method:'POST',headers:{'content-type':'application/json','x-reunion-session':token},body:JSON.stringify({kind:'meal',data})}));
const meal=(slot)=>rows.get('2099-meal-'+slot).data;

test('first person to add a meal is kept as addedBy; later edits update by',async()=>{
  assert.equal((await save({slot:'2099-10-08-Lunch',family:'A',menu:'',by:'Valerie'})).status,200);
  assert.deepEqual([meal('2099-10-08-Lunch').addedBy,meal('2099-10-08-Lunch').by],['Valerie','Valerie']);
  await save({slot:'2099-10-08-Lunch',family:'B',menu:'Tacos',by:'Linda'});
  assert.deepEqual([meal('2099-10-08-Lunch').addedBy,meal('2099-10-08-Lunch').by],['Valerie','Linda']);
});
test('meals saved before names were recorded stay unattributed',async()=>{
  rows.set('2099-meal-2099-10-08-Dinner',{id:'2099-meal-2099-10-08-Dinner',year:2099,kind:'meal',data:{slot:'2099-10-08-Dinner',family:'Old',menu:'',included:true}});
  await save({slot:'2099-10-08-Dinner',family:'Old',menu:'Chili',by:'Linda'});
  assert.deepEqual([meal('2099-10-08-Dinner').addedBy,meal('2099-10-08-Dinner').by],['','Linda']);
  await save({slot:'2099-10-08-Dinner',family:'Old',menu:'Chili',by:'Krisha'});
  assert.deepEqual([meal('2099-10-08-Dinner').addedBy,meal('2099-10-08-Dinner').by],['','Krisha']);
  await save({slot:'2099-10-08-Dinner',family:'',menu:'',included:false,by:'Brett'});
  await save({slot:'2099-10-08-Dinner',family:'E',menu:'',included:true,by:'Lex'});
  assert.equal(meal('2099-10-08-Dinner').addedBy,'Lex');
});
test('removing a meal is not adding it; re-adding credits the re-adder',async()=>{
  await save({slot:'2099-10-09-Breakfast',family:'',menu:'',included:false,by:'Brett'});
  assert.equal(meal('2099-10-09-Breakfast').addedBy,'');
  await save({slot:'2099-10-09-Breakfast',family:'C',menu:'',included:true,by:'Krisha'});
  assert.equal(meal('2099-10-09-Breakfast').addedBy,'Krisha');
});
test('older app versions that send no name still save',async()=>{
  assert.equal((await save({slot:'2099-10-09-Lunch',family:'D',menu:''})).status,200);
  assert.deepEqual([meal('2099-10-09-Lunch').addedBy,meal('2099-10-09-Lunch').by],['','']);
});
