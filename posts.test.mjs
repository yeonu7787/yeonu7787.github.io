import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('posts.js','utf8');
const config=readFileSync('supabase-config.js','utf8');
const owner='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4';
const tick=()=>new Promise(r=>setImmediate(r));
function app(mode, responder){
 const nodes={};
 const get=s=>nodes[s]||(nodes[s]={innerHTML:'',textContent:'',value:'',dataset:{mode},querySelectorAll:()=>[]});
 const calls=[];
 const context=vm.createContext({window:{addEventListener(){}},document:{querySelector:get,addEventListener(){}},
 FormData:class{constructor(data){this.data=data;}get(key){return this.data[key];}},Date,confirm:()=>true,
 fetch:async(url,opt)=>{calls.push({url,...opt});const value=responder(url,opt);return {ok:value.status===undefined||value.status<400,status:value.status||200,json:async()=>value.data};}
 });
 vm.runInContext(config,context);vm.runInContext(source,context);
 return {nodes,get,calls,submit:async(selector,data)=>{get(selector).onsubmit({preventDefault(){},target:data});await tick();}};
}
const denied=app('admin',()=>({data:{user:{id:'someone-else'},access_token:'fake'}}));
assert.match(denied.get('#posts-app').innerHTML,/관리자 로그인/);assert.equal(denied.calls.length,0);
await denied.submit('#login',{email:'test@example.com',password:'test'});
assert.match(denied.get('#status').textContent,/권한이 없습니다/);
assert.equal(denied.calls.length,1);
let emptyWrite=false;
const a=app('admin',(url,opt)=>{
 if(url.includes('/token'))return {data:{user:{id:owner},access_token:'test-token'}};
 if(url.includes('/logout'))return {data:null};
 if(opt.method==='GET')return {data:[]};
 return {data:emptyWrite?[]:[{id:'1'}]};
});
await a.submit('#login',{email:'test@example.com',password:'test'});
assert.match(a.get('#posts-app').innerHTML,/게시글 관리/);
a.get('#new').onclick();
await a.submit('#editor',{title:'제목',content:'본문',published:'false'});
const write=a.calls.find(c=>c.method==='POST'&&c.url.includes('/posts'));
assert.deepEqual(JSON.parse(write.body),{title:'제목',content:'본문',published:false});
assert.equal(write.headers.Authorization,'Bearer test-token');
assert.match(a.get('#status').textContent,/저장했습니다/);
a.get('#new').onclick();emptyWrite=true;
await a.submit('#editor',{title:'제목',content:'본문',published:'true'});
assert.match(a.get('#status').textContent,/저장되지 않았습니다/);
await a.get('#logout').onclick();await tick();
assert.match(a.get('#posts-app').innerHTML,/관리자 로그인/);
const pub=app('blog',()=>({data:[{id:'1',title:'<script>x</script>',content:'<img src=x>',created_at:'2026-09-14'}]}));
await tick();
assert.ok(pub.calls[0].url.includes('published=eq.true'));assert.ok(pub.calls[0].url.includes('order=created_at.desc'));
assert.equal(pub.calls[0].headers.Authorization,undefined);
assert.ok(pub.get('#list').innerHTML.includes('&lt;script&gt;'));
assert.ok(!pub.get('#list').innerHTML.includes('<img'));
console.log('PASS: login gate, owner rejection, authenticated insert, failed writes, logout, published query, HTML escaping');
