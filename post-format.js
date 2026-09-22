"use strict";
window.PostFormat=(()=>{
 const marker="<!--yeonu-format-v1-->\n";
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const decode=s=>String(s||"").startsWith(marker)?{format:"markdown",text:s.slice(marker.length)}:{format:"plain",text:String(s||"")};
 const encode=(text,format)=>format==="markdown"?marker+text:text;
 function inline(text){
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g).map(part=>{
   if(part.startsWith('`')&&part.endsWith('`'))return '<code>'+esc(part.slice(1,-1))+'</code>';
   if(part.startsWith('**')&&part.endsWith('**'))return '<strong>'+esc(part.slice(2,-2))+'</strong>';
   const link=part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
   if(link&&/^https?:\/\//i.test(link[2]))return '<a href="'+esc(link[2])+'" target="_blank" rel="noopener noreferrer">'+esc(link[1])+'</a>';
   return esc(part);
  }).join('');
 }
 function render(content,images=[]){
  const data=decode(content),used=new Set();
  if(data.format==='plain')return {html:'<div class="prose">'+esc(data.text)+'</div>',remaining:images};
  const lines=data.text.split(/\r?\n/),out=[];
  for(let i=0;i<lines.length;i++){
   const line=lines[i];
   if(/^```/.test(line)){
    const code=[];while(++i<lines.length&&!/^```\s*$/.test(lines[i]))code.push(lines[i]);
    out.push('<pre><code>'+esc(code.join('\n'))+'</code></pre>');continue;
   }
   const photo=line.match(/^!\[([^\]]*)\]\(photo:([^\s)]+)\)$/);
   if(photo){let path;try{path=decodeURIComponent(photo[2]);}catch{}
    if(images.includes(path)){used.add(path);out.push('<figure data-photo="'+esc(path)+'" data-alt="'+esc(photo[1])+'"></figure>');}
    else out.push('<p class="muted">제외된 사진입니다.</p>');continue;
   }
   const heading=line.match(/^(#{1,3})\s+(.+)$/);
   if(heading){const n=heading[1].length+1;out.push('<h'+n+'>'+inline(heading[2])+'</h'+n+'>');}
   else if(line.trim())out.push('<p>'+inline(line)+'</p>');
   else out.push('<div class="paragraph-gap"></div>');
  }
  return {html:'<div class="formatted-post">'+out.join('')+'</div>',remaining:images.filter(path=>!used.has(path))};
 }
 function mount(form,images){
  const textarea=form.elements.namedItem('content'),original=decode(textarea.value);
  textarea.value=original.text;
  const panel=document.createElement('div');panel.className='format-panel';
  panel.innerHTML='<label for="content-format">본문 형식</label><select id="content-format" name="contentFormat"><option value="plain">일반 글 (기존 형식)</option><option value="markdown">서식 있는 글</option></select><div class="toolbar" aria-label="본문 서식"></div><p class="muted">서식 버튼은 본문에 표기를 넣습니다. 사진은 먼저 아래에서 업로드한 뒤 본문에 넣으세요.</p><details><summary>본문 미리보기</summary><div class="format-preview"></div></details>';
  textarea.before(panel);
  const mode=panel.querySelector('select');mode.value=original.format;
  const toolbar=panel.querySelector('.toolbar'),preview=panel.querySelector('.format-preview');
  function update(){
   preview.innerHTML=render(encode(textarea.value,mode.value),images).html;
   preview.querySelectorAll('[data-photo]').forEach(el=>{window.EditorKit.preview(el.dataset.photo).then(url=>{if(!el.isConnected)return;const img=document.createElement('img');img.src=url;img.alt=el.dataset.alt||'게시글 사진';el.replaceChildren(img);}).catch(()=>el.textContent='사진 미리보기 실패');});
  }
  function insert(before,after='',sample=''){
   const start=textarea.selectionStart,end=textarea.selectionEnd,selected=textarea.value.slice(start,end)||sample;
   textarea.setRangeText(before+selected+after,start,end,'end');mode.value='markdown';
   textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.focus();
  }
  for(const [label,action] of [
   ['소제목',()=>insert('\n## ','\n','소제목')],
   ['굵게',()=>insert('**','**','강조할 글')],
   ['링크',()=>insert('[','](https://example.com)','링크 이름')],
   ['코드',()=>insert('\n```\n','\n```\n','코드를 입력하세요')]
  ]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;button.onclick=action;toolbar.append(button);}
  const photoSelect=document.createElement('select');photoSelect.setAttribute('aria-label','본문에 넣을 사진');toolbar.append(photoSelect);
  const photoButton=document.createElement('button');photoButton.type='button';photoButton.className='secondary';photoButton.textContent='사진 넣기';
  photoButton.onclick=()=>{if(photoSelect.value)insert('\n![게시글 사진](photo:'+encodeURIComponent(photoSelect.value)+')\n');};toolbar.append(photoButton);
  function refresh(){photoSelect.replaceChildren();images.forEach((path,i)=>{const option=document.createElement('option');option.value=path;option.textContent='사진 '+(i+1);photoSelect.append(option);});photoButton.disabled=!images.length;if(panel.querySelector('details').open)update();}
  form.addEventListener('input',()=>{if(panel.querySelector('details').open)update();});
  panel.querySelector('details').addEventListener('toggle',()=>{if(panel.querySelector('details').open)update();});
  refresh();return {refresh,serialize:()=>encode(textarea.value,mode.value)};
 }
 return {decode,encode,render,mount};
})();
