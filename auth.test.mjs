import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=readFileSync('auth.js','utf8'),owner='259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4',storage=new Map();
function load(userId=owner){
 const ctx=vm.createContext({window:{SUPABASE_CONFIG:{url:'https://example.supabase.co',key:'public',owner},addEventListener(){}},document:{querySelector:()=>null},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},Date,fetch:async(url)=>({ok:true,status:url.endsWith('/logout')?204:200,json:async()=>url.includes('grant_type')?{user:{id:owner},access_token:'refreshed',refresh_token:'refresh',expires_at:Date.now()/1000+3600}:{id:userId}})});
 vm.runInContext(code,ctx);return ctx.window.BlogAuth;
}
const first=load();first.save({user:{id:owner},access_token:'token',refresh_token:'refresh',expires_at:Date.now()/1000+3600});
assert.equal((await load().restore()).access_token,'token');
first.save({user:{id:owner},access_token:'expired',refresh_token:'refresh',expires_at:1});
const restored=load();assert.equal((await restored.restore()).access_token,'refreshed');
await restored.logout();assert.equal(await load().restore(),null);
first.save({user:{id:owner},access_token:'token',expires_at:Date.now()/1000+3600});
assert.equal(await load('not-owner').restore(),null);
console.log('PASS: session navigation/reload, refresh, logout, owner validation');
