"use strict";
window.BlogView = (() => {
 const cfg=window.SUPABASE_CONFIG;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function get(query,session=null){
  const r=await fetch(cfg.url+"/rest/v1/posts?"+query+"&deleted_at=is.null",{headers:{apikey:cfg.key,...(session?{Authorization:"Bearer "+session.access_token}:{})}});
  if(!r.ok)throw new Error("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return r.json();
 }
 async function imageUrl(path,session=null){
  const r=await fetch(cfg.url+"/storage/v1/object/sign/post-images/"+path.split("/").map(encodeURIComponent).join("/"),{method:"POST",headers:{apikey:cfg.key,...(session?{Authorization:"Bearer "+session.access_token}:{}),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:60})});
  if(!r.ok)throw new Error("사진을 불러오지 못했습니다.");
  const data=await r.json();return cfg.url+"/storage/v1"+data.signedURL;
 }
 const date=v=>new Date(v).toLocaleDateString("ko-KR");
 function card(p){
  const path=p.images?.[0];
  return '<a class="post-card" href="/blog/?id='+encodeURIComponent(p.id)+'">'+(path?'<div class="card-photo" data-photo="'+esc(path)+'" aria-label="대표 이미지"></div>':'<div class="card-photo no-photo">NOTE</div>')+'<div class="card-copy"><span class="muted">'+esc(date(p.created_at))+'</span><h3>'+esc(p.title)+(p.published===false?' <small>비공개</small>':'')+'</h3><p>'+esc(p.summary||String(p.content||"").slice(0,120))+'</p></div></a>';
 }
 async function photos(container,session=null){
  await Promise.all(Array.from(container.querySelectorAll("[data-photo]")).map(async el=>{
   try{
    const url=await imageUrl(el.dataset.photo,session);
    const img=document.createElement("img");img.alt=el.dataset.alt||"게시글 사진";img.loading="lazy";img.src=url;
    img.onerror=()=>{el.textContent="사진을 불러오지 못했습니다.";};
    el.replaceChildren(img);
   }catch{el.textContent="사진을 불러오지 못했습니다.";}
  }));
 }
 async function recent(container){
  try{const rows=await get("select=*&published=eq.true&order=created_at.desc,id.desc&limit=3");
   container.innerHTML=rows.length?'<div class="post-grid">'+rows.map(card).join("")+'</div>':'<p class="muted">아직 공개된 글이 없습니다.</p>';await photos(container);
  }catch(e){container.textContent=e.message;}
 }
 async function listing(root){
  const params=new URLSearchParams(location.search),id=params.get("id");
  root.innerHTML='<p role="status">불러오는 중…</p>';
  try{
   const session=window.BlogAuth?await window.BlogAuth.restore().catch(()=>null):null;
   const filter=session?"":"&published=eq.true";
   if(id){
    const rows=await get("select=*"+filter+"&id=eq."+encodeURIComponent(id)+"&limit=1",session),p=rows[0];
    if(!p){root.innerHTML='<h1>글을 찾을 수 없습니다.</h1><a class="text-link" href="/blog/">Blog 목록으로</a>';return;}
    document.title=p.title+" · 이연우";
    root.innerHTML='<article class="post-detail">'+(session?'<div class="page-tools"><a class="text-link" href="/write/?id='+encodeURIComponent(p.id)+'">글 수정</a></div>':'')+'<a class="text-link" href="/blog/">← Blog 목록으로</a><p class="muted">'+esc(date(p.created_at))+'</p><h1>'+esc(p.title)+'</h1><div class="prose">'+esc(p.content)+'</div><div class="post-gallery">'+(p.images||[]).map(path=>'<figure data-photo="'+esc(path)+'"></figure>').join("")+'</div></article>';
   }else{
    const category=["일상","공부","개발"].includes(params.get("category"))?params.get("category"):"";
    const categoryQuery=category?"&category=eq."+encodeURIComponent(category):"";
    const page=Math.max(0,Math.floor(Number(params.get("page"))||0));
    const rows=await get("select=*"+filter+categoryQuery+"&order=created_at.desc,id.desc&limit=12&offset="+page*12,session);
    root.innerHTML='<div class="eyebrow">Personal notes</div><div class="section-heading"><h1>Blog</h1>'+(session?'<div><a class="text-link" href="/write/">새 글 작성</a> · <a href="/admin/?view=trash">휴지통</a></div>':'')+'</div><div class="category-links">'+['전체','일상','공부','개발'].map(c=>'<a href="?category='+encodeURIComponent(c==='전체'?'':c)+'"'+((category||'전체')===c?' aria-current="page"':'')+'>'+c+'</a>').join('')+'</div>'+(rows.length?'<div class="post-grid">'+rows.map(card).join("")+'</div>':'<p>아직 공개된 글이 없습니다.</p>')+
    '<div class="toolbar">'+(page?'<a class="text-link" href="?category='+encodeURIComponent(category)+'&page='+(page-1)+'">이전</a>':'')+(rows.length===12?'<a class="text-link" href="?category='+encodeURIComponent(category)+'&page='+(page+1)+'">다음</a>':'')+'</div>';
   }
   await photos(root,session);
  }catch(e){root.innerHTML='<p role="alert">'+esc(e.message)+'</p><a href="/blog/">Blog 목록으로</a>';}
 }
 return {recent,listing,card,imageUrl};
})();
const publicRoot=document.querySelector('[data-mode="blog"]');
if(publicRoot)window.BlogView.listing(publicRoot);
