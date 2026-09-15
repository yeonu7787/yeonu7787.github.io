"use strict";
window.Community=(()=>{
 const cfg=window.SUPABASE_CONFIG;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function api(path,{method="GET",data,session=null}={}){
  const r=await fetch(cfg.url+path,{method,headers:{apikey:cfg.key,"Content-Type":"application/json",Prefer:"return=representation",...(session?{Authorization:"Bearer "+session.access_token}:{})},body:data===undefined?undefined:JSON.stringify(data)});
  const result=await r.json().catch(()=>null);
  if(!r.ok){
   if(result?.code==="23505")throw new Error("이미 사용 중인 닉네임입니다.");
   if(result?.code==="23514")throw new Error("닉네임은 한글·영문·숫자·밑줄로 2~20자, 댓글은 1~2000자로 입력하세요.");
   throw new Error("처리하지 못했습니다. 입력 내용, 로그인 상태 및 서비스 설정을 확인해 주세요. ("+r.status+")");
  }
  return result;
 }
 async function profile(session){
  if(!session)return null;
  const rows=await api("/rest/v1/member_profiles?user_id=eq."+session.user.id+"&select=nickname",{session});return rows[0]||null;
 }
 function bind(form,action){
  form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('button[type="submit"]');b.disabled=true;
   try{await action(new FormData(form));}catch(e){form.querySelector('[role="status"]').textContent=e.message;}finally{b.disabled=false;}
  };
 }
 async function account(root){
  root.innerHTML='<h1>내 계정</h1><p role="status">불러오는 중…</p>';
  try{
   const session=await window.BlogAuth.restore();
   if(!session){
    root.innerHTML='<h1>로그인 / 회원가입</h1><form class="editor"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">비밀번호</label><input id="password" name="password" type="password" minlength="8" autocomplete="current-password" required><label for="mode">이용 방식</label><select name="mode" id="mode"><option value="login">로그인</option><option value="signup">회원가입</option></select><div class="toolbar"><button type="submit">계속</button></div><p role="status"></p></form>';
    bind(root.querySelector("form"),async fd=>{
     const signup=fd.get("mode")==="signup";
     const data=await api(signup?"/auth/v1/signup":"/auth/v1/token?grant_type=password",{method:"POST",data:{email:fd.get("email"),password:fd.get("password")}});
     if(!data.access_token){root.querySelector('[role="status"]').textContent="이메일 인증이 필요한 경우 받은 편지함에서 인증을 완료한 뒤 로그인하세요.";root.querySelector("#password").value="";return;}
     window.BlogAuth.save(data);const p=await profile(data);
     if(p)location.assign("/");else await account(root);
    });return;
   }
   const p=await profile(session);
   root.innerHTML='<h1>'+(p?"닉네임 변경":"닉네임 설정")+'</h1><p>댓글에 표시할 이름입니다. 한글·영문·숫자·밑줄로 2~20자를 입력하세요.</p><form class="editor"><label for="nickname">닉네임</label><input name="nickname" id="nickname" minlength="2" maxlength="20" pattern="[가-힣A-Za-z0-9_]{2,20}" required value="'+esc(p?.nickname||"")+'"><div class="toolbar"><button type="submit">저장</button><a href="/">홈으로</a></div><p role="status"></p></form>';
   bind(root.querySelector("form"),async fd=>{
    const fresh=await window.BlogAuth.restore();if(!fresh)throw new Error("다시 로그인해 주세요.");
    const nickname=fd.get("nickname").trim();
    const rows=await api("/rest/v1/member_profiles"+(p?"?user_id=eq."+fresh.user.id:""),{method:p?"PATCH":"POST",session:fresh,data:p?{nickname}:{user_id:fresh.user.id,nickname}});
    if(!rows?.length)throw new Error("닉네임을 저장하지 못했습니다.");
    location.assign("/");
   });
  }catch(e){root.innerHTML='<h1>계정</h1><p role="alert">'+esc(e.message)+'</p>';}
 }
 async function comments(root,postId,type="post"){
  const target=type==="question"?"question_id":"post_id";let replyTo=null;
  let limit=20;
  async function render(){
   root.innerHTML='<h2>댓글</h2><p role="status">불러오는 중…</p>';
   try{
    const session=await window.BlogAuth.restore(),p=await profile(session);
    const rows=await api("/rest/v1/comments?"+target+"=eq."+encodeURIComponent(postId)+"&select=id,author_id,body,created_at,parent_id,member_profiles(nickname)&order=created_at.asc,id.asc&limit="+limit,{session});
    root.innerHTML='<h2>댓글</h2><div id="comment-list">'+(rows.length?rows.map(c=>'<article class="comment'+(c.parent_id?' reply-comment':'')+'" data-comment="'+esc(c.id)+'"><strong>'+esc(c.member_profiles?.nickname||"사용자")+'</strong>'+(c.author_id===cfg.owner?' <span class="owner-badge">블로그 주인</span>':'')+(c.parent_id?'<span class="reply-context">↳ 댓글에 대한 답글</span>':'')+'<time>'+esc(new Date(c.created_at).toLocaleString("ko-KR"))+'</time><p class="prose">'+esc(c.body)+'</p><div class="toolbar">'+(session?.user.id===c.author_id?'<button class="secondary" data-edit-comment="'+esc(c.id)+'">수정</button>':'')+((session?.user.id===c.author_id||session?.user.id===cfg.owner)?'<button class="secondary" data-delete-comment="'+esc(c.id)+'">삭제</button>':'')+'</div></article>').join(""):'<p>첫 댓글을 남겨보세요.</p>')+'</div>'+(rows.length===limit?'<button id="more-comments" class="secondary">댓글 더 보기</button>':'')+
    (session?(p?'<form class="editor" id="comment-form"><p id="reply-target"></p><button type="button" id="reply-cancel" class="secondary" hidden>답글 취소</button><label for="comment-body">댓글 / 답글 작성</label><textarea id="comment-body" name="body" maxlength="2000" required></textarea><div class="toolbar"><button type="submit">댓글 등록</button></div><p role="status"></p></form>':'<p><a class="text-link" href="/account/">닉네임을 설정한 후 댓글을 남겨주세요.</a></p>'):'<p><a class="text-link" href="/account/">로그인하고 댓글 남기기</a></p>')+'<p id="comment-status" role="status"></p>';
    const more=root.querySelector("#more-comments");if(more)more.onclick=()=>{limit+=20;render();};
    const form=root.querySelector("#comment-form");
    if(form)bind(form,async fd=>{
     const fresh=await window.BlogAuth.restore();if(!fresh)throw new Error("다시 로그인해 주세요.");
     const result=await api("/rest/v1/comments",{method:"POST",session:fresh,data:{[target]:String(postId),parent_id:replyTo,author_id:fresh.user.id,body:fd.get("body").trim()}});
     if(!result?.length)throw new Error("등록되지 않았습니다.");replyTo=null;await render();
    });
    root.querySelectorAll("[data-reply]").forEach(b=>b.onclick=()=>{
     replyTo=b.dataset.reply;
     const comment=rows.find(c=>String(c.id)===replyTo);
     root.querySelector("#reply-target").textContent=(comment?.member_profiles?.nickname||"사용자")+"님에게 답글";
     root.querySelector("#reply-cancel").hidden=false;root.querySelector("#comment-body").focus();
    });
    const cancel=root.querySelector("#reply-cancel");if(cancel)cancel.onclick=()=>{replyTo=null;root.querySelector("#reply-target").textContent="";cancel.hidden=true;};
    root.querySelectorAll("[data-delete-comment]").forEach(b=>b.onclick=async()=>{
     if(!confirm("이 댓글을 삭제할까요? 답글은 유지됩니다."))return;b.disabled=true;
     try{const fresh=await window.BlogAuth.restore();if(!fresh)throw new Error("다시 로그인해 주세요.");const result=await api("/rest/v1/comments?id=eq."+encodeURIComponent(b.dataset.deleteComment),{method:"DELETE",session:fresh});if(!result?.length)throw new Error("삭제 권한이 없습니다.");await render();}catch(e){root.querySelector("#comment-status").textContent=e.message;b.disabled=false;}
    });
    root.querySelectorAll("[data-edit-comment]").forEach(b=>b.onclick=()=>{
     const c=rows.find(x=>String(x.id)===b.dataset.editComment),box=b.closest("article");
     box.innerHTML='<form class="editor"><label>댓글 수정<textarea name="body" maxlength="2000" required>'+esc(c.body)+'</textarea></label><div class="toolbar"><button type="submit">저장</button><button class="secondary" type="button">취소</button></div><p role="status"></p></form>';
     box.querySelector('button[type="button"]').onclick=render;
     bind(box.querySelector("form"),async fd=>{const fresh=await window.BlogAuth.restore();if(!fresh)throw new Error("다시 로그인해 주세요.");const result=await api("/rest/v1/comments?id=eq."+encodeURIComponent(c.id),{method:"PATCH",session:fresh,data:{body:fd.get("body").trim()}});if(!result?.length)throw new Error("수정 권한이 없습니다.");await render();});
    });
   }catch(e){root.innerHTML='<h2>댓글</h2><p role="alert">'+esc(e.message)+'</p>';}
  }
  await render();
 }
 return {account,comments,api,esc,profile};
})();
const accountRoot=document.querySelector("#account-page");
if(accountRoot)window.Community.account(accountRoot);
