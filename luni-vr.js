/* Luni's Thing - WebXR add-on (Meta Quest). Load AFTER the main script.
   Every open window, the desktop, taskbar, start menu, right-click menu and toasts become floating 3D panels.
   Pointing + trigger sends real mouse events to the real page, so all apps work. */
(()=>{
if(typeof wins==='undefined'||typeof win!=='function')return;
const V=Object.assign({env:'galaxy',size:'1',dist:'1.6',light:'0.5'},store.get('vrset',{}));
const OPT={env:['Environment',[['galaxy','Galaxy'],['space','Starfield'],['lounge','Lounge'],['void','Void']]],size:['Window size',[['0.8','Small'],['1','Normal'],['1.3','Large'],['1.7','Huge']]],dist:['Window distance',[['1.2','Close'],['1.6','Normal'],['2.2','Far']]],light:['Room lights',[['0.15','Dark'],['0.5','Dim'],['1','Bright']]]};
const lab=k=>(OPT[k][1].find(o=>o[0]===String(V[k]))||['',''])[1];
const cyc=k=>{const o=OPT[k][1],i=o.findIndex(x=>x[0]===String(V[k]));V[k]=o[(i+1)%o.length][0];store.set('vrset',V)};
const PR='display,position,top,left,right,bottom,width,height,min-width,min-height,max-width,max-height,margin-top,margin-right,margin-bottom,margin-left,padding-top,padding-right,padding-bottom,padding-left,box-sizing,border-top-width,border-right-width,border-bottom-width,border-left-width,border-top-style,border-right-style,border-bottom-style,border-left-style,border-top-color,border-right-color,border-bottom-color,border-left-color,border-radius,background-color,background-image,background-size,background-position,background-repeat,color,font-family,font-size,font-weight,font-style,line-height,letter-spacing,text-align,text-decoration,text-overflow,text-transform,white-space,word-break,overflow-wrap,flex-direction,flex-wrap,flex-grow,flex-shrink,flex-basis,align-items,align-self,align-content,justify-content,gap,order,grid-template-columns,grid-template-rows,grid-auto-rows,grid-auto-flow,grid-column-start,grid-column-end,grid-row-start,grid-row-end,opacity,box-shadow,visibility,vertical-align,object-fit,float,list-style-type,transform'.split(',');
const SL=[0,-34,34,-68,68,-102,102,-136,136].map(d=>d*Math.PI/180);
let rd,scene,cam,envG,spin,session=null,home=null,uiOn=true,kb,grab=null,mo,ctxA=null,busy=false,lastPump=0,fr=0,envKey='',layKey='',FONT='',taint=false,RC,TM;
const P=new Map(),ctrls=[],IC=new Map(),hp=()=>new THREE.Vector3();
const btn=$('#vrbtn');

/* ---------- loading ---------- */
const loadThree=()=>new Promise((ok,no)=>{if(window.THREE)return ok();const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=ok;s.onerror=()=>no(new Error('three.js failed to load'));document.head.appendChild(s)});
async function loadFont(){try{const l=document.querySelector('link[href*="fonts.googleapis.com"]');if(!l)return;let css=await(await fetch(l.href)).text();css=css.split('/* ').filter(b=>/^latin \*\//.test(b)).map(b=>'/* '+b).join('')||css;
 for(const u of new Set(css.match(/https:\/\/fonts\.gstatic\.com[^)'"]+/g)||[])){const b=await(await fetch(u)).blob(),d=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});css=css.split(u).join(d)}FONT=css}catch{}}
if(navigator.xr){loadThree().catch(()=>{});loadFont()}

/* ---------- settings window (works flat and in VR) ---------- */
function setWin(){win('vrset','VR Settings','🥽',b=>{const draw=()=>b.replaceChildren(
 h('p',{},'Press 🥽 VR on a Meta Quest (Quest Browser, https) to enter. On other devices it uses the flat 3D mode.'),
 ...Object.keys(OPT).map(k=>h('div',{className:'bar'},h('span',{style:'flex:1'},OPT[k][0]),h('button',{on:{click:()=>{cyc(k);draw()}}},lab(k)))),
 h('p',{},'Trigger: click (on a title bar: drag the window)'),h('p',{},'Grip: grab any panel, stick up/down pushes it away or pulls it closer'),
 h('p',{},'Stick: scroll the pointed panel, press stick: recenter everything'),h('p',{},'A/X: hide or show windows. B/Y: right-click'),h('p',{},'Tap a text box to get the VR keyboard'));draw()},400,460)}
const sbt=h('button',{id:'vrset',title:'VR settings',on:{click:setWin}},'⚙');btn.after(sbt);

/* ---------- enter / exit ---------- */
async function enter(){
 if(session){session.end();return}
 let ok=false;try{ok=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')}catch{}
 if(!ok){toast('No WebXR headset here - using flat 3D mode');VRS.on?vrOff():vrOn();return}
 try{await loadThree()}catch(e){toast(e.message);return}
 if(VRS.on)vrOff();
 init();
 try{session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor','hand-tracking']})}catch(e){toast('Could not start VR: '+e.message);return}
 session.addEventListener('end',()=>{session=null;rd.setAnimationLoop(null);mo.disconnect();[...P.keys()].forEach(drop);kbHide();grab=null;btn.textContent='🥽 VR'});
 rd.xr.setFramebufferScaleFactor(1.3);if(rd.xr.setFoveation)rd.xr.setFoveation(0);
 await rd.xr.setSession(session);
 btn.textContent='🥽 Exit VR';home=null;fr=0;uiOn=true;envKey='';layKey='';
 mo.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
 sync();rd.setAnimationLoop(frame)}
btn.onclick=enter;

function init(){
 if(rd)return;
 rd=new THREE.WebGLRenderer({antialias:true});rd.xr.enabled=true;rd.xr.setReferenceSpaceType('local-floor');rd.outputEncoding=THREE.sRGBEncoding;
 scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(70,1,.1,200);envG=new THREE.Group();scene.add(envG);
 RC=new THREE.Raycaster();TM=new THREE.Matrix4();
 kb={kind:'kb',on:false,sym:0,caps:0,hv:'',rg:[],dirty:1};kb.cv=document.createElement('canvas');kb.cv.width=1024;kb.cv.height=420;kb.cx=kb.cv.getContext('2d');
 kb.tex=new THREE.CanvasTexture(kb.cv);kb.tex.encoding=THREE.sRGBEncoding;kb.tex.minFilter=THREE.LinearFilter;kb.tex.generateMipmaps=false;
 kb.mesh=new THREE.Mesh(new THREE.PlaneGeometry(.8,.8*420/1024),new THREE.MeshBasicMaterial({map:kb.tex,transparent:true,toneMapped:false}));kb.mesh.visible=false;kb.mesh.userData.p=kb;scene.add(kb.mesh);
 for(let i=0;i<2;i++){
  const c=rd.xr.getController(i);
  c.addEventListener('connected',e=>{c.userData.src=e.data});c.addEventListener('disconnected',()=>{c.userData.src=null});
  c.addEventListener('selectstart',()=>{const it=pick(c);if(!it)return;if(it.p===kb){kbPress(it.x,it.y);return}
   const t=tgt(it);if(t.closest('.tb')&&!t.closest('button'))grab0(c,it);else press(it,0,c)});
  c.addEventListener('squeezestart',()=>{const it=pick(c);if(it&&it.p!==kb)grab0(c,it)});
  const end=()=>{if(grab&&grab.c===c)grab=null};c.addEventListener('selectend',end);c.addEventListener('squeezeend',end);
  const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0x6ff2c5}));
  c.add(ln);c.userData.line=ln;scene.add(c);ctrls.push(c)}
 mo=new MutationObserver(ms=>{const s=new Set(ms.map(m=>m.target));for(const p of P.values())for(const n of s)if(p.el.contains(n)){p.dirty=true;break}});
 const mk=e=>{for(const p of P.values())if(p.el.contains(e.target))p.dirty=true;if(kb.on)kb.dirty=1};
 addEventListener('input',mk,true);addEventListener('scroll',mk,true);addEventListener('change',mk,true)}

/* ---------- DOM -> texture ---------- */
const PH='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#7d73a8"/></svg>');
function imc(o){const c=document.createElement('img'),k=o.currentSrc||o.src||'';
 if(!IC.has(k)){const cp=im=>{const s=Math.min(1,160/Math.max(im.naturalWidth||1,im.naturalHeight||1)),cv=document.createElement('canvas');cv.width=Math.max(1,(im.naturalWidth*s)|0);cv.height=Math.max(1,(im.naturalHeight*s)|0);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);return cv.toDataURL('image/png')};
  if(k.startsWith('data:'))IC.set(k,k);else{try{IC.set(k,cp(o))}catch{IC.set(k,PH);const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{try{IC.set(k,cp(im));P.forEach(p=>p.dirty=true)}catch{}};im.src=k}}}
 c.src=IC.get(k);return c}
const SKIP=/^(SCRIPT|STYLE|NOSCRIPT|AUDIO|SOURCE|TEMPLATE)$/;
function cl(o,top,W,H){
 if(o.nodeType===3)return o.cloneNode();
 if(o.nodeType!==1||SKIP.test(o.tagName))return null;
 const cs=getComputedStyle(o);if(cs.display==='none')return null;
 const T=o.tagName;let c;
 if(T==='IMG')c=imc(o);
 else if(T==='CANVAS'){c=document.createElement('img');try{c.src=o.toDataURL()}catch{}}
 else if(T==='VIDEO'||T==='IFRAME'){c=document.createElement('div');if(T==='IFRAME')c.textContent='[embedded app - open it in the flat browser]'}
 else c=o.cloneNode(false);
 let st=PR.map(p=>p+':'+cs.getPropertyValue(p)).join(';');
 if(top)st+=`;position:relative;left:0;top:0;right:auto;bottom:auto;margin:0;transform:none;width:${W}px;height:${H}px;max-width:none;max-height:none`;
 if(o===document.activeElement)st+=';outline:2px solid #6ff2c5';
 c.setAttribute('style',st);
 if(T==='INPUT'){c.setAttribute('value',o.value);o.checked?c.setAttribute('checked',''):c.removeAttribute('checked')}
 else if(T==='TEXTAREA')c.textContent=o.value;else if(T==='OPTION'&&o.selected)c.setAttribute('selected','');
 if(T==='IMG'||T==='CANVAS'||T==='VIDEO'||T==='IFRAME'||T==='INPUT'||T==='TEXTAREA')return c;
 if(/hidden|auto|scroll/.test(cs.overflowX+cs.overflowY))c.style.overflow='hidden';
 let k=c;const sx=o.scrollLeft,sy=o.scrollTop;if(sx||sy){k=document.createElement('div');k.style.cssText=`position:relative;transform:translate(${-sx}px,${-sy}px)`;c.append(k)}
 for(const n of o.childNodes){const x=cl(n);if(x)k.append(x)}
 return c}
function fit(p,W,H,sc){const cw=Math.max(1,W*sc|0),ch=Math.max(1,H*sc|0);
 if(p.cw!==cw||p.ch!==ch){p.cw=cw;p.ch=ch;p.base=document.createElement('canvas');p.base.width=cw;p.base.height=ch;p.bc=p.base.getContext('2d');
  p.cv=document.createElement('canvas');p.cv.width=cw;p.cv.height=ch;p.cx=p.cv.getContext('2d');if(p.tex)p.tex.dispose();
  p.tex=new THREE.CanvasTexture(p.cv);p.tex.encoding=THREE.sRGBEncoding;p.tex.minFilter=THREE.LinearFilter;p.tex.generateMipmaps=false;p.tex.anisotropy=rd.capabilities.getMaxAnisotropy();p.mesh.material.map=p.tex;p.mesh.material.needsUpdate=true}
 p.W=W;p.H=H;p.sc=sc}
async function snap(p){
 const el=p.el,W=Math.max(1,el.offsetWidth),H=Math.max(1,el.offsetHeight),sc=Math.max(1,Math.min(1100*scl(p),3072/Math.max(W,H),3));
 const x=new XMLSerializer().serializeToString(cl(el,1,W,H)).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W*sc|0}" height="${H*sc|0}" viewBox="0 0 ${W} ${H}"><foreignObject width="${W}" height="${H}"><style xmlns="http://www.w3.org/1999/xhtml">${FONT}</style>${x}</foreignObject></svg>`;
 const im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=()=>no(new Error('render'));im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
 const first=!p.base;fit(p,W,H,sc);p.bc.clearRect(0,0,p.cw,p.ch);p.bc.drawImage(im,0,0,p.cw,p.ch);
 try{p.bc.getImageData(0,0,1,1)}catch{if(!taint){taint=true;toast('Browser blocked VR rendering (tainted canvas)')}}
 p.vid=!!el.querySelector('video');p.err=0;comp(p);if(first)place(p)}
function comp(p){const c=p.cx;c.clearRect(0,0,p.cw,p.ch);c.drawImage(p.base,0,0);
 if(p.vid){const o=p.el.getBoundingClientRect();for(const v of p.el.querySelectorAll('video')){if(!v.videoWidth)continue;const r=v.getBoundingClientRect(),s=Math.min(r.width/v.videoWidth,r.height/v.videoHeight),w=v.videoWidth*s,hh=v.videoHeight*s;try{c.drawImage(v,(r.left-o.left+(r.width-w)/2)*p.sc,(r.top-o.top+(r.height-hh)/2)*p.sc,w*p.sc,hh*p.sc)}catch{}}}
 const s=p.kind==='win'?p.el.querySelector('.body'):p.el;
 if(s&&s.scrollHeight>s.clientHeight+4){const o=p.el.getBoundingClientRect(),r=s.getBoundingClientRect(),hh=r.height*p.sc;c.fillStyle='rgba(255,79,163,.9)';c.fillRect((r.right-o.left-6)*p.sc,(r.top-o.top)*p.sc+hh*s.scrollTop/s.scrollHeight,5*p.sc,Math.max(24,hh*s.clientHeight/s.scrollHeight))}
 p.tex.needsUpdate=true}
function pump(now){if(busy||now-lastPump<70)return;let b=null;
 for(const p of P.values())if((p.dirty||!p.base)&&now-p.t>120&&(!b||p.t<b.t))b=p;
 if(!b)return;busy=true;lastPump=now;b.t=now;b.dirty=false;
 snap(b).catch(e=>{console.warn('VR panel',b.id,e);b.t=now+2500}).finally(()=>busy=false)}

/* ---------- panels ---------- */
const bs=()=>.0018*(+V.size);
function scl(p){const b=bs();return p.kind==='desk'?b*2.1:p.kind==='tb'?Math.min(b,1.7/p.W):(p.kind==='menu'||p.kind==='ctx')?(P.get('tb')||{kk:b}).kk:b}
function place(p){if(!home||!p.mesh)return;const k=p.kind,m=p.mesh;let yaw=home.yaw,d=+V.dist,y=home.y-.05,tilt=0;
 if(k==='win'){yaw+=SL[p.slot%SL.length];d+=.04*p.slot}else if(k==='desk'){d*=2.1;y=home.y+.35}
 else if(k==='tb'){d=1.15;y=home.y-.62;tilt=-.55}else if(k==='toast'){d=1.4;y=home.y+.55}else if(k==='ann'){d=1.4;y=home.y+.8}else return;
 m.position.set(home.x-Math.sin(yaw)*d,y,home.z-Math.cos(yaw)*d);m.rotation.set(tilt,yaw,0,'YXZ')}
function add(id,el,kind){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,toneMapped:false,side:THREE.DoubleSide})),p={id,el,kind,mesh:m,dirty:true,t:0,W:1,H:1,kk:bs()};
 if(kind==='win'){const used=new Set([...P.values()].filter(x=>x.kind==='win').map(x=>x.slot));let s=0;while(used.has(s))s++;p.slot=s}
 m.visible=false;m.userData.p=p;scene.add(m);P.set(id,p);place(p)}
function drop(id){const p=P.get(id);if(!p)return;scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();p.tex&&p.tex.dispose();P.delete(id);if(grab&&grab.p===p)grab=null;if(id==='ctx')ctxA=null}
function sync(){
 const w=[];for(const id in wins){const e=wins[id].el;if(!e.classList.contains('hide'))w.push([id,e,'win'])}
 w.push(['desk',$('#desk'),'desk'],['tb',$('#tb'),'tb']);
 [['menu',e=>e.classList.contains('on')],['ctx',e=>e.classList.contains('on')],['toast',e=>e.style.display==='block'],['ann',e=>e.style.display&&e.style.display!=='none']].forEach(([k,f])=>{const e=$('#'+k);if(e&&f(e))w.push([k,e,k])});
 const ids=new Set(w.map(x=>x[0]));
 for(const [id,p] of [...P])if(!ids.has(id)||w.find(x=>x[0]===id)[1]!==p.el)drop(id);
 for(const [id,e,k] of w)if(!P.has(id))add(id,e,k)}
function recenter(){const x=rd.xr.getCamera(cam),p=hp(),q=new THREE.Quaternion();x.matrixWorld.decompose(p,q,hp());const f=new THREE.Vector3(0,0,-1).applyQuaternion(q);
 home={x:p.x,z:p.z,y:p.y>.5?p.y:1.5,yaw:Math.atan2(-f.x,-f.z)};P.forEach(place);if(kb.on)kbPlace()}

/* ---------- interaction ---------- */
function ray(c){TM.identity().extractRotation(c.matrixWorld);RC.ray.origin.setFromMatrixPosition(c.matrixWorld);RC.ray.direction.set(0,0,-1).applyMatrix4(TM)}
function pick(c){ray(c);const ms=[];P.forEach(p=>p.mesh.visible&&ms.push(p.mesh));if(kb.on)ms.push(kb.mesh);
 const h0=RC.intersectObjects(ms,false)[0];if(!h0)return null;const p=h0.object.userData.p,k=p===kb;
 return{p,d:h0.distance,pt:h0.point,x:h0.uv.x*(k?1024:p.W),y:(1-h0.uv.y)*(k?420:p.H)}}
function tgt(it){const p=it.p,r=p.el.getBoundingClientRect();return document.elementsFromPoint(r.left+it.x,r.top+it.y).find(e=>p.el.contains(e))||p.el}
const edit=a=>!!a&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|file|color|range|image|reset)$/.test(a.type)))&&!a.readOnly&&!a.disabled;
function press(it,right,c){
 const p=it.p,r=p.el.getBoundingClientRect(),X=r.left+it.x,Y=r.top+it.y,t=tgt(it);
 const o={bubbles:true,cancelable:true,clientX:X,clientY:Y,view:window,button:right?2:0,buttons:right?2:1,pointerType:'mouse',pointerId:1,isPrimary:true};
 const ev=(C,n)=>t.dispatchEvent(new C(n,o));
 try{(c?c.userData.src:null).gamepad.hapticActuators[0].pulse(.4,25)}catch{}
 if(right){ctxA={pt:it.pt.clone(),q:p.mesh.quaternion.clone()};ev(MouseEvent,'contextmenu')}
 else{
  const a=t.closest('a[href]');if(a&&a.target==='_blank'){toast('Links open in a new tab - not available in VR');return}
  const ed=t.closest('input,textarea,select');
  if(!t.closest('.tb')){ev(PointerEvent,'pointerdown');ev(MouseEvent,'mousedown')}
  if(ed&&ed.tagName==='SELECT'&&!ed.disabled){ed.selectedIndex=(ed.selectedIndex+1)%ed.options.length;ed.dispatchEvent(new Event('input',{bubbles:true}));ed.dispatchEvent(new Event('change',{bubbles:true}))}
  else if(edit(ed)){ed.focus({preventScroll:true});try{ed.setSelectionRange(ed.value.length,ed.value.length)}catch{}kbShow()}
  else{const ae=document.activeElement;if(edit(ae))ae.blur();kbHide()}
  ev(PointerEvent,'pointerup');ev(MouseEvent,'mouseup');ev(MouseEvent,'click')}
 p.dirty=true;setTimeout(()=>P.forEach(x=>x.dirty=true),300)}
function grab0(c,it){grab={c,p:it.p,d:it.d,off:it.p.mesh.position.clone().sub(it.pt)}}
function scrollAt(it,dy){for(let e=tgt(it);e&&e!==document.body;e=e.parentElement){if(/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight){e.scrollTop+=dy;it.p.dirty=true;return}}}

/* ---------- VR keyboard ---------- */
const KL=[['1234567890⌫','qwertyuiop','asdfghjkl↵','⇧zxcvbnm.,'],['1234567890⌫','-/:;()$&@"','_=+[]{}<>↵','⇧#%*!?\'~,.']];
function rr(c,x,y,w,hh,r,f){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+hh,r);c.arcTo(x+w,y+hh,x,y+hh,r);c.arcTo(x,y+hh,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();c.fillStyle=f;c.fill()}
function typ(k){const a=document.activeElement;if(!edit(a))return;const fire=(t,d)=>a.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:t,data:d}));
 const ins=s=>{if(a.maxLength>0&&a.value.length>=a.maxLength)return;try{a.setRangeText(s,a.selectionStart,a.selectionEnd,'end')}catch{a.value+=s}fire('insertText',s)};
 if(k==='⌫'){try{let s=a.selectionStart;const e=a.selectionEnd;if(s===e&&s>0)s--;a.setRangeText('',s,e,'end')}catch{a.value=a.value.slice(0,-1)}fire('deleteContentBackward',null)}
 else if(k==='↵'){['keydown','keypress','keyup'].forEach(t=>a.dispatchEvent(new KeyboardEvent(t,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true})));if(a.tagName==='TEXTAREA')ins('\n')}
 else ins(k);
 P.forEach(p=>p.el.contains(a)&&(p.dirty=true));kb.dirty=1}
function kbDraw(){const c=kb.cx,a=document.activeElement;kb.rg=[];c.clearRect(0,0,1024,420);rr(c,0,0,1024,420,30,'rgba(12,14,34,.96)');
 const v=edit(a)?(a.type==='password'?'•'.repeat(a.value.length):a.value):'';
 c.font='600 28px monospace';c.textAlign='left';c.textBaseline='middle';c.fillStyle=v?'#6ff2c5':'#8a84b0';c.fillText((v.slice(-50)||(a&&a.placeholder)||'')+(v?'|':''),24,32);
 const B=(id,x,y,w,hh,l,fn)=>{kb.rg.push({id,x,y,w,h:hh,fn});rr(c,x,y,w,hh,12,kb.hv===id?'rgba(255,79,163,.85)':id==='⇧'&&kb.caps?'rgba(111,242,197,.6)':'rgba(255,255,255,.14)');c.fillStyle='#fff';c.textAlign='center';c.font='600 30px monospace';c.fillText(l,x+w/2,y+hh/2)};
 KL[kb.sym].forEach((r,i)=>{const ks=[...r],w=84,g=8,x0=(1024-(ks.length*(w+g)-g))/2;ks.forEach((k,j)=>{const l=kb.caps&&/[a-z]/.test(k)?k.toUpperCase():k;
  B(k+i,x0+j*(w+g),62+i*72,w,64,l,()=>{if(k==='⇧')kb.caps=!kb.caps;else{typ(k==='⌫'||k==='↵'?k:l);kb.caps=0}})})});
 B('sym',24,350,170,60,kb.sym?'abc':'123',()=>{kb.sym^=1});B('sp',204,350,610,60,'space',()=>typ(' '));B('done',824,350,176,60,'Done',()=>{const a2=document.activeElement;if(edit(a2))a2.blur();kbHide()});
 kb.tex.needsUpdate=true;kb.dirty=0}
const kbAt=(x,y)=>kb.rg.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
function kbPress(x,y){const r=kbAt(x,y);if(r){r.fn();try{ctrls[0].userData.src.gamepad.hapticActuators[0].pulse(.3,15)}catch{}kb.dirty=1}}
function kbPlace(){const x=rd.xr.getCamera(cam),p=hp(),q=new THREE.Quaternion();x.matrixWorld.decompose(p,q,hp());const f=new THREE.Vector3(0,0,-1).applyQuaternion(q);f.y=0;if(f.lengthSq()<1e-4)f.set(0,0,-1);f.normalize();
 kb.mesh.position.set(p.x+f.x*.6,(p.y>.5?p.y:home?home.y:1.5)-.5,p.z+f.z*.6);kb.mesh.rotation.set(-.8,Math.atan2(-f.x,-f.z),0,'YXZ')}
function kbShow(){if(!kb.on){kb.on=true;kb.mesh.visible=true;kbPlace()}kb.dirty=1}
function kbHide(){if(!kb)return;kb.on=false;kb.mesh.visible=false}

/* ---------- environments ---------- */
function clr(){spin=null;for(const o of [...envG.children]){envG.remove(o);o.traverse(m=>{if(m.geometry)m.geometry.dispose();if(m.material&&m.material.dispose)m.material.dispose()})}}
function env(){
 clr();const e=V.env,L=+V.light,AB=THREE.AdditiveBlending,rnd=Math.random;
 const St=(c,x)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9,side:THREE.DoubleSide},x));
 const add2=(g,m,x,y,z,rx)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;envG.add(o);return o};
 envG.add(new THREE.AmbientLight(0xffffff,L));const pl=new THREE.PointLight(0xaabbff,.8,80);pl.position.set(0,2.5,-1);envG.add(pl);
 scene.background=new THREE.Color(e==='space'?0x01010a:0x000004);
 const stars=(n,r,sz)=>{const a=new Float32Array(n*3);for(let i=0;i<n*3;i+=3){const u=rnd()*2-1,t=rnd()*6.283,s=Math.sqrt(1-u*u);a[i]=s*Math.cos(t)*r;a[i+1]=u*r;a[i+2]=s*Math.sin(t)*r}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));envG.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:sz,sizeAttenuation:false})))};
 const platform=()=>{add2(new THREE.RingGeometry(1.6,1.75,64),new THREE.MeshBasicMaterial({color:0x6ff2c5,side:THREE.DoubleSide}),0,.01,0,-Math.PI/2);add2(new THREE.CircleGeometry(1.75,64),new THREE.MeshBasicMaterial({color:0x0a0f24,transparent:true,opacity:.6,side:THREE.DoubleSide}),0,.005,0,-Math.PI/2)};
 if(e==='galaxy'){stars(2500,95,1.7);
  const N=9000,gp=new Float32Array(N*3),gc=new Float32Array(N*3),col=new THREE.Color();
  for(let i=0;i<N;i++){const r=Math.pow(rnd(),.65)*60,a=r*.1+(i%3)*2.094+(rnd()-.5)*.6;gp.set([Math.cos(a)*r+(rnd()-.5)*3,(rnd()-.5)*2.5*(1-r/70),Math.sin(a)*r+(rnd()-.5)*3],i*3);col.setHSL(.1+.5*r/60,.8,.6+.3*(1-r/60));col.toArray(gc,i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(gp,3));g.setAttribute('color',new THREE.BufferAttribute(gc,3));
  const gh=new THREE.Group();gh.position.set(-10,28,-85);gh.rotation.set(.45,0,.25);gh.add(new THREE.Points(g,new THREE.PointsMaterial({size:2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.85,blending:AB,depthWrite:false})));envG.add(gh);spin=gh;
  add2(new THREE.SphereGeometry(9,40,28),St(0x3a6ea5),-32,-6,-48);add2(new THREE.SphereGeometry(2.6,24,18),St(0xc2603a),26,10,-34);
  const dl=new THREE.DirectionalLight(0xfff0d0,1.2);dl.position.set(45,16,-30);envG.add(dl);platform();return}
 if(e==='space'||e==='void'){platform();if(e==='void')envG.add(new THREE.GridHelper(60,60,0x445577,0x1a2233));
  else{stars(3000,90,1.6);add2(new THREE.SphereGeometry(18,32,24),St(0x2a4a8a),-45,-8,-70);const s=new THREE.DirectionalLight(0xffffff,.9);s.position.set(30,20,10);envG.add(s)}return}
 const W=14,D=14,H=4.2,wc=0x6b5646;scene.background=new THREE.Color(0x120c08);
 add2(new THREE.PlaneGeometry(W,D),St(0x5a3d28),0,0,0,-Math.PI/2);add2(new THREE.PlaneGeometry(W,D),St(wc),0,H,0,Math.PI/2);
 [[0,H/2,-D/2,0],[0,H/2,D/2,0],[-W/2,H/2,0,Math.PI/2],[W/2,H/2,0,Math.PI/2]].forEach(a=>{const o=add2(new THREE.PlaneGeometry(a[3]?D:W,H),St(wc),a[0],a[1],a[2]);o.rotation.y=a[3]});
 add2(new THREE.BoxGeometry(2.4,.5,.9),St(0x6a1020),0,.25,3.6);add2(new THREE.BoxGeometry(2.4,.6,.2),St(0x6a1020),0,.7,4.0);
 const lm=new THREE.MeshBasicMaterial({color:0xffd9a0});[-1,1].forEach(s=>{add2(new THREE.SphereGeometry(.25,16,12),lm,s*5,2,-4);const p=new THREE.PointLight(0xffc880,.6,14);p.position.set(s*5,2,-4);envG.add(p)})}

/* ---------- frame ---------- */
function frame(){
 const now=performance.now();fr++;
 if(!home&&fr>3)recenter();
 if(envKey!==V.env+V.light){envKey=V.env+V.light;env()}
 if(layKey!==V.size+V.dist){layKey=V.size+V.dist;P.forEach(p=>{place(p);p.dirty=true})}
 if(fr%15===1)sync();if(spin)spin.rotation.y+=.0006;
 const xc=rd.xr.getCamera(cam),head=hp().setFromMatrixPosition(xc.matrixWorld);
 for(const p of P.values()){if(now-p.t>2000&&!busy)p.dirty=true;p.kk=scl(p);p.mesh.scale.set(p.W*p.kk,p.H*p.kk,1);p.mesh.visible=uiOn&&!!p.cx;if(p.vid&&p.cx&&now-(p.vt||0)>60){comp(p);p.vt=now}}
 const tb=P.get('tb'),mn=P.get('menu'),cx=P.get('ctx');
 if(tb&&mn&&mn.cx){tb.mesh.updateMatrixWorld();mn.mesh.position.copy(tb.mesh.localToWorld(new THREE.Vector3((-tb.W/2+mn.W/2+4)/tb.W,(tb.H/2+mn.H/2+6)/tb.H,.015)));mn.mesh.quaternion.copy(tb.mesh.quaternion)}
 if(cx){cx.mesh.visible=uiOn&&!!cx.cx&&!!ctxA;if(ctxA){const s=cx.kk;cx.mesh.position.copy(ctxA.pt).add(new THREE.Vector3(cx.W/2*s,-cx.H/2*s,.03).applyQuaternion(ctxA.q));cx.mesh.quaternion.copy(ctxA.q)}}
 let kh='';
 for(const c of ctrls){const it=pick(c),u=c.userData;u.h=it;u.line.scale.z=it?it.d:2.5;if(it&&it.p===kb){const r=kbAt(it.x,it.y);if(r)kh=r.id}}
 if(kh!==kb.hv){kb.hv=kh;kb.dirty=1}
 if(grab){ray(grab.c);const pos=RC.ray.origin.clone().addScaledVector(RC.ray.direction,grab.d).add(grab.off);grab.p.mesh.position.copy(pos);grab.p.mesh.rotation.y=Math.atan2(head.x-pos.x,head.z-pos.z)}
 for(const c of ctrls){const u=c.userData,g=u.src&&u.src.gamepad;if(!g)continue;const b=g.buttons,bt=i=>!!(b[i]&&b[i].pressed),ay=g.axes[3]||0;
  if(bt(3)&&!u.b3)recenter();u.b3=bt(3);
  if(bt(4)&&!u.b4){uiOn=!uiOn;toast(uiOn?'Windows shown':'Windows hidden (A/X to show)')}u.b4=bt(4);
  if(bt(5)&&!u.b5&&u.h&&u.h.p!==kb)press(u.h,1,c);u.b5=bt(5);
  if(Math.abs(ay)>.15){if(grab&&grab.c===c)grab.d=Math.max(.5,Math.min(6,grab.d+ay*.03));else if(u.h&&u.h.p!==kb)scrollAt(u.h,ay*20)}}
 if(kb.on&&kb.dirty)kbDraw();
 pump(now);rd.render(scene,cam)}
})();
