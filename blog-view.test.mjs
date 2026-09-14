import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=readFileSync('blog-view.js','utf8');
const cfg={url:'https://example.supabase.co',key:'public-test'};
async function render(search,rows){
 const root={innerHTML:'',querySelectorAll:()=>[]},calls=[];
 const ctx=vm.createContext({window:{SUPABASE_CONFIG:cfg},document:{querySelector:()=>null},location:{search},URLSearchParams,Date,
 fetch:async(url)=>{calls.push(url);return {ok:true,json:async()=>rows};}});
 vm.runInContext(code,ctx);
 await ctx.window.BlogView.listing(root);
 return {root,calls,view:ctx.window.BlogView};
}
const post={id:'a',title:'<script>x</script>',content:'full body',summary:'brief',created_at:'2026-09-14',images:['uid/photo.jpg']};
const list=await render('',[post]);
assert.ok(list.calls[0].includes('published=eq.true'));
assert.ok(list.root.innerHTML.includes('/blog/?id=a'));
assert.ok(list.root.innerHTML.includes('brief'));
assert.ok(!list.root.innerHTML.includes('<script>'));
const detail=await render('?id=a',[post]);
assert.ok(detail.calls[0].includes('published=eq.true&id=eq.a'));
assert.ok(detail.root.innerHTML.includes('full body'));
assert.ok(detail.root.innerHTML.includes('data-photo="uid/photo.jpg"'));
const missing=await render('?id=private',[]);assert.match(missing.root.innerHTML,/찾을 수 없습니다/);
const recent={innerHTML:'',querySelectorAll:()=>[]};
await list.view.recent(recent);assert.ok(list.calls.at(-1).includes('limit=3'));
const paged=await render('?page=2',[]);assert.ok(paged.calls[0].includes('offset=24'));
console.log('PASS: published-only cards/details, missing drafts, pagination, recent limit, image references, escaped titles');
