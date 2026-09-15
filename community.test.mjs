import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
async function render(uid){
 const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
 const ctx=vm.createContext({window:{SUPABASE_CONFIG:{url:'https://test.supabase.co',key:'public',owner:'owner'},BlogAuth:{restore:async()=>uid?{user:{id:uid},access_token:'t'}:null}},document:{querySelector:()=>null},Date,
 fetch:async url=>({ok:true,json:async()=>url.includes('member_profiles?')?[{nickname:'닉네임'}]:[{id:'1',author_id:'writer',body:'<script>bad</script>',created_at:'2026-09-15',member_profiles:{nickname:'작성자'}}]})});
 vm.runInContext(readFileSync('community.js','utf8'),ctx);await ctx.window.Community.comments(root,'post');return root.innerHTML;
}
const anon=await render(null);assert.ok(anon.includes('로그인하고 댓글'));assert.ok(!anon.includes('data-delete-comment'));
const mine=await render('writer');assert.ok(mine.includes('data-edit-comment'));assert.ok(mine.includes('data-delete-comment'));assert.ok(!mine.includes('<script>'));
const other=await render('other');assert.ok(!other.includes('data-edit-comment'));assert.ok(!other.includes('data-delete-comment'));
const owner=await render('owner');assert.ok(owner.includes('data-delete-comment'));assert.ok(!owner.includes('data-edit-comment'));
console.log('PASS: anonymous/member/author/admin comment controls and escaped content');
