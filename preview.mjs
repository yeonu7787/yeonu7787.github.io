import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
const files = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/config.js':'config.js','/style.css':'style.css'};
createServer(async(req,res)=>{
 const file=files[new URL(req.url,'http://localhost').pathname];
 if(!file){res.writeHead(404);res.end('Not found');return;}
 try{const body=await readFile(new URL(file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(body);}
 catch{res.writeHead(500);res.end('Cannot read file');}
}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
