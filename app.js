"use strict";
const main = document.querySelector("main");
const profile = window.PROFILE || {
  "name": "이연우",
  "greeting": "안녕하세요.",
  "introduction": "소프트웨어 공학과 26학번 이연우 입니다. 제 블로그에 방문해 주셔서 감사합니다.",
  "photo": "assets/profile.jpg",
  "photoAlt": "이연우 프로필 사진",
  "biography": "자기소개를 준비하고 있습니다.",
  "education": [],
  "experience": [],
  "interests": [],
  "email": ""
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#brand-name").textContent = profile.name;
document.querySelector("#footer-name").textContent = profile.name;
function portrait() {
 // Accept repository-local image paths only.
 const path = profile.photo || "";
 const remote=window.SUPABASE_CONFIG&&path.startsWith(window.SUPABASE_CONFIG.url+"/storage/v1/object/public/profile-images/");
 const safe = /^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp|avif)$/i.test(path);
 return '<figure class="portrait">'+(safe||remote?'<img id="portrait-image" src="'+esc(remote?path:"./"+path)+'" alt="'+esc(profile.photoAlt)+'" width="600" height="750">':'')+
 '<div class="photo-placeholder"'+(safe||remote?' hidden':'')+'><span class="photo-monogram">'+esc(profile.name.slice(0,1).toUpperCase())+'</span><span>사진 준비 중</span></div></figure>';
}
function timeline(title, rows) {
 return '<section class="cv-section"><h2>'+esc(title)+'</h2>'+(rows.length?'<div class="timeline">'+rows.map(r=>'<div class="cv-row"><span class="period">'+esc(r.period)+'</span><div><h3>'+esc(r.school||r.title)+'</h3><p class="prose">'+esc([r.department,r.description||r.detail].filter(Boolean).join("\n"))+'</p></div></div>').join("")+'</div>':'<p class="muted">아직 등록된 내용이 없습니다.</p>')+'</section>';
}
function contactLinks() {
 const email=String(profile.email || "").trim();
 return '<div class="contact-links"><a class="text-link" href="https://github.com/yeonu7787" target="_blank" rel="noopener noreferrer">GitHub · yeonu7787 <span aria-hidden="true">↗</span></a>'+
 (email?'<a class="text-link" href="mailto:'+esc(encodeURIComponent(email).replace(/%40/g,"@"))+'">'+esc(email)+'</a>':'')+'</div>';
}
function route() {
 const path=location.hash.slice(1).replace(/^\/+|\/+$/g,"") || "home";
 const name=path;
 const contact=document.querySelector("#profile-contact");
 if(contact)contact.innerHTML=contactLinks();
 document.querySelectorAll("nav a").forEach(a=>{if(a.hash==="#"+name)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
 document.title=(name==="home"?"홈":name==="about"?"소개 · 이력":"페이지 없음")+" · "+profile.name;
 if(name==="home"){
  main.innerHTML='<div id="home-tools" class="page-tools"></div><section class="home-layout"><div class="hero"><div class="eyebrow">소개</div><h1>'+esc(profile.greeting)+'</h1><div class="prose lead">'+esc(profile.introduction)+'</div><a class="text-link" href="#about">자기소개와 이력 보기 <span aria-hidden="true">↗</span></a></div>'+portrait()+'</section>';
  main.insertAdjacentHTML("beforeend",'<section class="home-section"><div class="eyebrow">Education</div><div class="section-heading"><h2>현재 학력</h2><a class="text-link" href="#about">전체 학력 보기</a></div>'+(profile.education.length?profile.education.slice(0,1).map(e=>'<div class="education-item"><span class="muted">'+esc(e.period)+'</span><h3>'+esc(e.school||e.title||"학교명 미입력")+'</h3><p>'+esc(e.department||"")+'</p><p class="prose">'+esc(e.description||e.detail||"")+'</p></div>').join(""):'<p class="muted">학력 정보를 준비하고 있습니다.</p>')+'</section><section class="home-section"><div class="section-heading"><h2>최신 글</h2><a class="text-link" href="./blog/">모든 글 보기</a></div><div id="recent-posts">불러오는 중…</div></section>');
  if(window.BlogView)window.BlogView.recent(document.querySelector("#recent-posts"));
  if(window.BlogAuth)window.BlogAuth.tools(document.querySelector("#home-tools"),'<a class="text-link" href="/admin/?view=home">홈 수정</a>');
  const img=document.querySelector("#portrait-image");
  if(img)img.addEventListener("error",()=>{img.hidden=true;document.querySelector(".photo-placeholder").hidden=false;},{once:true});
 }else if(name==="about"){
  main.innerHTML='<div class="eyebrow">About me</div><h1>소개 · 이력</h1><p class="prose biography">'+esc(profile.biography)+'</p>'+
  timeline("학력",profile.education)+timeline("경력 · 활동",profile.experience)+
  '<section class="cv-section"><h2>관심 분야</h2>'+(profile.interests.length?'<ul class="interests">'+profile.interests.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':'<p class="muted">관심 분야를 준비하고 있습니다.</p>')+'</section>'+
  '<section class="cv-section"><h2>연락처</h2>'+contactLinks()+'</section>';
 }else{
  main.innerHTML='<div class="eyebrow">404</div><h1>페이지를 찾을 수 없습니다.</h1><a class="text-link" href="#home">홈으로 이동</a>';
 }
}
document.addEventListener("click",e=>{
 if(e.target.closest("a.skip")){e.preventDefault();main.focus();main.scrollIntoView({block:"start"});}
});
window.addEventListener("hashchange",route);
route();

async function loadSavedHome(){
 try{
  const cfg=window.SUPABASE_CONFIG;if(!cfg)return;
  const res=await fetch(cfg.url+"/rest/v1/site_profile?id=eq.home&select=data",{headers:{apikey:cfg.key}});
  if(!res.ok)return;
  const rows=await res.json();if(!rows[0]?.data)return;
  Object.assign(profile,rows[0].data);
  document.querySelector("#brand-name").textContent=profile.name;
  document.querySelector("#footer-name").textContent=profile.name;
  route();
 }catch{}
}
loadSavedHome();
