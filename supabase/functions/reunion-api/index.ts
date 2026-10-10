const base = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins = new Set(['https://talladega.murphsmitts.com','https://talladega-family-reunion.p5v5vhhkmv.chatgpt.site','http://127.0.0.1:4173','http://localhost:4173']);
const enc = new TextEncoder();
const hex = (a:ArrayBuffer)=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
const unhex = (s:string)=>new Uint8Array(s.match(/.{2}/g)!.map(b=>parseInt(b,16)));
async function hash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:210000,hash:'SHA-256'},key,256));}
async function mac(value:string){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
async function validToken(token:string){try{const [exp,nonce,sig]=token.split('.');if(!/^\d+$/.test(exp)||Number(exp)<Date.now()||Number(exp)>Date.now()+31*86400000||!/^\w{32}$/.test(nonce)||!/^\w{64}$/.test(sig))return false;const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);return await crypto.subtle.verify('HMAC',key,unhex(sig),enc.encode(exp+'.'+nonce));}catch{return false;}}
async function service(path:string,init:RequestInit={}){const r=await fetch(base+path,{...init,headers:{apikey:secret,Authorization:'Bearer '+secret,...init.headers}});if(!r.ok){console.error('Supabase request failed',r.status,path.split('?')[0]);throw new Error('Could not save or load your changes. Please try again.');}return r;}
const jsonHeaders={'Content-Type':'application/json'};
async function db(path:string,method='GET',body?:unknown){const r=await service('/rest/v1/'+path,{method,headers:{...jsonHeaders,Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});return r.status===204?null:r.json();}
function text(v:unknown,max:number,required=false){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('Please check the form fields.');return v.trim();}
function checkYear(v:unknown){const y=Number(v);if(!Number.isInteger(y)||y<2000||y>2100)throw new Error('Choose a year from 2000 to 2100.');return y;}
const sizeNames=['','Youth XS','Youth S','Youth M','Youth L','Youth XL','Adult XS','Adult S','Adult M','Adult L','Adult XL','Adult 2XL','Adult 3XL','Adult 4XL','Adult 5XL'];
function clean(kind:string,d:any,year:number){
 if(!d||typeof d!=='object')throw new Error('Missing form data.');
 if(kind==='trip'){const start=text(d.start,10);if(start){const date=new Date(start+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==start||date.getUTCDay()!==5||date.getUTCFullYear()!==year)throw new Error('Choose a Friday within this reunion year.');}return {start,camp:text(d.camp,100),sites:text(d.sites,100),notes:text(d.notes,3000)};}
 if(kind==='shirt'){const hex=text(d.hex??'',7),photo=text(d.photo??'',80);if(hex&&!/^#[0-9a-fA-F]{6}$/.test(hex))throw new Error('Use a color code like #1A4FD6.');if(!/^[\w-]*$/.test(photo))throw new Error('Invalid photo.');return {color:text(d.color,100),hex:hex.toUpperCase(),photo,notes:text(d.notes,3000)};}
 if(kind==='person'){const size=text(d.size,30);if(!sizeNames.includes(size))throw new Error('Choose a listed shirt size.');return {name:text(d.name,100,true),family:text(d.family,100,true),size,diet:text(d.diet,300)};}
 if(kind==='meal')return {slot:text(d.slot,30,true),family:text(d.family,100),menu:text(d.menu,1000)};
 if(kind==='message')return {author:text(d.author,100,true),text:text(d.text,3000,true),created:new Date().toISOString()};
 throw new Error('Unsupported record.');
}
async function put(id:string,year:number,kind:string,data:unknown){return db('reunion_records?on_conflict=id','POST',{id,year,kind,data,updated_at:new Date().toISOString()});}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'content-type,x-reunion-session','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 const url=new URL(req.url),action=url.searchParams.get('action')||'state';
 try{
  if(action==='login'&&req.method==='POST'){
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
   const key=hex(await crypto.subtle.digest('SHA-256',enc.encode(ip)));
   const attempts=await db('rpc/reunion_throttle','POST',{attempt_key:key});
   if(attempts>30)return reply({error:'Too many attempts. Please wait 15 minutes.'},429);
   if(Number(req.headers.get('content-length'))>2048)return reply({error:'Request too large.'},413);
   const body=await req.json();const password=text(body.password,200,true);
   const [access]=await db('reunion_access?id=eq.1&select=salt,password_hash');
   if(!access)return reply({error:'The family password is not configured yet.'},503);
   const digest=await hash(password,access.salt);
   let difference=0;for(let i=0;i<64;i++)difference|=digest.charCodeAt(i)^access.password_hash.charCodeAt(i);
   if(difference)return reply({error:'That password did not match. Please try again.'},401);
   const value=(Date.now()+30*86400000)+'.'+crypto.randomUUID().replaceAll('-','');
   return reply({token:value+'.'+await mac(value)});
  }
  if(!await validToken(req.headers.get('x-reunion-session')||''))return reply({error:'Enter the family password to continue.'},401);
  if(action==='years'&&req.method==='GET'){const rows=await db('reunion_records?select=year&kind=eq.trip&order=year.desc');return reply([...new Set(rows.map((r:any)=>r.year))]);}
  const year=checkYear(url.searchParams.get('year'));
  if(action==='state'&&req.method==='GET'){
   const rows=await db('reunion_records?year=eq.'+year+'&select=*&order=updated_at.asc&limit=10000');
   return reply(rows);
  }
  if(action==='save'&&req.method==='POST'){
   const raw=await req.text();if(raw.length>16000)return reply({error:'Request too large.'},413);
   const body=JSON.parse(raw);const kind=text(body.kind,20,true);const data=clean(kind,body.data,year);
   const id=kind==='trip'||kind==='shirt'?year+'-'+kind:kind==='meal'?year+'-meal-'+(data as any).slot:text(body.id,80,true);
   if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('Invalid record ID.');
   if(kind==='meal'){
    const [trip]=await db('reunion_records?id=eq.'+year+'-trip&select=data');
    const start=trip?.data?.start;if(!start)throw new Error('Set trip dates first.');
    const slots=[0,1,2].flatMap(i=>(i===0?['Dinner']:['Breakfast','Lunch','Dinner']).map(m=>new Date(+new Date(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10)+'-'+m));
    if(!slots.includes((data as any).slot))throw new Error('This meal does not belong to the current trip dates.');
   }
   const existing=await db('reunion_records?id=eq.'+encodeURIComponent(id)+'&select=year,kind');
   if(existing.length&&(existing[0].year!==year||existing[0].kind!==kind))throw new Error('This record belongs to another reunion.');
   await put(id,year,kind,data);return reply({ok:true});
  }
  if(action==='delete'&&req.method==='DELETE'){
   const id=text(url.searchParams.get('id'),80,true);
   const [row]=await db('reunion_records?year=eq.'+year+'&id=eq.'+encodeURIComponent(id)+'&select=*');
   if(!row||!['person','message','photo'].includes(row.kind))return reply({error:'Record not found.'},404);
   if(row.kind==='photo')await service('/storage/v1/object/reunion-photos',{method:'DELETE',headers:jsonHeaders,body:JSON.stringify({prefixes:[row.data.path]})});
   await db('reunion_records?year=eq.'+year+'&id=eq.'+encodeURIComponent(id),'DELETE');return reply({ok:true});
  }
  if(action==='upload'&&req.method==='POST'){
   if(Number(req.headers.get('content-length'))>11*1024*1024)return reply({error:'Photos must be 10 MB or smaller.'},413);
   const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||file.size>10485760||file.size===0||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
   const caption=text(form.get('caption')||'',200);const id=crypto.randomUUID();const path=year+'/'+id+'.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]);
   await service('/storage/v1/object/reunion-photos/'+path,{method:'POST',headers:{'Content-Type':file.type},body:file});
   const shirt=form.get('purpose')==='shirt';
   try{await put(id,year,'photo',{path,caption,created:new Date().toISOString(),...(shirt?{shirt:true}:{})});}catch(e){await service('/storage/v1/object/reunion-photos',{method:'DELETE',headers:jsonHeaders,body:JSON.stringify({prefixes:[path]})});throw e;}
   return reply({ok:true,id});
  }
  if(action==='photo'&&req.method==='GET'){
   const id=text(url.searchParams.get('id'),80,true);const [row]=await db('reunion_records?year=eq.'+year+'&kind=eq.photo&id=eq.'+encodeURIComponent(id)+'&select=data');if(!row)return reply({error:'Photo not found.'},404);
   const r=await service('/storage/v1/object/authenticated/reunion-photos/'+row.data.path);
   return new Response(r.body,{headers:{...headers,'Content-Type':r.headers.get('Content-Type')||'image/jpeg','X-Content-Type-Options':'nosniff'}});
  }
  return reply({error:'Not found.'},404);
 }catch(e){return reply({error:e instanceof Error?e.message:'Something went wrong.'},400);}
});
