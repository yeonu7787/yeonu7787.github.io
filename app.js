"use strict";
const main = document.querySelector("main");
const cfg = window.BLOG_CONFIG;
const configured = !!(cfg.url && cfg.key);
let session = null, role = null, dirty = false, generation = 0;
const defaults = {
 home: { title: "안녕하세요.\n이곳은 저의 기록 공간입니다.", body: "배우면서 떠오른 생각과 오래 기억하고 싶은 경험을\n천천히 모아갑니다.\n\n방문해 주셔서 감사합니다." },
 about: { title: "About / CV", body: "이력과 관심 분야를 준비하고 있습니다." }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.querySelector("#year").textContent = new Date().getFullYear();
async function api(path, options = {}) {
 const headers = {apikey:cfg.key,"Content-Type":"application/json",...options.headers};
 if(session) headers.Authorization = "Bearer " + session.access_token;
 const res = await fetch(cfg.url.replace(/\/$/,"") + path, {...options,headers});
 if(!res.ok) {
  if(res.status === 401) throw new Error("로그인이 만료되었거나 로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.");
  throw new Error("요청을 처리하지 못했습니다. 연결 설정과 계정 권한을 확인해 주세요. (" + res.status + ")");
 }
 return res.status === 204 ? null : res.json();
}
const rest = (query,options) => api("/rest/v1/"+query,options);
async function pageData(id) { if(!configured)return defaults[id]; const rows=await rest("pages?id=eq."+id+"&select=*");return rows[0]||defaults[id]; }
function setView(html) {main.innerHTML=html;dirty=false;}
function heading(tag,title,sub=""){return '<div class="eyebrow">'+esc(tag)+'</div><h1>'+esc(title)+'</h1><p class="intro">'+esc(sub)+'</p>';}
function status(message,error=false){const el=document.querySelector("#status");if(el){el.textContent=message;el.className="status"+(error?" error":"");}}
async function submit(form, action) {
 form.addEventListener("input",()=>dirty=true);
 form.addEventListener("submit", async event=>{
 event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;
 try{await action(new FormData(form));dirty=false;}catch(e){status(e.message,true);}finally{button.disabled=false;}
 });
}
async function route() {
 const stamp=++generation; const [name="home",id] = location.hash.slice(1).split("/");
 document.querySelectorAll("nav a").forEach(a=>{if(a.hash==="#"+name)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
 document.title=({home:"Home",about:"About / CV",projects:"Projects",blog:"Blog",admin:"관리자"}[name]||"글")+" · Yeonu";
 setView('<p role="status">불러오는 중…</p>');
 try {
 if(name==="admin"){await admin();return;}
 if(name==="home"||name==="about"){
  const data=await pageData(name);if(stamp!==generation)return;
  if(name==="home")setView('<section class="hero"><div class="eyebrow">A personal space for thoughts & notes</div><h1>'+esc(data.title)+'</h1><div class="prose">'+esc(data.body)+'</div><div class="small-rule"></div><p class="hero-note">배우고, 생각하고, 기록합니다.</p></section>');
  else setView(heading("Profile",data.title)+"<article class='prose'>"+esc(data.body)+"</article>");
 }else if(name==="blog"||name==="projects"){
  const kind=name==="blog"?"post":"project";
  const rows=configured?await rest("entries?kind=eq."+kind+"&published=eq.true&select=*&order=created_at.desc"):[];
  if(stamp!==generation)return;
  setView(heading(name==="blog"?"Journal":"Selected work",name==="blog"?"Blog":"Projects",name==="blog"?"공부하며 남긴 기록과 일상의 생각들.":"관심을 기울이고, 직접 해 본 일들.")+
  (rows.length?rows.map(r=>'<a class="entry" href="#entry/'+r.id+'"><div class="meta">'+esc(new Date(r.created_at).toLocaleDateString("ko-KR"))+'</div><h2>'+esc(r.title)+'</h2><p>'+esc(r.summary)+'</p></a>').join(""):'<p class="empty">'+(name==="blog"?"아직 공개된 글이 없습니다.":"아직 공개된 프로젝트가 없습니다.")+'</p>'));
 }else if(name==="entry"&&/^[\da-f-]{36}$/i.test(id||"")){
  const rows=configured?await rest("entries?id=eq."+id+"&published=eq.true&select=*"):[];
  if(stamp!==generation)return;const r=rows[0];if(!r)throw new Error("공개된 글을 찾을 수 없습니다.");
  setView('<article><a class="back" href="#'+(r.kind==="post"?"blog":"projects")+'">← 목록으로</a><div class="meta">'+esc(new Date(r.created_at).toLocaleDateString("ko-KR"))+'</div><h1>'+esc(r.title)+'</h1><div class="prose">'+esc(r.body)+'</div></article>');
 }else setView(heading("404","페이지를 찾을 수 없습니다.")+'<a class="button" href="#home">홈으로</a>');
 }catch(e){if(stamp===generation)setView('<div class="notice error" role="alert">'+esc(e.message)+'</div><a href="#home">홈으로</a>');}
}
async function admin(){
 if(!configured){setView(heading("Private workspace","관리자")+ '<div class="notice">관리자 연결을 준비 중입니다. 로그인과 저장 서비스가 연결되면 이곳에서 내용을 편집할 수 있습니다.</div>');return;}
 if(!session){
 setView(heading("Private workspace","관리자 로그인","등록된 계정으로 로그인해 주세요.")+'<form id="login"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required><div class="toolbar"><button type="submit">로그인</button></div><p id="status" role="status"></p></form>');
 submit(document.querySelector("form"),async fd=>{
 const result=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify(Object.fromEntries(fd))});
 session=result;await admin();
 });return;
 }
 const roles=await rest("blog_roles?user_id=eq."+session.user.id+"&select=role");role=roles[0]?.role;
 setView(heading("Private workspace","콘텐츠 관리",role==="owner"?"최고 관리자":role==="author"?"작성자":"편집 권한이 없는 계정입니다.")+
 '<div class="toolbar">'+(role==="owner"?'<button id="home-edit">인사말 편집</button><button id="about-edit">이력 편집</button><button id="members" class="secondary">작성자 권한</button>':'')+(role?'<button id="new">새 글 / 프로젝트</button>':'')+'<button id="logout" class="secondary">로그아웃</button></div><div id="workspace"></div><p id="status" role="status"></p>');
 document.querySelector("#logout").onclick=async()=>{if(dirty&&!confirm("저장하지 않은 내용을 버릴까요?"))return;try{await api("/auth/v1/logout",{method:"POST"});}catch{}session=null;role=null;dirty=false;await admin();};
 if(!role)return;
 if(role==="owner"){
 document.querySelector("#home-edit").onclick=()=>safeAction(()=>editPage("home"));
 document.querySelector("#about-edit").onclick=()=>safeAction(()=>editPage("about"));
 document.querySelector("#members").onclick=()=>safeAction(members);
 }
 document.querySelector("#new").onclick=()=>safeAction(()=>editEntry());
 const rows=await rest("entries?select=*&order=created_at.desc");
 document.querySelector("#workspace").innerHTML=rows.length?rows.map(r=>'<div class="admin-row"><div><strong>'+esc(r.title)+'</strong><p class="meta">'+(r.published?"공개":"비공개 초안")+' · '+(r.kind==="post"?"블로그":"프로젝트")+'</p></div><button class="secondary" data-edit="'+r.id+'">편집</button></div>').join(""):'<p class="empty">첫 글을 작성해 보세요.</p>';
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>safeAction(()=>editEntry(rows.find(r=>r.id===b.dataset.edit))));
}
async function safeAction(fn){if(dirty&&!confirm("저장하지 않은 내용을 버릴까요?"))return;dirty=false;try{await fn();}catch(e){status(e.message,true);}}
function editor(html){document.querySelector("#workspace").innerHTML='<div class="panel">'+html+'</div>';status("");}
async function editPage(id){
 const p=await pageData(id);
 editor('<h2>'+(id==="home"?"인사말":"이력")+' 편집</h2><form><label for="title">제목</label><textarea id="title" name="title" required maxlength="200">'+esc(p.title)+'</textarea><label for="body">내용</label><textarea id="body" name="body" required>'+esc(p.body)+'</textarea><div class="toolbar"><button type="submit">저장</button></div></form>');
 submit(document.querySelector("#workspace form"),async fd=>{
 const rows=await rest("pages?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({id,...Object.fromEntries(fd)})});
 if(!rows?.length)throw new Error("저장 권한이 없습니다.");status("저장했습니다. 공개 페이지에 반영되었습니다.");
 });
}
function editEntry(r={}){
 editor('<h2>'+(r.id?"내용 편집":"새 기록")+'</h2><form><label for="kind">분류</label><select name="kind" id="kind"><option value="post">블로그</option><option value="project">프로젝트</option></select><label for="title">제목</label><input id="title" name="title" value="'+esc(r.title)+'" required maxlength="200"><label for="summary">짧은 소개</label><input id="summary" name="summary" value="'+esc(r.summary)+'" maxlength="500"><label for="body">본문</label><textarea id="body" name="body" required>'+esc(r.body)+'</textarea><label for="published">공개 상태</label><select id="published" name="published"><option value="false">비공개 초안</option><option value="true">공개</option></select><div class="toolbar"><button type="submit">저장</button>'+(r.id?'<button type="button" id="delete" class="secondary">삭제</button>':'')+'</div></form>');
 document.querySelector("#kind").value=r.kind||"post";document.querySelector("#published").value=String(!!r.published);
 submit(document.querySelector("#workspace form"),async fd=>{
 const data={...Object.fromEntries(fd),published:fd.get("published")==="true"};
 if(!r.id)data.author_id=session.user.id;
 const rows=await rest("entries"+(r.id?"?id=eq."+r.id:""),{method:r.id?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(data)});
 if(!rows?.length)throw new Error("저장 권한이 없습니다.");
 dirty=false;await admin();status("저장했습니다.");
 });
 if(r.id)document.querySelector("#delete").onclick=async()=>{
 if(!confirm("이 기록을 영구 삭제할까요?"))return;
 try{const rows=await rest("entries?id=eq."+r.id,{method:"DELETE",headers:{Prefer:"return=representation"}});if(!rows?.length)throw new Error("삭제 권한이 없습니다.");dirty=false;await admin();status("삭제했습니다.");}catch(e){status(e.message,true);}
 };
}
async function members(){
 const rows=await rest("blog_roles?select=*");
 editor('<h2>작성자 권한</h2><p>등록된 사용자의 ID로 작성 권한을 부여합니다. 작성자는 자신의 글만 관리할 수 있습니다.</p><form><label for="uid">사용자 ID</label><input id="uid" name="user_id" required pattern="[0-9a-fA-F-]{36}" placeholder="등록된 계정의 UUID"><button type="submit">작성자 추가</button></form>'+rows.map(r=>'<div class="admin-row"><span>'+esc(r.user_id)+'<br><small>'+esc(r.role)+'</small></span>'+(r.role==="author"?'<button class="secondary" data-revoke="'+r.user_id+'">권한 회수</button>':'')+'</div>').join(""));
 submit(document.querySelector("#workspace form"),async fd=>{await rest("blog_roles",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({user_id:fd.get("user_id"),role:"author"})});await members();status("작성자 권한을 부여했습니다.");});
 document.querySelectorAll("[data-revoke]").forEach(b=>b.onclick=async()=>{if(!confirm("이 사용자의 작성 권한을 회수할까요?"))return;try{await rest("blog_roles?user_id=eq."+b.dataset.revoke,{method:"DELETE"});await members();status("권한을 회수했습니다.");}catch(e){status(e.message,true);}});
}
document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&dirty&&a.hash!==location.hash&&!confirm("저장하지 않은 내용을 버리고 이동할까요?"))e.preventDefault();});
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
window.addEventListener("hashchange",route);
route();
