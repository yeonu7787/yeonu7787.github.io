"use strict";
(() => {
 const cfg=window.SUPABASE_CONFIG, root=document.querySelector("#posts-app");
 const admin=root.dataset.mode==="admin";
 let session=null, dirty=false, busy=false, page=0;
 const auth=window.BlogAuth;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const owner=()=>session?.user?.id===cfg.owner;
 const status=(s,error=false)=>{const el=document.querySelector("#status");if(el){el.textContent=s;el.className=error?"notice error":"notice";}};
 async function request(path,{method="GET",data,auth=false,upsert=false}={}) {
  if(auth&&window.BlogAuth)session=await window.BlogAuth.restore();
  if(auth&&!owner())throw new Error("관리자 로그인이 필요합니다.");
  const headers={apikey:cfg.key,"Content-Type":"application/json"};
  if(auth)headers.Authorization="Bearer "+session.access_token;
  if(method!=="GET")headers.Prefer=upsert?"resolution=merge-duplicates,return=representation":"return=representation";
  let res;
  try{res=await fetch(cfg.url+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});}
  catch{throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");}
  const value=await res.json().catch(()=>null);
  if(!res.ok){
   if(value?.code==="PGRST204"||value?.code==="42703")throw new Error("게시글 저장 항목이 아직 설정되지 않았습니다. Supabase SQL Editor에서 supabase-media.sql과 supabase-extras.sql을 실행한 뒤 다시 저장해 주세요. 작성 중인 내용은 유지됩니다.");
   if(res.status===401||res.status===400&&path.includes("/auth/"))throw new Error("로그인 정보가 올바르지 않거나 세션이 만료되었습니다. 다시 로그인해 주세요.");
   if(res.status===403)throw new Error("접근 권한이 없습니다. Supabase의 관리자 권한 설정을 확인해 주세요.");
   throw new Error("요청 실패 ("+res.status+"). 테이블 구조와 권한 설정을 확인해 주세요.");
  }
  return value;
 }
 const listQuery=published=>"/rest/v1/posts?select=*&deleted_at=is.null"+(published?"&published=eq.true":"")+"&order=created_at.desc,id.desc&limit=20&offset="+(page*20);
 async function run(fn){if(busy)return;busy=true;root.querySelectorAll("button").forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message,true);}finally{busy=false;root.querySelectorAll("button").forEach(b=>b.disabled=false);}}
 function login(message=""){
  root.innerHTML='<div class="eyebrow">Private workspace</div><h1>관리자 로그인</h1><p class="muted">본인 계정으로 로그인해 주세요.</p><form id="login" class="editor"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required><div class="toolbar"><button type="submit">로그인</button></div></form><p id="status" role="status"></p>';
  status(message);
  document.querySelector("#login").onsubmit=e=>{e.preventDefault();run(async()=>{
   const fd=new FormData(e.target);
   const result=await request("/auth/v1/token?grant_type=password",{method:"POST",data:{email:fd.get("email"),password:fd.get("password")}});
   if(result.user?.id!==cfg.owner){session=null;document.querySelector("#password").value="";throw new Error("이 계정에는 관리자 권한이 없습니다.");}
   session=result;if(auth){auth.save(result);await auth.menu();}dirty=false;window.blogDirty=false;location.assign("/");
  });};
 }
 async function logout(){
  if(dirty&&!confirm("저장하지 않은 내용을 버리고 로그아웃할까요?"))return;
  await run(async()=>{
   let failed=false;
   try{await request("/auth/v1/logout",{method:"POST",auth:true});}catch{failed=true;}
   if(auth){await auth.logout();await auth.menu();}session=null;dirty=false;window.blogDirty=false;login(failed?"이 브라우저에서 로그아웃했습니다. 서버 세션 종료는 확인하지 못했습니다.":"로그아웃했습니다.");
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
  document.querySelector("#new").onclick=()=>location.assign("/write/");
  try{
   const rows=await request(listQuery(false),{auth:true});
   document.querySelector("#list").innerHTML=(rows.length?rows.map(r=>'<div class="post-row"><div><h2>'+esc(r.title)+'</h2><span class="muted">'+date(r.created_at)+' · '+(r.published?"공개":"비공개")+'</span></div><button class="secondary" data-edit="'+esc(r.id)+'">수정</button></div>').join(""):'<p class="muted">등록된 게시글이 없습니다.</p>')+paging(rows);
   root.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(rows.find(r=>String(r.id)===b.dataset.edit)));
   controls(rows,dashboard);
  }catch(e){document.querySelector("#list").textContent="목록을 불러오지 못했습니다.";status(e.message,true);}
 }
 function edit(post={}){
  let images=[...(post.images||[])],draft=null;
  if(!owner()){login();return;}
  root.innerHTML='<div class="eyebrow">Editor</div><h1>'+(post.id?"게시글 수정":"새 글 작성")+'</h1><form id="editor" class="editor"><label for="title">제목</label><input name="title" id="title" required maxlength="200" value="'+esc(post.title)+'"><label for="content">본문</label><textarea name="content" id="content" required>'+esc(post.content)+'</textarea><label for="category">카테고리</label><select name="category" id="category"><option>일상</option><option>공부</option><option>개발</option></select><label for="summary">짧은 요약</label><input id="summary" name="summary" maxlength="500" value="'+esc(post.summary)+'"><label for="photos">사진 추가 (JPEG/PNG/WebP, 장당 5MB)</label><input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple><p class="muted">첫 사진이 대표 이미지입니다. 추가한 순서대로 본문 아래에 표시됩니다.</p><div id="image-list"></div><label for="published">공개 설정</label><select name="published" id="published"><option value="false">비공개 초안</option><option value="true">공개</option></select><div class="toolbar"><button type="submit">저장</button><button type="button" id="cancel" class="secondary">목록으로</button>'+(post.id?'<button type="button" id="delete" class="danger">휴지통으로</button>':'')+'<button type="button" id="logout" class="secondary">로그아웃</button></div></form><p id="status" role="status"></p>';
  function renderImages(){
   if(window.EditorKit){window.EditorKit.thumbnails(document.querySelector("#image-list"),images,()=>{dirty=true;window.blogDirty=true;renderImages();draft?.save();});return;}
   document.querySelector("#image-list").innerHTML=images.map((path,i)=>'<div class="post-row"><span>사진 '+(i+1)+(i===0?' · 대표 이미지':'')+'</span><button type="button" class="secondary" data-remove="'+i+'">제외</button></div>').join("");
   root.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{images.splice(Number(b.dataset.remove),1);dirty=true;renderImages();});
  }
  renderImages();
  document.querySelector("#published").value=String(!!post.published);
  document.querySelector("#category").value=post.category||"일상";
  if(window.EditorKit)draft=window.EditorKit.draft(document.querySelector("#editor"),post,images,()=>{dirty=true;renderImages();});
  document.querySelector("#photos").onchange=()=>run(async()=>{
   const input=document.querySelector("#photos"),files=Array.from(input.files||[]);
   if(images.length+files.length>12){input.value="";throw new Error("사진은 최대 12장입니다.");}
   try{for(const file of files){images.push(await window.EditorKit.upload(file));dirty=true;window.blogDirty=true;renderImages();draft?.save();}}finally{input.value="";}
  });
  document.querySelector("#logout").onclick=logout;
  document.querySelector("#editor").oninput=()=>dirty=true;
  document.querySelector("#cancel").onclick=()=>{if(dirty&&!confirm("저장하지 않은 내용을 버릴까요?"))return;dirty=false;window.blogDirty=false;location.assign("/blog/");};
  document.querySelector("#editor").onsubmit=e=>{e.preventDefault();run(async()=>{
   const fd=new FormData(e.target),data={title:fd.get("title").trim(),content:fd.get("content"),published:fd.get("published")==="true",summary:fd.get("summary")||"",category:fd.get("category")||"일상"};
   if(!data.title)throw new Error("제목을 입력해 주세요.");
   if(auth)session=await auth.restore();
   if(!owner())throw new Error("관리자 로그인이 필요합니다.");
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
   draft?.clear();dirty=false;window.blogDirty=false;location.assign("/blog/?id="+encodeURIComponent(rows[0].id));
  });};
  if(post.id)document.querySelector("#delete").onclick=()=>{if(!confirm("이 게시글을 휴지통으로 이동할까요?"))return;run(async()=>{
   const rows=await request("/rest/v1/posts?id=eq."+encodeURIComponent(post.id),{method:"PATCH",data:{deleted_at:new Date().toISOString(),published:false},auth:true});
   if(!rows?.length)throw new Error("삭제되지 않았습니다. 관리자 권한을 확인해 주세요.");
   dirty=false;window.blogDirty=false;location.assign("/blog/");
  });};
 }
 async function editHome(){
  root.innerHTML='<h1>홈 편집</h1><p id="status" role="status">불러오는 중…</p>';
  try{
   const rows=await request("/rest/v1/site_profile?id=eq.home&select=data");
   const data=rows[0]?.data||window.PROFILE;
   const fields=[["name","이름"],["greeting","인사말"],["introduction","홈 소개"],["biography","자기소개"],["email","이메일"]];
   root.innerHTML='<div class="eyebrow">Home editor</div><h1>홈 편집</h1><form id="home-form" class="editor">'+fields.map(([key,label])=>'<label for="home-'+key+'">'+label+'</label><textarea id="home-'+key+'" name="'+key+'">'+esc(data[key]||"")+'</textarea>').join("")+'<label for="home-photo">프로필 사진 교체</label><input id="home-photo" type="file" accept="image/jpeg,image/png,image/webp"><img id="home-photo-preview" alt="선택한 프로필 사진" hidden style="max-width:150px"><h2>학력</h2><div id="education-fields"></div><button type="button" id="add-school" class="secondary">학력 추가</button><div class="toolbar"><button type="submit">홈에 저장</button><a class="text-link" href="/">홈으로</a></div></form><p id="status" role="status"></p>';
   let photoPreview=null;
   document.querySelector("#home-photo").onchange=e=>{if(photoPreview)URL.revokeObjectURL(photoPreview);const file=e.target.files[0],img=document.querySelector("#home-photo-preview");img.hidden=!file;if(file){photoPreview=URL.createObjectURL(file);img.src=photoPreview;dirty=true;window.blogDirty=true;}};
   const schools=[...(data.education||[])];
   const keys=[["school","학교명"],["department","학과"],["period","재학 기간"],["description","간단한 소개"]];
   const capture=()=>schools.forEach((row,i)=>keys.forEach(([key])=>row[key]=document.querySelector("#edu-"+i+"-"+key).value));
   function renderSchools(){
    document.querySelector("#education-fields").innerHTML=schools.map((row,i)=>'<fieldset><legend>학력 '+(i+1)+'</legend>'+keys.map(([key,label])=>'<label for="edu-'+i+'-'+key+'">'+label+'</label><input id="edu-'+i+'-'+key+'" value="'+esc(row[key]||"")+'">').join("")+'<button class="secondary" type="button" data-school="'+i+'">학력 삭제</button></fieldset>').join("");
    root.querySelectorAll("[data-school]").forEach(b=>b.onclick=()=>{capture();schools.splice(Number(b.dataset.school),1);dirty=true;window.blogDirty=true;renderSchools();});
   }
   renderSchools();
   document.querySelector("#add-school").onclick=()=>{capture();schools.push({});dirty=true;window.blogDirty=true;renderSchools();};
   document.querySelector("#home-form").oninput=()=>dirty=true;
   document.querySelector("#home-form").onsubmit=e=>{e.preventDefault();run(async()=>{
    capture();const fd=new FormData(e.target),updated={...data,education:schools};
    fields.forEach(([key])=>updated[key]=fd.get(key));
    if(!updated.name.trim())throw new Error("이름을 입력해 주세요.");
    const photo=document.querySelector("#home-photo").files?.[0];
    if(photo){const path=await window.EditorKit.upload(photo,"profile-images");updated.photo=cfg.url+"/storage/v1/object/public/profile-images/"+path;}
    const result=await request("/rest/v1/site_profile?on_conflict=id",{method:"POST",data:{id:"home",data:updated},auth:true,upsert:true});
    if(!result?.length)throw new Error("저장되지 않았습니다. 권한 설정을 확인해 주세요.");
    dirty=false;window.blogDirty=false;status("홈에 저장했습니다.");
   });};
  }catch(e){status(e.message+" 홈 편집용 SQL이 적용되었는지 확인해 주세요.",true);}
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
 async function trash(){
  root.innerHTML='<h1>휴지통</h1><p>최근 삭제한 글 100개를 표시합니다. 복원하면 비공개 글로 돌아갑니다.</p><a href="/blog/">Blog 목록으로</a><p id="status" role="status"></p><div id="trash-list"></div>';
  try{
   const rows=await request("/rest/v1/posts?select=id,title&deleted_at=not.is.null&order=deleted_at.desc&limit=100",{auth:true});
   document.querySelector("#trash-list").innerHTML=rows.length?rows.map(p=>'<div class="post-row"><span>'+esc(p.title)+'</span><button data-restore="'+esc(p.id)+'">복원</button></div>').join(""):'<p>휴지통이 비어 있습니다.</p>';
   root.querySelectorAll("[data-restore]").forEach(b=>b.onclick=()=>run(async()=>{const result=await request("/rest/v1/posts?id=eq."+encodeURIComponent(b.dataset.restore),{method:"PATCH",data:{deleted_at:null,published:false},auth:true});if(!result?.length)throw new Error("복원하지 못했습니다.");await trash();}));
  }catch(e){status(e.message,true);}
 }
 async function destination(){
  if(!owner()){login();return;}
  if(new URLSearchParams(location.search).get("view")==="trash"){await trash();return;}
  if(new URLSearchParams(location.search).get("view")==="home")await editHome();
  else if(location.pathname.startsWith("/write")){
   const id=new URLSearchParams(location.search).get("id");
   if(id){
    const rows=await request("/rest/v1/posts?select=*&deleted_at=is.null&id=eq."+encodeURIComponent(id)+"&limit=1",{auth:true});
    if(!rows.length){root.innerHTML='<h1>글을 찾을 수 없습니다.</h1><a href="/blog/">Blog 목록으로</a>';return;}
    edit(rows[0]);
   }else edit();
  }
  else await dashboard();
 }
 async function start(){
  if(!admin){blog();return;}
  try{session=auth?await auth.restore():null;await destination();}
  catch(e){login(e.message);}
 }
 root.addEventListener("input",()=>{window.blogDirty=true;});
 start();
})();
