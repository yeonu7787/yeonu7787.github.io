"use strict";
(async()=>{
 const list=document.querySelector("#sidebar-posts");
 const cfg=window.SUPABASE_CONFIG;
 if(list&&cfg){
  try{
   const response=await fetch(cfg.url+"/rest/v1/posts?select=id,title&published=eq.true&deleted_at=is.null&order=created_at.desc,id.desc&limit=5",{headers:{apikey:cfg.key}});
   if(!response.ok)throw new Error();
   const rows=await response.json();list.replaceChildren();
   if(!rows.length){const li=document.createElement("li");li.textContent="아직 공개된 글이 없습니다.";list.append(li);}
   for(const row of rows){const li=document.createElement("li"),a=document.createElement("a");a.href="/blog/?id="+encodeURIComponent(row.id);a.textContent=row.title;li.append(a);list.append(li);}
  }catch{list.textContent="최근 글을 불러오지 못했습니다.";}
 }
 const account=document.querySelector("#sidebar-account");
 if(account&&window.BlogAuth){
  try{
   const session=await window.BlogAuth.restore();
   account.innerHTML=session?'<p>관리자로 로그인되어 있습니다.</p><a class="text-link" href="/blog/">Blog로 이동</a>':'<p>로그인하면 홈과 게시글을 수정할 수 있습니다.</p><a class="text-link" href="/admin/">로그인</a>';
  }catch{account.innerHTML='<a href="/admin/">로그인 확인</a>';}
 }
})();
