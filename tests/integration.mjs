import assert from 'node:assert/strict';
import {createInterface} from 'node:readline/promises';
const io=createInterface({input:process.stdin,output:process.stdout});
const password=await io.question('Family password (test input): ');io.close();
const base='https://sdfleesxvattrwcsavqc.supabase.co/functions/v1/reunion-api';
let token='';
async function call(action,method='GET',body,extra=''){const r=await fetch(base+'?action='+action+'&year=2099'+extra,{method,headers:{'x-reunion-session':token,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});return {status:r.status,body:action==='photo'&&r.ok?await r.arrayBuffer():await r.json()};}
assert.equal((await call('state')).status,401);
assert.equal((await call('login','POST',{password:'incorrect-test-password'})).status,401);
const login=await call('login','POST',{password});assert.equal(login.status,200);token=login.body.token;
const records=[];
async function save(kind,data,id=crypto.randomUUID()){const r=await call('save','POST',{kind,data,id});assert.equal(r.status,200,JSON.stringify(r.body));records.push(id);return id;}
await save('trip',{start:'2099-10-09',camp:'Integration test',sites:'TEST',notes:''},'2099-trip');
const bad=await call('save','POST',{kind:'trip',data:{start:'2099-10-10',camp:'',sites:'',notes:''}});assert.equal(bad.status,400);
await save('meal',{slot:'2099-10-09-Dinner',family:'Test household',menu:'Test menu'},'2099-meal-2099-10-09-Dinner');
assert.equal((await call('save','POST',{kind:'meal',data:{slot:'2099-10-12-Dinner',family:'Test',menu:''}})).status,400);
const person=await save('person',{name:'TEST PERSON',family:'Test household',size:'Adult L',diet:''});
await save('person',{name:'TEST PERSON EDITED',family:'Test household',size:'Adult XL',diet:''},person);
await save('shirt',{color:'Test blue',notes:'Test shirt plan'},'2099-shirt');
const message=await save('message',{author:'AUTOMATED TEST',text:'Disposable verification record.'});
const form=new FormData();form.append('caption','AUTOMATED TEST');form.append('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'test.png');
assert.equal((await call('upload','POST',form)).status,200);
const state=await call('state');assert.equal(state.status,200);assert.equal(state.body.find(r=>r.id===person).data.size,'Adult XL');
const photo=state.body.find(r=>r.kind==='photo');assert.ok(photo);assert.equal((await call('photo','GET',undefined,'&id='+photo.id)).status,200);
for(const id of [photo.id,person,message])assert.equal((await call('delete','DELETE',undefined,'&id='+id)).status,200);
assert.equal((await call('state')).body.filter(r=>['person','photo','message'].includes(r.kind)).length,0);
console.log('\nPASS: unauthorized requests, bad password, login, trip validation, meal validation, person edits, shirt plan, messages, private photo upload/read/delete, and record removal.');
