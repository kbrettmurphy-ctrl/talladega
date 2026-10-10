// Diagnostics, loaded only when the URL contains ?debug. Shows how this device renders the sheets
// so a screenshot can explain device-specific problems. Reads nothing private and sends nothing.
const errors=[];
addEventListener('error',(e)=>errors.push(e.message));
addEventListener('unhandledrejection',(e)=>errors.push(String(e.reason?.message||e.reason)));

const media=(q)=>matchMedia(q).matches?'yes':'no';
function describe(el){
  if(!el)return 'missing';
  const cs=getComputedStyle(el),r=el.getBoundingClientRect();
  return [`open=${el.open}`,`modal=${(()=>{try{return el.matches(':modal');}catch{return '?';}})()}`,`display=${cs.display}`,`visibility=${cs.visibility}`,`opacity=${cs.opacity}`,`transform=${cs.transform}`,
    `rect=${[r.x,r.y,r.width,r.height].map(Math.round).join(',')}`,`style="${el.getAttribute('style')||''}"`,
    `anims=${(el.getAnimations?.()||[]).map(a=>`${a.animationName||'?'}:${a.playState}@${Math.round(a.currentTime||0)}`).join(' ')||'none'}`,
    `children=${el.children.length}`].join('\n  ');
}
function topAt(x,y){const el=document.elementFromPoint(x,y);return el?`${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}${el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).join('.'):''}`:'none';}
function snapshot(label){
  const sheet=document.querySelector('#sheet'),inner=sheet?.firstElementChild;
  return `— ${label} —
sheet:
  ${describe(sheet)}
sheet form: ${inner?(()=>{const r=inner.getBoundingClientRect(),cs=getComputedStyle(inner);return `display=${cs.display} opacity=${cs.opacity} rect=${[r.x,r.y,r.width,r.height].map(Math.round).join(',')}`;})():'none'}
on top at center: ${topAt(innerWidth/2,innerHeight/2)}
on top near bottom: ${topAt(innerWidth/2,innerHeight-120)}`;
}
function environment(){
  return `build: ${document.querySelector('meta[name="build"]')?.content||'?'}
ua: ${navigator.userAgent}
standalone: ${navigator.standalone?'yes':'no'}  viewport: ${innerWidth}x${innerHeight}  visual: ${Math.round(visualViewport?.width||0)}x${Math.round(visualViewport?.height||0)} @${visualViewport?.scale}
dialog: ${typeof HTMLDialogElement==='function'&&!!HTMLDialogElement.prototype.showModal?'native':'stand-in'}  popover: ${'popover' in HTMLElement.prototype?'yes':'no'}
reduce motion: ${media('(prefers-reduced-motion: reduce)')}  dark: ${media('(prefers-color-scheme: dark)')}  reduce transparency: ${media('(prefers-reduced-transparency: reduce)')}  more contrast: ${media('(prefers-contrast: more)')}
theme setting: ${localStorage.getItem('reunion-theme')||'system'}  name set: ${localStorage.getItem('reunion-me')?'yes':'no'}`;
}

let report='';
const panel=document.createElement('div');
panel.id='debug-panel';
panel.style.cssText='position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top));max-height:70vh;overflow:auto;z-index:2147483647;background:#fff;color:#000;font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;padding:10px;border:2px solid #ff3b30;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.4)';
function show(text){
  report=text;
  panel.textContent=text;
  const bar=document.createElement('div');bar.style.cssText='display:flex;gap:8px;margin-top:8px';
  const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='font:600 13px -apple-system,sans-serif;padding:8px 12px;border-radius:8px;border:0;background:#0a6cff;color:#fff';b.onclick=fn;bar.append(b);};
  button('Test a sheet',testSheet);
  button('Copy',()=>navigator.clipboard?.writeText(report).then(()=>alert('Copied')));
  button('Close',()=>panel.remove());
  panel.append(bar);
  if(!panel.isConnected)document.body.append(panel);
}
function closeSheets(){document.querySelectorAll('dialog').forEach(d=>{try{d.open&&d.close();}catch{}});}
async function testSheet(){
  closeSheets();
  document.querySelector('#year-button')?.click();
  await new Promise(r=>setTimeout(r,1200));
  const text=snapshot('after opening the year sheet');
  closeSheets();
  show(`${environment()}\n\n${report.split('\n\n').slice(1).join('\n\n')}\n\n${text}\nerrors: ${errors.join(' | ')||'none'}`);
}

// Wait for sign-in (and the who-sheet that follows it), then report.
const started=Date.now();
const timer=setInterval(()=>{
  const unlocked=!document.body.classList.contains('locked');
  if(!unlocked&&Date.now()-started<120000)return;
  clearInterval(timer);
  setTimeout(()=>{const text=snapshot('after sign-in');closeSheets();show(`${environment()}\n\n${text}\nerrors: ${errors.join(' | ')||'none'}`);},2000);
},500);
