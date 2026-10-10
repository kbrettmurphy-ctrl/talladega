import http from 'node:http';
import {readFile} from 'node:fs/promises';
const types={html:'text/html',css:'text/css',mjs:'text/javascript',svg:'image/svg+xml'};
http.createServer(async(req,res)=>{
  try {const path=new URL(req.url,'http://localhost').pathname;const file=path==='/'?'index.html':path.slice(1);if(!['index.html','style.css','app.mjs','trip.mjs','debug.mjs'].includes(file)){res.writeHead(404).end();return;}const body=await readFile(new URL('./dist/'+file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(body);}catch{res.writeHead(500).end('Preview unavailable');}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
