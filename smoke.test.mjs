import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const content=readFileSync(new URL('./content.js',import.meta.url),'utf8');
function boot(hash, changes={}) {
 const nodes=Object.fromEntries(['main','#year','#brand-name','#footer-name','.photo-placeholder'].map(key=>[key,{innerHTML:'',insertAdjacentHTML(position,html){this.innerHTML+=html;},textContent:'',hidden:true,focus(){},scrollIntoView(){}}]));
 let imageError;
 nodes['#portrait-image']={hidden:false,addEventListener(event,fn){if(event==='error')imageError=fn;}};
 const events={};
 const context=vm.createContext({
 document:{querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],addEventListener(){}},
 window:{addEventListener:(event,fn)=>events[event]=fn},location:{hash},Date,
 fetch(){throw new Error('Static pages must not request a backend');}
 });
 vm.runInContext(content,context);Object.assign(context.window.PROFILE,changes);
 vm.runInContext(source,context);
 return {nodes,context,events,imageError};
}
for(const hash of ['','#','#/','#home','#/home','#home/'])assert.match(boot(hash).nodes.main.innerHTML,/안녕하세요/);
assert.match(boot('#about').nodes.main.innerHTML,/학력/);
for(const hash of ['#admin','#blog','#projects','#missing'])assert.match(boot(hash).nodes.main.innerHTML,/페이지를 찾을 수 없습니다/);
const app=boot('');app.context.location.hash='#about';app.events.hashchange();assert.match(app.nodes.main.innerHTML,/경력/);
app.context.location.hash='';app.events.hashchange();assert.match(app.nodes.main.innerHTML,/안녕하세요/);
const cv=boot('#about',{biography:'<script>alert(1)</script>',education:[{period:'2020',title:'학교',detail:'전공'}]});
assert.match(cv.nodes.main.innerHTML,/학교/);assert.match(cv.nodes.main.innerHTML,/&lt;script&gt;/);assert.ok(!cv.nodes.main.innerHTML.includes('<script>'));
const photo=boot('',{photo:'assets/profile.jpg'});assert.match(photo.nodes.main.innerHTML,/src=".\/assets\/profile.jpg"/);photo.imageError();assert.equal(photo.nodes['#portrait-image'].hidden,true);assert.equal(photo.nodes['.photo-placeholder'].hidden,false);
assert.ok(!boot('',{photo:'javascript:alert(1)'}).nodes.main.innerHTML.includes('<img'));
assert.ok(!source.includes('/auth/v1'));assert.ok(!source.includes('BLOG_CONFIG'));
console.log('PASS: root/navigation, static CV, removed routes, photo fallback, safe content');
