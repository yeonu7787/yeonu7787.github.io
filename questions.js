"use strict";
(async()=>{
 const root=document.querySelector("#questions-page"),C=window.Community,cfg=window.SUPABASE_CONFIG;
 const session=await window.BlogAuth.restore().catch(()=>null);
 const params=new URLSearchParams(location.search),id=params.get("id");
 const error=e=>{root.innerHTML='<h1>질문 게시판</h1><p role="alert">'+C.esc(e.message)+'</p><a href="/questions/">목록으로</a>';};
 async function edit(question={}){
  if(!session){location.assign("/account/");return;}
  const profile=await C.profile(session);
  if(!profile){location.assign("/account/");return;}
  root.innerHTML='<h1>'+(question.id?'질문 수정':'질문 작성')+'</h1><form class="editor"><label for="question-title">제목</label><input id="question-title" name="title" required maxlength="200" value="'+C.esc(question.title)+'"><label for="question-body">내용</label><textarea id="question-body" name="body" required maxlength="10000">'+C.esc(question.body)+'</textarea><p>질문과 답변은 모든 방문자에게 공개됩니다.</p><div class="toolbar"><button type="submit">저장</button><a href="/questions/">목록으로</a></div><p role="status"></p></form>';
  const form=root.querySelector("form");
  form.onsubmit=async e=>{
   e.preventDefault();const button=form.querySelector("button");button.disabled=true;
   try{
    const fresh=await window.BlogAuth.restore();if(!fresh)throw new Error("다시 로그인해 주세요.");
    const fd=new FormData(form),data={title:fd.get("title").trim(),body:fd.get("body").trim()};
    if(!question.id)data.author_id=fresh.user.id;
    const rows=await C.api("/rest/v1/questions"+(question.id?"?id=eq."+encodeURIComponent(question.id):""),{method:question.id?"PATCH":"POST",session:fresh,data});
    if(!rows?.length)throw new Error("저장 권한이 없습니다.");location.assign("/questions/?id="+rows[0].id);
   }catch(e){form.querySelector('[role="status"]').textContent=e.message;button.disabled=false;}
  };
 }
 try{
  if(params.has("new")){await edit();return;}
  if(id){
   const rows=await C.api("/rest/v1/questions?id=eq."+encodeURIComponent(id)+"&select=*,member_profiles(nickname)",{session}),q=rows[0];
   if(!q)throw new Error("질문을 찾을 수 없습니다.");
   const mine=session?.user.id===q.author_id,owner=session?.user.id===cfg.owner;
   root.innerHTML='<a class="text-link" href="/questions/">← 질문 목록</a><h1>'+C.esc(q.title)+'</h1><p class="muted">'+C.esc(q.member_profiles?.nickname||"사용자")+' · '+C.esc(new Date(q.created_at).toLocaleDateString("ko-KR"))+'</p><div class="prose">'+C.esc(q.body)+'</div><div class="toolbar">'+(mine?'<button id="edit-question">수정</button>':'')+(mine||owner?'<button id="delete-question" class="secondary">삭제</button>':'')+'</div><p id="question-status" role="status"></p><section id="question-comments" class="comments-section"></section>';
   if(mine)root.querySelector("#edit-question").onclick=()=>edit(q).catch(error);
   if(mine||owner)root.querySelector("#delete-question").onclick=async()=>{
    if(!confirm("질문을 삭제할까요? 연결된 답변도 삭제됩니다."))return;
    try{const fresh=await window.BlogAuth.restore();if(!fresh)throw new Error("다시 로그인해 주세요.");const result=await C.api("/rest/v1/questions?id=eq."+encodeURIComponent(id),{method:"DELETE",session:fresh});if(!result?.length)throw new Error("삭제 권한이 없습니다.");location.assign("/questions/");}catch(e){root.querySelector("#question-status").textContent=e.message;}
   };
   await C.comments(root.querySelector("#question-comments"),id,"question");
  }else{
   const page=Math.max(0,Math.floor(Number(params.get("page"))||0));
   const rows=await C.api("/rest/v1/questions?select=id,title,created_at,member_profiles(nickname)&order=created_at.desc,id.desc&limit=20&offset="+page*20);
   root.innerHTML='<div class="section-heading"><h1>질문 게시판</h1><a class="text-link" href="'+(session?'?new=1':'/account/')+'">'+(session?'질문 작성':'로그인하고 질문하기')+'</a></div>'+
    (rows.length?rows.map(q=>'<a class="question-row" href="?id='+q.id+'"><h2>'+C.esc(q.title)+'</h2><span class="muted">'+C.esc(q.member_profiles?.nickname||"사용자")+' · '+C.esc(new Date(q.created_at).toLocaleDateString("ko-KR"))+'</span></a>').join(""):'<p>아직 질문이 없습니다.</p>')+
    '<div class="toolbar">'+(page?'<a href="?page='+(page-1)+'">이전</a>':'')+(rows.length===20?'<a href="?page='+(page+1)+'">다음</a>':'')+'</div>';
  }
 }catch(e){error(e);}
})();
