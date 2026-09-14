"use strict";
(() => {
 const cfg=window.SUPABASE_CONFIG, root=document.querySelector("#posts-app");
 const admin=root.dataset.mode==="admin";
 let session=null, dirty=false, busy=false, page=0;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const owner=()=>session?.user?.id===cfg.owner;
 const status=(s,error=false)=>{const el=document.querySelector("#status");if(el){el.textContent=s;el.className=error?"notice error":"notice";}};
 async function request(path,{method="GET",data,auth=false}={}) {
  if(auth&&!owner())throw new Error("관리자 로그인이 필요합니다.");
  const headers={apikey:cfg.key,"Content-Type":"application/json"};
  if(auth)headers.Authorization="Bearer "+session.access_token;
  if(method!=="GET")headers.Prefer="return=representation";
  let res;
  try{res=await fetch(cfg.url+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});}
  catch{throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");}
  const value=await res.json().catch(()=>null);
  if(!res.ok){
   if(res.status===401||res.status===400&&path.includes("/auth/"))throw new Error("로그인 정보가 올바르지 않거나 세션이 만료되었습니다. 다시 로그인해 주세요.");
   if(res.status===403)throw new Error("접근 권한이 없습니다. Supabase의 관리자 권한 설정을 확인해 주세요.");
   throw new Error("요청 실패 ("+res.status+"). 테이블 구조와 권한 설정을 확인해 주세요.");
  }
  return value;
 }
 const listQuery=published=>"/rest/v1/posts?select=*"+(published?"&published=eq.true":"")+"&order=created_at.desc,id.desc&limit=20&offset="+(page*20);
 async function run(fn){if(busy)return;busy=true;root.querySelectorAll("button").forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message,true);}finally{busy=false;root.querySelectorAll("button").forEach(b=>b.disabled=false);}}
 function login(message=""){
  root.innerHTML='<div class="eyebrow">Private workspace</div><h1>관리자 로그인</h1><p class="muted">본인 계정으로 로그인해 주세요.</p><form id="login" class="editor"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required><div class="toolbar"><button type="submit">로그인</button></div></form><p id="status" role="status"></p>';
  status(message);
  document.querySelector("#login").onsubmit=e=>{e.preventDefault();run(async()=>{
   const fd=new FormData(e.target);
   const result=await request("/auth/v1/token?grant_type=password",{method:"POST",data:{email:fd.get("email"),password:fd.get("password")}});
   if(result.user?.id!==cfg.owner){session=null;document.querySelector("#password").value="";throw new Error("이 계정에는 관리자 권한이 없습니다.");}
   session=result;dirty=false;page=0;await dashboard();
  });};
 }
 async function logout(){
  if(dirty&&!confirm("저장하지 않은 내용을 버리고 로그아웃할까요?"))return;
  await run(async()=>{
   let failed=false;
   try{await request("/auth/v1/logout",{method:"POST",auth:true});}catch{failed=true;}
   session=null;dirty=false;login(failed?"이 브라우저에서 로그아웃했습니다. 서버 세션 종료는 확인하지 못했습니다.":"로그아웃했습니다.");
  });
 }
 function controls(rows,render){
  const prev=document.querySelector("#prev"),next=document.querySelector("#next");
  if(prev)prev.onclick=()=>run(async()=>{page--;await render();});
  if(next)next.onclick=()=>run(async()=>{page++;await render();});
 }
 function paging(rows){return '<div class="toolbar">'+(page>0?'<button id="prev" class="secondary">이전</button>':'')+(rows.length===20?'<button id="next" class="secondary">다음</button>':'')+'</div>';}
 async function dashboard(){
  if(!owner()){login();return;}
  root.innerHTML='<div class="eyebrow">Private workspace</div><h1>게시글 관리</h1><div class="toolbar"><button id="new">새 글 작성</button><button id="logout" class="secondary">로그아웃</button></div><p id="status" role="status"></p><div id="list">불러오는 중…</div>';
  document.querySelector("#logout").onclick=logout;
  document.querySelector("#new").onclick=()=>edit();
  try{
   const rows=await request(listQuery(false),{auth:true});
   document.querySelector("#list").innerHTML=(rows.length?rows.map(r=>'<div class="post-row"><div><h2>'+esc(r.title)+'</h2><span class="muted">'+date(r.created_at)+' · '+(r.published?"공개":"비공개")+'</span></div><button class="secondary" data-edit="'+esc(r.id)+'">수정</button></div>').join(""):'<p class="muted">등록된 게시글이 없습니다.</p>')+paging(rows);
   root.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(rows.find(r=>String(r.id)===b.dataset.edit)));
   controls(rows,dashboard);
  }catch(e){document.querySelector("#list").textContent="목록을 불러오지 못했습니다.";status(e.message,true);}
 }
 function edit(post={}){
  let images=[...(post.images||[])];
  if(!owner()){login();return;}
  root.innerHTML='<div class="eyebrow">Editor</div><h1>'+(post.id?"게시글 수정":"새 글 작성")+'</h1><form id="editor" class="editor"><label for="title">제목</label><input name="title" id="title" required maxlength="200" value="'+esc(post.title)+'"><label for="content">본문</label><textarea name="content" id="content" required>'+esc(post.content)+'</textarea><label for="summary">짧은 요약</label><input id="summary" name="summary" maxlength="500" value="'+esc(post.summary)+'"><label for="photos">사진 추가 (JPEG/PNG/WebP, 장당 5MB)</label><input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple><p class="muted">첫 사진이 대표 이미지입니다. 추가한 순서대로 본문 아래에 표시됩니다.</p><div id="image-list"></div><label for="published">공개 설정</label><select name="published" id="published"><option value="false">비공개 초안</option><option value="true">공개</option></select><div class="toolbar"><button type="submit">저장</button><button type="button" id="cancel" class="secondary">목록으로</button>'+(post.id?'<button type="button" id="delete" class="danger">삭제</button>':'')+'<button type="button" id="logout" class="secondary">로그아웃</button></div></form><p id="status" role="status"></p>';
  function renderImages(){
   document.querySelector("#image-list").innerHTML=images.map((path,i)=>'<div class="post-row"><span>사진 '+(i+1)+(i===0?' · 대표 이미지':'')+'</span><button type="button" class="secondary" data-remove="'+i+'">제외</button></div>').join("");
   root.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{images.splice(Number(b.dataset.remove),1);dirty=true;renderImages();});
  }
  renderImages();
  document.querySelector("#published").value=String(!!post.published);
  document.querySelector("#logout").onclick=logout;
  document.querySelector("#editor").oninput=()=>dirty=true;
  document.querySelector("#cancel").onclick=()=>{if(dirty&&!confirm("저장하지 않은 내용을 버릴까요?"))return;dirty=false;run(dashboard);};
  document.querySelector("#editor").onsubmit=e=>{e.preventDefault();run(async()=>{
   const fd=new FormData(e.target),data={title:fd.get("title").trim(),content:fd.get("content"),published:fd.get("published")==="true",summary:fd.get("summary")||""};
   if(!data.title)throw new Error("제목을 입력해 주세요.");
   const files=Array.from(document.querySelector("#photos").files||[]);
   if(images.length+files.length>12)throw new Error("사진은 글당 최대 12장입니다.");
   for(const file of files){if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw new Error("JPEG/PNG/WebP 사진을 장당 5MB 이하로 선택해 주세요.");}
   for(const file of files){
    const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
    const path=cfg.owner+"/"+crypto.randomUUID()+"."+ext;
    const result=await fetch(cfg.url+"/storage/v1/object/post-images/"+path,{method:"POST",headers:{apikey:cfg.key,Authorization:"Bearer "+session.access_token,"Content-Type":file.type},body:file});
    if(!result.ok){document.querySelector("#photos").value="";renderImages();throw new Error("사진 업로드 실패. 완료된 사진은 유지됩니다. 나머지 사진을 다시 선택하세요.");}
    images.push(path);
   }
   document.querySelector("#photos").value="";renderImages();data.images=images;
   const rows=await request("/rest/v1/posts"+(post.id?"?id=eq."+encodeURIComponent(post.id):""),{method:post.id?"PATCH":"POST",data,auth:true});
   if(!rows?.length)throw new Error("저장되지 않았습니다. 관리자 권한을 확인해 주세요.");
   dirty=false;await dashboard();status("저장했습니다.");
  });};
  if(post.id)document.querySelector("#delete").onclick=()=>{if(!confirm("이 게시글을 영구 삭제할까요?"))return;run(async()=>{
   const rows=await request("/rest/v1/posts?id=eq."+encodeURIComponent(post.id),{method:"DELETE",auth:true});
   if(!rows?.length)throw new Error("삭제되지 않았습니다. 관리자 권한을 확인해 주세요.");
   dirty=false;await dashboard();status("삭제했습니다.");
  });};
 }
 function date(value){const d=new Date(value);return Number.isNaN(d.getTime())?"":esc(d.toLocaleDateString("ko-KR"));}
 async function blog(){
  root.innerHTML='<div class="eyebrow">Personal notes</div><h1>Blog</h1><p id="status" role="status">불러오는 중…</p><div id="list"></div>';
  try{
   const rows=await request(listQuery(true));
   document.querySelector("#list").innerHTML=(rows.length?rows.map(r=>'<article class="public-post"><span class="muted">'+date(r.created_at)+'</span><h2>'+esc(r.title)+'</h2><div class="prose">'+esc(r.content)+'</div></article>').join(""):'<p class="muted">아직 공개된 글이 없습니다.</p>')+paging(rows);
   status("");controls(rows,blog);
  }catch(e){status(e.message,true);}
 }
 window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
 document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&dirty&&!confirm("저장하지 않은 내용을 버리고 이동할까요?"))e.preventDefault();});
 if(admin)login();else blog();
})();
