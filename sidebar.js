"use strict";
(async()=>{
 const list=document.querySelector("#sidebar-posts");
 const cfg=window.SUPABASE_CONFIG;
 // The home already shows recent posts. Offer useful destinations in its sidebar.
 if(list && (location.pathname === "/" || location.pathname === "/index.html")){
  const recentPanel=list.closest("section");
  const explore=document.createElement("section");
  explore.className="side-panel";
  explore.innerHTML='<h2>블로그 둘러보기</h2><ul><li><a href="/blog/?category=%EA%B3%B5%EB%B6%80">공부 기록</a></li><li><a href="/blog/?category=%EC%9D%BC%EC%83%81">일상 이야기</a></li><li><a href="/blog/?category=%EA%B0%9C%EB%B0%9C">개발 기록</a></li><li><a href="/questions/">질문 게시판</a></li></ul>';
  recentPanel.before(explore);
  function syncPanels(){
   const route=location.hash.slice(1).replace(/^\/+|\/+$/g, "") || "home";
   recentPanel.hidden=route === "home";
   explore.hidden=route !== "home";
  }
  window.addEventListener("hashchange",syncPanels);
  syncPanels();
 }
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
   const owner=session?.user?.id===cfg?.owner;
   account.innerHTML=owner
    ? '<p>관리자로 로그인했습니다.</p><a class="text-link" href="/admin/?view=home">홈 수정</a><br><a class="text-link" href="/admin/?view=about">자기소개 수정</a><br><a class="text-link" href="/write/">새 글 작성</a>'
    : session
     ? '<p>댓글과 질문을 작성할 수 있습니다.</p><a class="text-link" href="/account/">내 정보 · 닉네임</a>'
     : '<p>로그인하면 댓글과 질문을 작성할 수 있습니다.</p><a class="text-link" href="/account/">로그인 · 회원가입</a>';
  }catch{account.innerHTML='<a href="/account/">로그인 확인</a>';}
 }
})();
