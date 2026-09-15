import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('posts.js','utf8'),config=readFileSync('supabase-config.js','utf8');
const uid='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4';
const tick=()=>new Promise(r=>setImmediate(r));
async function boot({signed=false,search='',loginId=uid}={}){
 const nodes={},calls=[],moves=[];
 const get=s=>nodes[s]||(nodes[s]={innerHTML:'',textContent:'',value:'',dataset:{mode:'admin'},querySelectorAll:()=>[],addEventListener(){}});
 let session=signed?{user:{id:uid},access_token:'test'}:null;
 const ctx=vm.createContext({window:{BlogAuth:{restore:async()=>session,save:s=>session=s,menu:async()=>{},logout:async()=>session=null},addEventListener(){}},
 document:{querySelector:get,addEventListener(){}},location:{pathname:'/write/',search,assign:p=>moves.push(p)},URLSearchParams,Date,confirm:()=>true,
 FormData:class{constructor(d){this.d=d;}get(k){return this.d[k];}},
 fetch:async(url,opt)=>{calls.push({url,...opt});return {ok:true,status:200,json:async()=>url.includes('/token')?{user:{id:loginId},access_token:'test'}:opt.method==='GET'?[{id:'42',title:'Existing',content:'body',published:false,images:[]}]:[{id:'42'}]};}});
 vm.runInContext(config,ctx);vm.runInContext(source,ctx);await tick();
 return {get,calls,moves,submit:async(data)=>{get('#editor').onsubmit({preventDefault(){},target:data});await tick();}};
}
const anon=await boot();assert.match(anon.get('#posts-app').innerHTML,/관리자 로그인/);
anon.get('#login').onsubmit({preventDefault(){},target:{email:'test@example.com',password:'test'}});await tick();assert.deepEqual(anon.moves,['/']);
const denied=await boot({loginId:'other'});denied.get('#login').onsubmit({preventDefault(){},target:{email:'x',password:'x'}});await tick();assert.equal(denied.moves.length,0);
const create=await boot({signed:true});assert.match(create.get('#posts-app').innerHTML,/새 글 작성/);
await create.submit({title:'New',content:'Body',published:'false',summary:''});
assert.ok(create.calls.some(c=>c.method==='POST'&&c.url.includes('/posts')));assert.deepEqual(create.moves,['/blog/?id=42']);
const edit=await boot({signed:true,search:'?id=42'});assert.match(edit.get('#posts-app').innerHTML,/게시글 수정/);assert.match(edit.get('#posts-app').innerHTML,/Existing/);
await edit.submit({title:'Changed',content:'Body',published:'true',summary:''});assert.ok(edit.calls.some(c=>c.method==='PATCH'&&c.url.includes('id=eq.42')));
const del=await boot({signed:true,search:'?id=42'});del.get('#delete').onclick();await tick();assert.ok(del.calls.some(c=>c.method==='PATCH'&&JSON.parse(c.body).deleted_at));assert.deepEqual(del.moves,['/blog/']);
console.log('PASS: login redirects Home, non-owner denied, new post, per-post edit/delete and return navigation');
