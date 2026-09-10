import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
async function render(hash, config={url:'',key:''}, rows=[]) {
 const main={innerHTML:''},year={textContent:''};
 const context=vm.createContext({
 document:{querySelector:s=>s==='main'?main:s==='#year'?year:null,querySelectorAll:()=>[],addEventListener(){}},
 window:{BLOG_CONFIG:config,addEventListener(){}},location:{hash},
 fetch:async()=>({ok:true,status:200,json:async()=>rows}),
 Date,console,confirm:()=>true
 });
 vm.runInContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 return main.innerHTML;
}
assert.match(await render('#home'),/안녕하세요/);
assert.match(await render('#about'),/About \/ CV/);
assert.match(await render('#blog'),/아직 공개된 글이 없습니다/);
assert.match(await render('#projects'),/아직 공개된 프로젝트가 없습니다/);
assert.match(await render('#admin'),/관리자 연결을 준비 중/);
assert.match(await render('#missing'),/페이지를 찾을 수 없습니다/);
const html=await render('#blog',{url:'https://example.supabase.co',key:'public-test'},[{id:'abc',created_at:'2026-09-10',title:'<script>alert(1)</script>',summary:'<img src=x onerror=alert(1)>'}]);
assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('<img'));
assert.match(html,/&lt;script&gt;/);
console.log('PASS: 6 routes and stored-content HTML escaping');
