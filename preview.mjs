import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
const files = {'/account/':'account/index.html','/community.js':'community.js','/editor-kit.js':'editor-kit.js','/reference-theme.css':'reference-theme.css','/sidebar.js':'sidebar.js','/write/':'write/index.html','/write':'write/index.html','/auth.js':'auth.js','/admin':'admin/index.html','/admin/':'admin/index.html','/blog':'blog/index.html','/blog/':'blog/index.html','/blog-view.js':'blog-view.js','/posts.js':'posts.js','/supabase-config.js':'supabase-config.js','/':'index.html','/index.html':'index.html','/app.js':'app.js','/content.js':'content.js','/style.css':'style.css'};
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==="/admin"||path==="/blog"||path==="/write"||path==="/account"){res.writeHead(301,{Location:path+"/"});res.end();return;}
 const file=files[path] || (/^\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp|avif)$/i.test(path)?path.slice(1):null);
 if(!file){res.writeHead(404);res.end('Not found');return;}
 try{const body=await readFile(new URL(file,import.meta.url));const ext=file.split('.').pop().toLowerCase();res.setHeader('Content-Type',({js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',html:'text/html; charset=utf-8',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'})[ext]);res.end(body);}
 catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('http://127.0.0.1:'+ (process.env.PORT||4173)));

