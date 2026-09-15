"use strict";
window.EditorKit=(()=>{
 const cfg=window.SUPABASE_CONFIG;
 async function upload(file,bucket="post-images"){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880)throw new Error("JPEG/PNG/WebP 사진을 5MB 이하로 선택해 주세요.");
  const s=await window.BlogAuth.restore();if(!s)throw new Error("로그인이 필요합니다.");
  const path=cfg.owner+"/"+crypto.randomUUID()+"."+({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type]);
  const r=await fetch(cfg.url+"/storage/v1/object/"+bucket+"/"+path,{method:"POST",headers:{apikey:cfg.key,Authorization:"Bearer "+s.access_token,"Content-Type":file.type},body:file});
  if(!r.ok)throw new Error("사진 업로드 실패. 저장소 SQL과 로그인 상태를 확인해 주세요.");
  return path;
 }
 async function preview(path){
  const s=await window.BlogAuth.restore();if(!s)throw new Error("로그인이 필요합니다.");
  const r=await fetch(cfg.url+"/storage/v1/object/sign/post-images/"+path,{method:"POST",headers:{apikey:cfg.key,Authorization:"Bearer "+s.access_token,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:600})});
  if(!r.ok)throw new Error("사진을 불러올 수 없습니다.");
  return cfg.url+"/storage/v1"+(await r.json()).signedURL;
 }
 function draft(form,post,images,onRestore){
  const key="yeonu.draft."+cfg.owner+"."+(post.id||"new");
  const fields=["title","content","summary","published","category"];
  const note=document.createElement("p");note.className="muted";note.setAttribute("role","status");form.prepend(note);
  let stored;try{stored=JSON.parse(localStorage.getItem(key)||"null");}catch{}
  if(stored){
   const restore=document.createElement("button");restore.type="button";restore.className="secondary";restore.textContent="임시저장 복원";
   const discard=document.createElement("button");discard.type="button";discard.className="secondary";discard.textContent="임시저장 삭제";
   note.textContent="이 브라우저에 작성 중인 글이 있습니다. ";note.append(restore,discard);
   restore.onclick=()=>{fields.forEach(k=>{if(stored.fields[k]!==undefined&&form.elements.namedItem(k))form.elements.namedItem(k).value=stored.fields[k];});images.splice(0,images.length,...(stored.images||[]));window.blogDirty=true;onRestore();save();};
   discard.onclick=()=>{if(confirm("이 브라우저의 임시저장을 삭제할까요?")){localStorage.removeItem(key);note.textContent="임시저장을 삭제했습니다.";stored=null;}};
  }
  function save(){
   const values={};fields.forEach(k=>values[k]=form.elements.namedItem(k)?.value||"");
   try{localStorage.setItem(key,JSON.stringify({fields:values,images:[...images],savedAt:Date.now()}));note.textContent="이 브라우저에 자동 임시저장됨 · "+new Date().toLocaleTimeString("ko-KR");}
   catch{note.textContent="임시저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.";}
  }
  form.addEventListener("input",save);
  return {save,clear:()=>{try{localStorage.removeItem(key);}catch{}}};
 }
 async function thumbnails(container,images,changed){
  container.replaceChildren();
  let dragged=null;
  images.forEach((path,i)=>{
   const row=document.createElement("div");row.className="image-editor-row";row.draggable=true;
   const img=document.createElement("img");img.alt="사진 "+(i+1);row.append(img);
   preview(path).then(url=>img.src=url).catch(()=>img.alt="사진 미리보기 실패");
   const label=document.createElement("span");label.textContent="사진 "+(i+1)+(i===0?" · 대표":"");row.append(label);
   for(const [label,offset] of [["앞으로",-1],["뒤로",1],["제외",0]]){
    const b=document.createElement("button");b.type="button";b.className="secondary";b.textContent=label;
    b.disabled=offset!==0&&(i+offset<0||i+offset>=images.length);
    b.onclick=()=>{if(offset!==0&&(i+offset<0||i+offset>=images.length))return;if(offset===0)images.splice(i,1);else [images[i],images[i+offset]]=[images[i+offset],images[i]];changed();};row.append(b);
   }
   row.ondragstart=()=>{dragged=i;};row.ondragover=e=>e.preventDefault();
   row.ondrop=e=>{e.preventDefault();if(dragged===null)return;const [item]=images.splice(dragged,1);images.splice(i,0,item);dragged=null;changed();};
   container.append(row);
  });
 }
 return {upload,preview,draft,thumbnails};
})();
