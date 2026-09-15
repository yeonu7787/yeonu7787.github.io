"use strict";
window.BlogAuth=(()=>{
 const cfg=window.SUPABASE_CONFIG,key="yeonu.auth.v1";
 let current=null,pending=null;
 function save(s){current=s;try{if(s)sessionStorage.setItem(key,JSON.stringify(s));else sessionStorage.removeItem(key);}catch{if(s)throw new Error("로그인 유지에 필요한 브라우저 저장소를 사용할 수 없습니다.");}}
 async function json(path,options){
  const res=await fetch(cfg.url+"/auth/v1/"+path,options);
  if(!res.ok){if(res.status===400||res.status===401||res.status===403)save(null);throw new Error("로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.");}
  return res.status===204?null:res.json();
 }
 async function restore(){
  if(pending)return pending;
  pending=(async()=>{
   if(!current){try{current=JSON.parse(sessionStorage.getItem(key)||"null");}catch{save(null);}}
   if(!current)return null;
   if(!current.expires_at||current.expires_at*1000<Date.now()+60000){
    if(!current.refresh_token){save(null);return null;}
    save(await json("token?grant_type=refresh_token",{method:"POST",headers:{apikey:cfg.key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:current.refresh_token})}));
   }
   const user=await json("user",{headers:{apikey:cfg.key,Authorization:"Bearer "+current.access_token}});
   if(!user.id){save(null);return null;}
   current.user=user;save(current);return current;
  })();
  try{return await pending;}finally{pending=null;}
 }
 async function logout(){
  const old=current;save(null);
  if(old){try{await json("logout",{method:"POST",headers:{apikey:cfg.key,Authorization:"Bearer "+old.access_token}});}catch{}}
 }
 async function menu(){
  const nav=document.querySelector("nav");if(!nav)return;
  let container=document.querySelector("#account-nav");
  if(!container){container=document.createElement("span");container.id="account-nav";container.className="account-nav";nav.append(container);}
  try{
   const s=await restore();
   container.innerHTML=s?'<a href="/account/">내 정보</a><button id="global-logout" class="secondary">로그아웃</button>':'<a href="/account/">로그인</a>';
   if(s)document.querySelector("#global-logout").onclick=async()=>{
    if(window.blogDirty&&!confirm("저장하지 않은 내용을 버리고 로그아웃할까요?"))return;
    window.blogDirty=false;await logout();location.assign("/");
   };
  }catch{container.innerHTML='<a href="/account/">로그인 확인</a>';}
 }
 async function tools(el,html){
  if(!el)return;
  try{const s=await restore();if(el.isConnected!==false)el.innerHTML=s?.user.id===cfg.owner?html:"";}catch{el.innerHTML="";}
 }
 return {save,restore,logout,menu,tools};
})();
window.BlogAuth.menu();
window.addEventListener("pageshow",event=>{if(event.persisted)location.reload();});
