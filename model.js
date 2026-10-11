'use strict';
const $=s=>document.querySelector(s), stage=$('#stage');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e9ede5');
const camera=new THREE.PerspectiveCamera(38,1,.05,200);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){$('#error').style.display='block';$('#error').textContent='This model needs WebGL. Please open it in a current Chrome, Edge or Safari browser.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;stage.prepend(renderer.domElement);
let renderNeeded=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;const controls=new OrbitControls(camera,renderer.domElement);controls.addEventListener('change',()=>renderNeeded=true);controls.enableDamping=true;controls.enableZoom=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI/2-.02;controls.minDistance=4;controls.maxDistance=65;
scene.add(new THREE.HemisphereLight(0xffffff,0x899385,1.8));const sun=new THREE.DirectionalLight(0xffefdc,2.3);sun.position.set(-10,25,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);scene.add(sun.target);scene.add(new THREE.AmbientLight(0xfff6e8,.65));
const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.82,...extra});
function surfaceTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
 c.fillStyle={wall:'#e7ddce',floor:'#e6dfd1',concrete:'#c7c7bd',wood:'#dbc5aa'}[kind];c.fillRect(0,0,256,256);
 let seed=kind.length*7919;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<3200;i++){const x=random()*256,y=random()*256,r=.35+random()*1.1;c.fillStyle=kind==='wood'?'#715c4530':'#675f4e0c';c.fillRect(x,y,r,r);}
 if(kind==='floor'){c.strokeStyle='#acafa68c';c.lineWidth=2;for(let v=0;v<=256;v+=64){c.beginPath();c.moveTo(v,0);c.lineTo(v,256);c.moveTo(0,v);c.lineTo(256,v);c.stroke();}}
 if(kind==='wood'){for(let i=0;i<30;i++){c.strokeStyle=i%3?'#8f6a4635':'#fff3dc55';c.lineWidth=.5+random()*2;const x=random()*256;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+random()*8,70,x-random()*8,180,x+random()*5,256);c.stroke();}}
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const T={wall:surfaceTexture('wall'),floor:surfaceTexture('floor'),concrete:surfaceTexture('concrete'),wood:surfaceTexture('wood')};
const M={wall:mat('#e8d9c6',{map:T.wall}),edge:mat('#948f82'),stone:mat('#c9c9bf',{map:T.concrete}),wood:mat('#ae8157',{map:T.wood}),darkwood:mat('#765a43',{map:T.wood}),fabric:mat('#c8c9b1'),sage:mat('#8fa28e'),white:mat('#f7f5ec'),black:mat('#293d3a'),metal:mat('#73817c',{metalness:.55,roughness:.3}),glass:mat('#a9ccd0',{transparent:true,opacity:.36,roughness:.13,depthWrite:false}),water:mat('#73989c'),tile:mat('#d3d8d3',{map:T.floor}),car:mat('#617a78',{metalness:.25,roughness:.25}),leaves:mat('#68825b')};
const house=new THREE.Group();house.position.set(-3.735,0,-5.8);scene.add(house);
const floors=[],pickables=[],labels=[],doors=[];let selected='1',view='iso',highlight=null;
let layoutVariant=new URLSearchParams(location.search).get('layout')==='ensuite'?'ensuite':'original';
$('#layoutVariant').value=layoutVariant;
const player={x:5.65,z:6.25,y:4.1148,level:1,yaw:-Math.PI/2,pitch:0,followDistance:2.8,facing:Math.PI};const pressed=new Set();let dragLook=null,lastFrame=performance.now(),nearDoor=null,characterMixer=null,walkAction=null,idleAction=null,wasMoving=false;
const avatar=new THREE.Group();scene.add(avatar);const avatarMaterials=[];let cameraBoom=2.8;
const loader=new GLTFLoader();function installCharacter(gltf){const model=gltf.scene;const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());model.scale.setScalar(1.65/Math.max(size.y,.01));const scaled=new THREE.Box3().setFromObject(model);model.position.y=-scaled.min.y;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();o.material.transparent=true;avatarMaterials.push(o.material);}});avatar.add(model);if(gltf.animations?.length){characterMixer=new THREE.AnimationMixer(model);const walk=gltf.animations.find(a=>a.name==='walk'),idle=gltf.animations.find(a=>a.name==='idle');if(walk)walkAction=characterMixer.clipAction(walk);if(idle){idleAction=characterMixer.clipAction(idle);idleAction.play();}}renderNeeded=true;}
if(typeof CHARACTER_GLB_BASE64!=='undefined'){const raw=atob(CHARACTER_GLB_BASE64),buffer=new Uint8Array(raw.length);for(let j=0;j<raw.length;j++)buffer[j]=raw.charCodeAt(j);loader.parse(buffer.buffer,'',installCharacter,e=>console.error('Character could not load',e));}else loader.load('character.glb',installCharacter,undefined,e=>console.error('Character could not load',e));
const elevations=[.762,4.1148,7.4676,10.8204], H=3.1728,W=7.47,D=11.6,RISE=3.3528;
function box(g,x,y,z,w,h,d,m,shadow=true){const geometry=new THREE.BoxGeometry(w,h,d);if(m.map){const uv=geometry.attributes.uv,pos=geometry.attributes.position,norm=geometry.attributes.normal;for(let i=0;i<uv.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));uv.setXY(i,(nx>.5?pos.getZ(i):pos.getX(i))*.5,(ny>.5?pos.getZ(i):pos.getY(i))*.5);}}const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=shadow;mesh.receiveShadow=true;g.add(mesh);return mesh;}
function cylinder(g,x,y,z,r,h,m){const v=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),m);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;g.add(v);return v;}
function line(g,points,color='#73817c'){const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));g.add(mesh);return mesh;}
function label(f,text,dim,x,z){const el=document.createElement('div');el.className='label';el.innerHTML=text+(dim?'<small>'+dim+'</small>':'');$('#labels').append(el);labels.push({f,el,p:new THREE.Vector3(x,.16,z)});}
function room(f,name,dim,x1,z1,x2,z2,color){const m=mat(color,{map:name.includes('parking')||name.includes('staircase')?T.concrete:T.floor});const mesh=box(f.base,(x1+x2)/2,.017,(z1+z2)/2,x2-x1,.025,z2-z1,m,false);mesh.userData={name,dim,f};pickables.push(mesh);label(f,name,dim,(x1+x2)/2,(z1+z2)/2);return mesh;}
const signMaterials=new Map();
function signMaterial(name){if(signMaterials.has(name))return signMaterials.get(name);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5efe2';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#b59b78';ctx.lineWidth=7;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#26382f';ctx.font='bold 40px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name.toUpperCase().slice(0,19),256,64,470);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});signMaterials.set(name,material);return material;}
function wall(f,x1,z1,x2,z2,openings=[],height=H,material=M.wall){
 const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz),angle=Math.atan2(dz,dx),ux=dx/L,uz=dz/L;
 const group=new THREE.Group();group.position.set(x1,0,z1);group.rotation.y=-angle;f.walls.add(group);
 const gaps=openings.filter(o=>o[4]==='door'||o[4]==='open').sort((a,b)=>a[0]-b[0]);let solidFrom=0;
 for(const gap of gaps){if(gap[0]>solidFrom)f.colliders.push([x1+ux*solidFrom,z1+uz*solidFrom,x1+ux*gap[0],z1+uz*gap[0]]);solidFrom=Math.max(solidFrom,gap[1]);}
 if(solidFrom<L)f.colliders.push([x1+ux*solidFrom,z1+uz*solidFrom,x2,z2]);
 function piece(a,b,low,high){if(b-a>.001&&high-low>.001){box(group,(a+b)/2,(high+low)/2,0,b-a,high-low,.15,material);if(low===0&&high>1.05){const cap=box(f.wallCaps,x1+ux*(a+b)/2,1.055,z1+uz*(a+b)/2,b-a,.055,.18,M.edge,false);cap.rotation.y=-angle;}}}
 let end=0;for(const o of openings.sort((a,b)=>a[0]-b[0])){
  const[a,b,low,high,type,name='Door']=o;piece(end,a,0,height);piece(a,b,0,low);piece(a,b,high,height);
  if(type==='window'){box(group,(a+b)/2,low-.035,0,b-a+.12,.07,.25,M.stone,false);box(group,(a+b)/2,(low+high)/2,0,b-a,high-low,.045,M.glass,false);for(const pos of [a,b,(a+b)/2])box(group,pos,(low+high)/2,0,.035,high-low,.085,M.metal);for(const yy of [low,high])box(group,(a+b)/2,yy,0,b-a,.035,.085,M.metal);}
  if(type==='door'){
   const sliding=name==='Balcony'||name==='Open terrace',width=sliding?(b-a)/2:b-a,pivot=new THREE.Group(),leaf=new THREE.Group();pivot.position.set(x1+ux*a,0,z1+uz*a);pivot.rotation.y=-angle;pivot.add(leaf);f.doorGroup.add(pivot);
   if(sliding){
    function glazed(g,cx){box(g,cx,1.05,0,width,2.1,.035,M.glass,false);for(const x of [cx-width/2,cx+width/2])box(g,x,1.05,0,.045,2.1,.075,M.metal);for(const y of [.03,2.07])box(g,cx,y,0,width,.045,.075,M.metal);box(g,cx-width/2+.09,1.05,.07,.025,.28,.035,M.black);}
    glazed(leaf,width/2);const fixed=new THREE.Group();fixed.position.z=-.085;pivot.add(fixed);glazed(fixed,width*1.5);
    f.colliders.push([x1+ux*(a+width),z1+uz*(a+width),x1+ux*b,z1+uz*b]);
   }else{
    box(leaf,width/2,1.05,0,width,2.1,.055,M.darkwood);box(leaf,width/2,1.1,.032,width-.17,1.85,.018,M.wood,false);
    for(const y of [.45,1.15])box(leaf,width/2,y,.048,width-.27,.008,.014,M.darkwood,false);
    cylinder(leaf,width-.115,1.05,.072,.025,.07,M.metal);
   }
   for(const face of [-1,1]){const plaque=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width-.12,.65),.17),signMaterial(name));plaque.position.set(width/2,1.74,face*.049);plaque.rotation.y=face===1?0:Math.PI;leaf.add(plaque);}
   for(const edge of [a,b])box(group,edge,1.07,0,.055,2.14,.13,M.darkwood);
   const info={floor:f.i,name,pivot,leaf,sliding,width,slide:0,x1:x1+ux*a,z1:z1+uz*a,x2:x1+ux*(a+width),z2:z1+uz*(a+width),cx:x1+ux*(a+b)/2,cz:z1+uz*(a+b)/2,angle:0,target:0};doors.push(info);
  }
  end=b;
 }piece(end,L,0,height);return group;
}
const door=(a,b,name='Door')=>[a,b,0,2.15,'door',name],win=(a,b,lo=.95,hi=2.45)=>[a,b,lo,hi,'window'];
function obstacle(f,x,z,w,d,rot=0){const swap=Math.abs(Math.sin(rot))>.5;f.obstacles.push({x,z,rx:(swap?d:w)/2,rz:(swap?w:d)/2});}
function bed(f,x,z,w=1.65,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);obstacle(f,x,z,w,2.1,rot);box(g,0,.2,0,w,.3,2.1,M.darkwood);box(g,0,.43,0,w,.22,2,M.white);box(g,0,.57,.32,w+.02,.1,1.25,M.sage);box(g,0,.63,-.98,w+.1,1.15,.12,M.wood);for(const s of [-1,1]){box(g,s*w*.24,.59,-.66,w*.4,.16,.42,M.white);box(g,s*(w/2+.24),.25,-.7,.35,.5,.42,M.wood);cylinder(g,s*(w/2+.24),.59,-.7,.11,.16,M.white);} }
function sofa(f,x,z,w=2.1,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);obstacle(f,x,z,w,.86,rot);box(g,0,.22,0,w,.22,.82,M.darkwood);box(g,0,.42,.02,w-.12,.22,.78,M.fabric);box(g,0,.7,-.34,w,.65,.15,M.fabric);for(const s of [-1,1])box(g,s*(w/2-.06),.55,0,.13,.5,.86,M.fabric);for(let i=0;i<3;i++)box(g,(i-1)*w/3,.565,.03,w/3-.045,.04,.6,M.fabric);}
function table(f,x,z,w=1.2,d=.7,h=.42){obstacle(f,x,z,w,d);box(f.furniture,x,h,z,w,.08,d,M.wood);for(const a of [-1,1])for(const b of [-1,1])box(f.furniture,x+a*(w/2-.09),h/2,z+b*(d/2-.09),.045,h,.045,M.black);}
function rug(f,x,z,w,d){box(f.furniture,x,.045,z,w,.015,d,mat('#d9cdb7'),false);for(let j=0;j<6;j++)box(f.furniture,x,.056,z-d/2+.09+j*.045,w-.16,.005,.012,M.white,false);}
function chair(f,x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);box(g,0,.46,0,.42,.09,.44,M.fabric);box(g,0,.68,-.2,.44,.4,.05,M.wood);for(const a of [-1,1])for(const b of [-1,1])box(g,a*.16,.23,b*.16,.035,.46,.035,M.darkwood);}
function cabinet(f,x,z,w,d=.55){box(f.furniture,x,1.12,z,w,2.24,d,M.wood);for(let a=-w/2+.45;a<w/2;a+=.45){box(f.furniture,x+a,1.12,z+d/2+.003,.012,2.2,.012,M.darkwood);box(f.furniture,x+a-.055,1.15,z+d/2+.025,.02,.18,.025,M.metal);}}
function tv(f,x,z,w=1.5,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);box(g,0,.23,0,w+.25,.4,.3,M.wood);box(g,0,1.13,0,w,.83,.06,M.black);box(g,0,1.13,.036,w-.07,.75,.006,mat('#405453'));}
function plant(g,x,z){cylinder(g,x,.24,z,.19,.43,M.white);for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.23,10,8),M.leaves);leaf.scale.set(.65,1.7,.6);leaf.position.set(x+Math.sin(i*2)*.14,.64+(i%2)*.15,z+Math.cos(i*2)*.14);leaf.rotation.z=Math.sin(i*2)*.4;g.add(leaf);}}
function toilet(f,x,z){box(f.furniture,x,.47,z-.2,.42,.72,.18,M.white);const bowl=cylinder(f.furniture,x,.26,z+.1,.23,.36,M.white);bowl.scale.z=1.35;const seat=cylinder(f.furniture,x,.452,z+.1,.18,.015,M.tile);seat.scale.z=1.3;}
function basin(f,x,z){box(f.furniture,x,.72,z,.62,.12,.42,M.white);cylinder(f.furniture,x,.79,z,.15,.022,M.water);cylinder(f.furniture,x,.87,z-.14,.015,.21,M.metal);}
function bathroom(f,x1,z1,x2,z2,name='Toilet',dim=''){room(f,name,dim,x1,z1,x2,z2,'#cdd6d0');toilet(f,x1+.43,z1+.36);basin(f,x2-.5,z1+.26);box(f.furniture,(x1+x2)/2,1.04,z1+.1,.025,1.4,.04,M.metal);}
// The drawing has a street-side lobby stair on sheets 1–2 and a separate
// internal stair beside the dining/living area on sheets 2–4.
// Shared walkable surfaces: geometry and movement use the same footprints/heights.
const stairSurfaces=[];
function stairPatch(f,id,x1,z1,x2,z2,h1,h2,axis='x',steps=1){
 const patch={base:f.i,id,x1,z1,x2,z2,h1,h2,axis};stairSurfaces.push(patch);
 const span=axis==='x'?x2-x1:z2-z1;
 for(let j=0;j<steps;j++){
  const t=(j+.5)/steps,top=h1+(h2-h1)*t;
  // Thin treads preserve headroom beneath the next flight.
  const mesh=box(f.stairs,axis==='x'?x1+span*t:(x1+x2)/2,top-.075,axis==='z'?z1+span*t:(z1+z2)/2,axis==='x'?span/steps+.012:x2-x1,.15,axis==='z'?span/steps+.012:z2-z1,M.stone);
  mesh.userData.stair=true;
  const nosing=box(f.stairs,mesh.position.x,top+.006,mesh.position.z,axis==='x'?.024:x2-x1,.012,axis==='z'?.024:z2-z1,M.edge,false);
 }
}
function entranceStair(f){
 const half=RISE/2;
 stairPatch(f,'lobby',1.0,2.03,4.5,2.98,half,0,'x',11);
 stairPatch(f,'lobby',.3,.48,1.0,2.98,half,half);
 stairPatch(f,'lobby',1.0,.48,4.5,1.43,half,RISE,'x',11);
 stairPatch(f,'lobby',4.5,.48,4.72,1.43,RISE,RISE);
 stairRail(f,1.05,2.02,4.5,2.02,half,0);
 stairRail(f,1.05,1.44,4.5,1.44,half,RISE);
 stairCue(f,'UP → FIRST',4.98,2.51,0);stairCue(f,'DOWN → STILT',4.98,.95,RISE);
}
function interiorStair(f){
 const low=RISE*7/22,high=RISE*15/22;
 stairPatch(f,'internal',2.82,6.80,3.10,7.66,0,0);
 stairPatch(f,'internal',1.15,6.80,2.82,7.66,low,0,'x',7);
 stairPatch(f,'internal',.28,6.80,1.15,7.66,low,low);
 stairPatch(f,'internal',.28,4.20,1.15,6.80,high,low,'z',8);
 stairPatch(f,'internal',.28,3.45,1.15,4.20,high,high);
 stairPatch(f,'internal',1.15,3.45,2.82,4.20,high,RISE,'x',7);
 stairPatch(f,'internal',2.82,3.45,3.08,4.20,RISE,RISE);
 stairRail(f,1.16,6.79,2.82,6.79,low,0);
 stairRail(f,1.17,4.22,1.17,6.77,high,low);
 stairRail(f,1.16,4.21,2.82,4.21,high,RISE);
 stairCue(f,f.i===1?'UP → SECOND':'UP → TERRACE',3.32,7.24,0);stairCue(f,f.i===1?'DOWN → FIRST':'DOWN → SECOND',3.32,3.86,RISE);
}
function stairRail(f,x1,z1,x2,z2,y1,y2){
 const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/.5);
 for(let i=0;i<=n;i++){const t=i/n;box(f.stairs,x1+(x2-x1)*t,y1+(y2-y1)*t+.44,z1+(z2-z1)*t,.03,.88,.03,M.metal);}
 line(f.stairs,[[x1,y1+.89,z1],[x2,y2+.89,z2]],'#48645b');
}
function stairCue(f,text,x,z,y){
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.78,.2),signMaterial(text));plaque.rotation.x=-Math.PI/2;plaque.position.set(x,y+.045,z);f.stairs.add(plaque);
}
function stairCore(f){
 if(f.i<=1){
  if(f.i===0){room(f,'Lobby staircase','3′6″ wide flights',.2,.2,4.46,3.35,'#c5c8c0');entranceStair(f);}
  else label(f,'Lobby staircase','UP / DOWN',2.2,1.75);
 }
 if(f.i>=1){
  if(f.i===1){
   room(f,'Internal staircase','3′ wide flights',.2,6.62,2.56,7.86,'#c5c8c0');
   box(f.base,.72,.017,5.02,1.04,.025,3.2,mat('#c5c8c0'),false);
  }else label(f,'Internal staircase','UP / DOWN',1.4,5.65);
  if(f.i<=2)interiorStair(f);
  if(f.i>=2){stairRail(f,3.02,4.25,3.02,6.74,0,0);}
 }
}
function facade(f){
 // Openings transcribed separately from each revised sheet, not a shared facade.
 if(f.i===0){
  wall(f,.12,.12,7.35,.12);
  wall(f,.12,.12,.12,11.48,[win(.45,2.10),win(5.85,7.48),win(8.02,9.22)]);
  wall(f,7.35,.12,7.35,11.48,[[.30,2.98,0,H,'open'],[3.28,7.84,0,H,'open'],win(8.58,9.58)]);
  box(f.walls,7.35,H-.14,5.68,.22,.28,4.56,M.stone);
  wall(f,.12,11.48,7.35,11.48,[win(3.95,4.64,1.75,2.4)]);
 }else if(f.i===1){
  wall(f,.12,.12,7.35,.12);
  wall(f,.12,.12,.12,11.48,[win(.45,2.12),win(3.62,4.66),win(6.70,7.64)]);
  wall(f,7.35,.12,7.35,11.48,[win(3.12,4.1),win(8.03,9.24)]);
  wall(f,.12,11.48,7.35,11.48,[win(2.06,3.36),win(3.88,4.53,1.75,2.4)]);
 }else{
  wall(f,.12,.12,7.35,.12,f.i===2?[win(.30,.96,1.75,2.4)]:[],f.i===3?1.05:H);
  wall(f,.12,.12,.12,3.38,[],f.i===3?1.05:H);
  wall(f,.12,3.38,.12,11.48,[win(.12,1.35),win(2.48,3.82),win(4.76,5.44,1.75,2.4)]);
  wall(f,7.35,.12,7.35,3.38,[],1.05);
  wall(f,7.35,3.38,7.35,7.93,f.i===2?[win(1.58,3.03)]:[],f.i===3?1.05:H);
  wall(f,7.35,7.93,7.35,11.48,[],1.05);
  wall(f,.12,11.48,7.35,11.48);
  if(f.i===3)wall(f,.12,3.38,3.86,3.38);
 }
}
function kitchen(f,x,z,w,d){obstacle(f,x+w-.3,z+d/2,.6,d);obstacle(f,x+w/2,z+d-.27,w,.54);box(f.furniture,x+w-.3,.43,z+d/2,.6,.86,d,M.wood);box(f.furniture,x+w-.3,.9,z+d/2,.65,.07,d,M.white);box(f.furniture,x+w/2,.43,z+d-.27,w,.86,.54,M.wood);box(f.furniture,x+w/2,.9,z+d-.27,w,.07,.6,M.white);box(f.furniture,x+w-.31,.942,z+.48,.5,.015,.62,M.black);for(const a of [-1,1])for(const b of [-1,1])cylinder(f.furniture,x+w-.31+a*.12,.955,z+.48+b*.16,.075,.008,M.metal);box(f.furniture,x+w*.48,.945,z+d-.28,.5,.022,.36,M.metal);box(f.furniture,x+w*.48,.961,z+d-.28,.4,.025,.26,M.water);cylinder(f.furniture,x+w*.48,1.08,z+d-.47,.014,.28,M.metal);}
function car(f,x,z){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=-Math.PI/2;f.furniture.add(g);obstacle(f,x,z,1.63,3.7,-Math.PI/2);box(g,0,.5,0,1.63,.52,3.7,M.car);box(g,0,.93,-.15,1.4,.55,1.9,M.car);box(g,0,1.01,.825,1.27,.35,.025,M.glass);box(g,0,1.01,-1.12,1.27,.35,.025,M.glass);for(const a of [-1,1]){box(g,a*.708,1.04,-.15,.02,.35,1.68,M.glass);for(const b of [-1,1]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.19,24),M.black);tire.rotation.z=Math.PI/2;tire.position.set(a*.8,.32,b*1.17);g.add(tire);}box(g,a*.54,.57,1.86,.35,.12,.025,M.white);}}
function bike(f,x,z){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=Math.PI/2;f.furniture.add(g);obstacle(f,x,z,1.14,.65);for(const b of [-1,1]){const t=new THREE.Mesh(new THREE.TorusGeometry(.25,.065,8,18),M.black);t.rotation.y=Math.PI/2;t.position.set(0,.31,b*.57);g.add(t);}box(g,0,.63,0,.26,.23,.82,M.car);box(g,0,.79,-.13,.28,.1,.48,M.black);box(g,0,.83,.55,.65,.035,.035,M.metal);}
function slab(f){
  // The first-floor slab opens over the stilt/lobby stair. Higher slabs open
  // over the separate internal stair shown on the upper three sheets.
  if(f.i===0)box(f.base,W/2,-.11,D/2,W,.22,D,M.stone);
  else{
    if(f.i===1){
     box(f.base,(4.46+W)/2,-.11,1.7,W-4.46,.22,3.4,M.stone);
     box(f.base,.10,-.11,1.7,.2,.22,3.4,M.stone);
    }else box(f.base,W/2,-.11,1.7,W,.22,3.4,M.stone);
    box(f.base,W/2,-.11,9.72,W,.22,3.76,M.stone);
    box(f.base,(W+3.08)/2,-.11,5.65,W-3.08,.22,4.5,M.stone);
    if(f.i===1)box(f.base,1.64,-.11,5.65,2.88,.22,4.5,M.stone);
    // The centre of the upper U-shaped staircase is an open void.
    box(f.base,.10,-.11,5.65,.2,.22,4.5,M.stone);
  }
  for(const z of [0,D])box(f.base,W/2,-.23,z,W+.08,.04,.06,M.white);
  for(const x of [0,W])box(f.base,x,-.23,D/2,.06,.04,D,M.white);
}
function makeFloor(i){const f={i,root:new THREE.Group(),base:new THREE.Group(),walls:new THREE.Group(),wallCaps:new THREE.Group(),furniture:new THREE.Group(),stairs:new THREE.Group(),doorGroup:new THREE.Group(),roof:new THREE.Group(),colliders:[],obstacles:[]};f.root.add(f.base,f.walls,f.wallCaps,f.furniture,f.stairs,f.doorGroup,f.roof);f.root.position.y=elevations[i];house.add(f.root);floors.push(f);slab(f);return f;}
function terrace(f,x1,z1,x2,z2,dim){room(f,'Open terrace',dim,x1,z1,x2,z2,'#d7d8cd');for(let x=x1+.1;x<x2;x+=.42)box(f.base,x,.044,(z1+z2)/2,.009,.008,z2-z1,M.stone,false);}
function balcony(f,x1,z1,x2,z2,labelText){room(f,'Balcony',labelText,x1,z1,x2,z2,'#d2c9b6');}
function createModel(){
 for(const f of floors){house.remove(f.root);f.root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 floors.length=0;pickables.length=0;doors.length=0;stairSurfaces.length=0;for(const l of labels)l.el.remove();labels.length=0;
 for(let i=0;i<4;i++){
  const f=makeFloor(i);facade(f);stairCore(f);
  if(i===0){
   room(f,'Lobby','9′1″ × 8′5½″',4.55,.2,7.27,3.35,'#d4c6b4');
   room(f,'Car parking','One car · faces the road',.2,3.42,5.0,5.75,'#bfc7c1');
   room(f,'Bike parking','Entry from 30′ road',5.02,3.42,7.27,7.94,'#c4cec7');
   car(f,2.48,4.6);for(const z of [3.75,4.65,6.6,7.5])bike(f,6.55,z);
   room(f,'Living','13′11″ × 7′1″',.2,5.82,4.95,7.96,'#d9cfba');
   room(f,'Bedroom','10′0″ × 10′5″',.2,8.02,3.5,11.35,'#c8ac8b');
   bathroom(f,3.56,9.34,4.82,11.35,'Toilet','4′0″ × 6′6″');
   room(f,'Kitchen','7′2″ × 8′3″',4.9,8.02,7.27,10.34,'#b7c9bc');
   room(f,'Utility','7′2″ × 4′3″',4.9,10.4,7.27,11.35,'#aabdbb');
   wall(f,.12,3.38,4.46,3.38);
   wall(f,.12,5.78,4.99,5.78);
   wall(f,4.99,5.78,4.99,7.96,[door(.22,1.35,'Main entry')]);
   wall(f,.12,7.98,3.53,7.98,[door(2.4,3.25,'Bedroom')]);
   wall(f,3.53,7.98,3.53,11.48,[door(1.50,2.28,'Toilet')]);
   wall(f,3.53,9.3,4.86,9.3);
   wall(f,4.86,9.3,4.86,11.48);
   wall(f,4.86,7.98,7.35,7.98);
   wall(f,4.86,10.37,7.35,10.37,[door(.75,1.65,'Utility')]);
   sofa(f,1.8,6.32,2.0);table(f,2.0,7.28,1.1,.55);bed(f,1.65,9.8,1.55,Math.PI/2);kitchen(f,5.05,8.15,2.05,1.95);
  }
  if(i===1){
   room(f,'Lobby','9′1″ × 7′9″',4.55,.2,7.27,3.35,'#d4c6b4');
   room(f,'Storage','Storage',.2,3.42,1.25,4.0,'#bdc6bc');
   room(f,'Dining','4′8″ × 9′6″',1.26,4.25,2.80,6.70,'#dfd3c2');
   room(f,'Living','14′3″ × 12′8½″',3.10,3.42,7.27,7.25,'#e1d9c8');
   box(f.base,3.87,.017,7.625,1.54,.025,.75,mat('#e1d9c8',{map:T.floor}),false);
   room(f,'Bedroom','10′2″ × 10′5″',.2,8.05,3.5,11.35,'#d8c7b0');
   room(f,'Dressing','4′0″ × 3′1½″',3.52,8.05,4.62,9.3,'#c9baac');
   bathroom(f,3.52,9.35,4.62,11.35,'Toilet','4′0″ × 6′6″');
   room(f,'Kitchen','6′11½″ × 9′5½″',4.67,7.3,7.27,10.05,'#d8d9cf');
   room(f,'Utility','6′11½″ × 4′9″',4.67,10.12,7.27,11.35,'#cdd4cd');
   wall(f,.12,8.0,4.65,8.0,[door(2.48,3.29,'Bedroom')]);
   wall(f,3.48,8.0,3.48,11.48,[[.35,1.12,0,2.15,'open'],...(layoutVariant==='ensuite'?[door(2.10,2.94,'Bathroom')]:[])]);
   wall(f,3.48,9.32,4.64,9.32,layoutVariant==='ensuite'?[]:[door(.18,.99,'Toilet')]);
   wall(f,4.64,7.25,4.64,11.48);
   wall(f,4.64,10.08,7.35,10.08,[door(.62,1.46,'Utility')]);
   wall(f,.12,3.38,7.35,3.38,[door(5.87,7.00,'Main entry')]);
   bed(f,1.65,9.85,1.75,Math.PI/2);sofa(f,4.97,3.98,1.82);sofa(f,4.02,5.30,1.78,-Math.PI/2);table(f,5.15,5.40,.72,1.30);tv(f,7.09,5.64,1.4,-Math.PI/2);table(f,2.02,5.45,.75,1.6,.75);kitchen(f,4.8,7.6,2.28,2.1);
  }
  if(i===2){
   room(f,'Bedroom','11′1″ × 10′0″',2.62,.2,5.98,3.35,'#d8c6af');
   bathroom(f,.2,.2,2.52,1.55,'Toilet','6′0″ × 5′2″');
   room(f,'Walk-in wardrobe','6′0″ × 4′4″',.2,1.6,2.52,3.35,'#c9b9a6');
   balcony(f,6.03,.2,7.27,3.35,'4′4½″ × 10′0″');
   room(f,'Living','14′8″ × 13′5″',3.10,3.42,6.12,7.86,'#ded8cb');
   box(f.base,6.73,.017,6.25,1.08,.025,3.22,mat('#ded8cb',{map:T.floor}),false);
   room(f,'Pooja','4′4½″ × 4′0″',6.18,3.55,7.27,4.58,'#e9d1cd');
   room(f,'Master bedroom','11′1″ × 10′5″',2.62,8.02,5.98,11.35,'#d8c6af');
   bathroom(f,.2,8.02,2.52,9.35,'Toilet','6′0″ × 4′9″');
   room(f,'Walk-in wardrobe','6′0″ × 5′2″',.2,9.4,2.52,11.35,'#c9b9a6');
   balcony(f,6.03,8.02,7.27,11.35,'4′4½″ × 11′2″');
   wall(f,2.58,.12,2.58,3.4,[[2.14,2.99,0,2.3,'open']]);
   wall(f,.12,1.57,2.58,1.57,[door(1.25,2.17,'Toilet')]);
   wall(f,6.0,.12,6.0,3.4,[door(1.05,2.3,'Balcony')]);
   wall(f,2.58,7.96,2.58,11.48,[[2.2,3.08,0,2.3,'open']]);
   wall(f,.12,9.37,2.58,9.37,[door(1.2,2.14,'Toilet')]);
   wall(f,6.0,7.96,6.0,11.48,[door(1.1,2.36,'Balcony')]);
   wall(f,.12,3.38,7.35,3.38,[door(4.78,5.75,'Bedroom')]);
   wall(f,.12,7.93,7.35,7.93,[door(4.78,5.75,'Master bedroom')]);
   bed(f,4.1,1.82,1.73,Math.PI);bed(f,4.1,9.63,1.78,Math.PI);
   for(const z of [5.65,7.1]){table(f,6.9,z,.65,1.08,.75);chair(f,6.25,z,Math.PI/2);}
  }
  if(i===3){
   terrace(f,.2,.2,7.27,3.35,'23′4″ × 10′9″');
   room(f,'Lobby','4′0″ × 12′8″',3.10,3.42,3.85,7.86,'#d4c7b3');
   terrace(f,3.9,3.42,7.27,7.86,'10′8″ × 13′5″');
   room(f,'Bedroom','11′1″ × 10′5″',2.62,8.02,5.98,11.35,'#d8c6af');
   bathroom(f,.2,8.02,2.52,9.35,'Toilet','6′0″ × 4′9″');
   room(f,'Walk-in wardrobe','6′0″ × 5′2″',.2,9.4,2.52,11.35,'#c9b9a6');
   balcony(f,6.03,8.02,7.27,11.35,'4′4½″ × 11′2″');
   wall(f,.12,7.93,7.35,7.93,[door(4.78,5.75,'Bedroom')]);
   wall(f,2.58,7.96,2.58,11.48,[[2.2,3.08,0,2.3,'open']]);
   wall(f,.12,9.37,2.58,9.37,[door(1.2,2.14,'Toilet')]);
   wall(f,6.0,7.96,6.0,11.48,[door(1.1,2.36,'Balcony')]);
   wall(f,3.86,3.42,3.86,7.86,[door(1.5,2.55,'Open terrace')]);
   box(f.roof,3.06,H+.1,9.72,6.12,.2,3.76,M.white);
   box(f.roof,1.99,H+.1,5.65,3.98,.2,4.55,M.white);
   bed(f,4.1,9.63,1.78,Math.PI);
  }
 }
 update();
}
const ground=box(scene,0,-.24,0,24,.12,24,mat('#dce3d5'));ground.castShadow=false;
const plinth=box(scene,0,.24,0,8.1,.48,12.1,M.stone);
const road=box(scene,6.9,.015,0,5.5,.09,24,mat('#aeb7af'));road.castShadow=false;
const drive=box(scene,4.52,.39,.45,2.02,.10,5.68,mat('#b8bdb3'));drive.rotation.z=-.31;
const lobbyApproach=box(scene,4.52,.39,-3.12,2.02,.10,1.45,mat('#d1c6b5'));lobbyApproach.rotation.z=-.31;
for(const z of [-2.35,3.25])box(scene,4.52,.09,z,2,.025,.07,M.white,false);
const ambientGrid=new THREE.GridHelper(24,24,0xc4cdbf,0xd2dacb);ambientGrid.position.y=-.17;scene.add(ambientGrid);
const isGame=()=>view==='pov'||view==='follow';
function update(){
 renderNeeded=true;renderer.shadowMap.needsUpdate=true;
 $('#layoutNote').textContent=layoutVariant==='ensuite'?'Alternative · direct bedroom access; bathroom separated from dressing and utility by solid walls.':'Current plan · bathroom access through dressing.';
 const game=isGame(),all=selected==='all',explode=$('#explode').checked&&all,cut=!game&&$('#walls').value==='cut';
 for(const f of floors){
  f.root.visible=game||all||String(f.i)===selected;
  f.root.position.y=game?elevations[f.i]:(all?elevations[f.i]+(explode?f.i*2.4:0):.762);
  f.walls.traverse(o=>{if(!o.isMesh)return;if(!o.userData.wallBounds){const h=o.geometry.parameters.height;o.userData.wallBounds={y:o.position.y,h};}const b=o.userData.wallBounds,lo=b.y-b.h/2,hi=cut?Math.min(1.05,b.y+b.h/2):b.y+b.h/2;o.visible=hi>lo;o.scale.y=Math.max(.0001,(hi-lo)/b.h);o.position.y=(lo+hi)/2;});
  f.furniture.visible=$('#furniture').checked;
  f.wallCaps.visible=cut&&!game;
  f.stairs.visible=true;f.stairs.scale.y=1;f.doorGroup.visible=!cut;
  f.roof.visible=game?f.i===3:$('#roof').checked&&(selected==='3'||all);
 }
 avatar.visible=view==='follow';
 $('#viewTitle').textContent=all?(explode?'Every level, revealed':'A home in four levels'):['Arrival & parking','Life on the first floor','The private retreat','A room above it all'][+selected];
 document.querySelectorAll('.floor').forEach(b=>b.classList.toggle('active',b.dataset.floor===selected));
 $('#walls').disabled=game;$('#explode').disabled=game||!all;$('#roof').disabled=game||!(all||selected==='3');
 $('#roomInfo').innerHTML='<strong>'+(all?'Shelar Residence':['Stilt','First floor','Second floor','Penthouse'][+selected])+'</strong><span>'+(game?'Walk through the rooms and use the staircase to change levels.':all?'Select a level to explore its rooms.':'Select a room to see its plan dimensions.')+'</span>';
}
function placeAtLevel(level){player.level=level;player.x=[8.55,6.15,5.8,5.15][level];player.z=[5.6,6.45,6.75,6.8][level];player.y=level===0?parkingRampHeight(player.x,player.z):elevations[level];player.yaw=level===0?-Math.PI/2:0;player.pitch=0;player.facing=Math.PI-player.yaw;cameraBoom=player.followDistance;}
function setCamera(mode=view,reset=false){
 const wasGame=isGame();view=mode;const game=isGame();stage.classList.toggle('gaming',game);controls.enabled=!game;renderer.shadowMap.enabled=!game;renderer.setPixelRatio(game?1:Math.min(devicePixelRatio,2));renderer.setSize(stage.clientWidth,stage.clientHeight);camera.fov=mode==='pov'?69:mode==='follow'?63:38;camera.updateProjectionMatrix();avatar.visible=mode==='follow';
 $('#hint').textContent=game?'WASD / arrows · Drag to look · E: door · Wheel / + / −: zoom':'Drag to orbit · Wheel / + / − to zoom · Right-drag to pan';
 if(game){if(selected==='all')selected='1';if(!wasGame||reset)placeAtLevel(+selected);update();updateGameCamera();}
 else{update();const all=selected==='all',ex=$('#explode').checked&&all,cy=all?(ex?9:6.3):.85;controls.target.set(0,cy,0);const distance=(all?(ex?32:26):20)*Math.max(1,.95/camera.aspect);let q;if(mode==='top')q=[.001,cy+distance,.001];else if(mode==='front')q=[distance,cy+distance*.12,0];else q=[distance*.70,cy+distance*.77,distance*.86];camera.position.set(...q);camera.up.set(0,1,0);controls.update();}
 ['iso','top','front','pov','follow'].forEach(id=>$('#'+id).classList.toggle('active',id===mode));renderNeeded=true;
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(isGame())updateGameCamera();else setCamera(view);renderNeeded=true;}new ResizeObserver(resize).observe(stage);
function updateGameCamera(dt=1/60){
 const px=player.x-3.735,pz=player.z-5.8,y=player.y;avatar.position.set(px,y,pz);avatar.rotation.y+=(Math.atan2(Math.sin(player.facing-avatar.rotation.y),Math.cos(player.facing-avatar.rotation.y)))*Math.min(1,dt*14);
 if(view==='pov'){camera.position.set(px,y+1.64,pz);camera.lookAt(px+Math.sin(player.yaw)*10*Math.cos(player.pitch),y+1.64+Math.sin(player.pitch)*10,pz-Math.cos(player.yaw)*10*Math.cos(player.pitch));}
 else if(view==='follow'){
  const back=player.followDistance,side=.18;
  const origin=new THREE.Vector3(px,y+1.5,pz);
  const desired=new THREE.Vector3(px-Math.sin(player.yaw)*back+Math.cos(player.yaw)*side,y+2.35+player.pitch*.7,pz+Math.cos(player.yaw)*back+Math.sin(player.yaw)*side);
  const vector=desired.clone().sub(origin),length=vector.length(),direction=vector.normalize();
  const solids=[];
  for(const floor of floors){
   if(Math.abs(elevations[floor.i]-player.y)>RISE+1)continue;
   for(const group of [floor.walls,floor.doorGroup,floor.base,floor.stairs,...(floor.furniture.visible?[floor.furniture]:[])])group.traverse(o=>{if(o.isMesh&&o.visible)solids.push(o);});
  }
  scene.updateMatrixWorld(true);
  // Several offset rays give the camera clearance at corners and railings.
  let safe=length;
  for(const offset of [-.12,0,.12]){
   const rayOrigin=origin.clone().add(new THREE.Vector3(Math.cos(player.yaw)*offset,0,Math.sin(player.yaw)*offset));
   const hits=new THREE.Raycaster(rayOrigin,direction,.08,length).intersectObjects(solids,false);
   if(hits.length)safe=Math.min(safe,Math.max(.12,hits[0].distance-.18));
  }
  cameraBoom=safe<cameraBoom?safe:cameraBoom+(safe-cameraBoom)*(1-Math.exp(-dt*7));
  camera.position.copy(origin).addScaledVector(direction,cameraBoom);
  camera.lookAt(px+Math.sin(player.yaw)*2,y+1.15+Math.sin(player.pitch)*2,pz-Math.cos(player.yaw)*2);
  const opacity=Math.max(0,Math.min(1,(cameraBoom-1.35)/.85));
  avatar.visible=opacity>.01;$('#hint').textContent=cameraBoom<1.6?'Tight space · Character fades for visibility · WASD / arrows to move':'WASD / arrows · Drag to look · E: door · Wheel / + / −: zoom';for(const material of avatarMaterials){material.opacity=opacity;material.depthWrite=opacity>.95;}
 }

 renderNeeded=true;updateNearbyDoor();updateLocation();
}
function currentRoom(){const stair=stairSurfaces.find(p=>player.x>=p.x1&&player.x<=p.x2&&player.z>=p.z1&&player.z<=p.z2&&Math.abs(elevations[p.base]+p.h1+(p.h2-p.h1)*(p.axis==='x'?(player.x-p.x1)/(p.x2-p.x1):(player.z-p.z1)/(p.z2-p.z1))-player.y)<.15);if(stair)return ['Stilt ↔ First · stairs','First ↔ Second · stairs','Second ↔ Terrace · stairs'][stair.base];if(player.level===0&&player.x>7.27)return 'Parking entrance';if(player.level<=1&&player.x<4.5&&player.z<3.35)return 'Lobby staircase';if(player.level>=1&&player.x<2.55&&player.z>3.4&&player.z<7.9)return 'Internal staircase';const matches=pickables.filter(m=>m.userData.f.i===player.level&&Math.abs(m.position.x-player.x)<m.geometry.parameters.width/2&&Math.abs(m.position.z-player.z)<m.geometry.parameters.depth/2);matches.sort((a,b)=>a.geometry.parameters.width*a.geometry.parameters.depth-b.geometry.parameters.width*b.geometry.parameters.depth);return matches[0]?.userData.name||'Hallway';}
let lastLocation='';function updateLocation(){if(!isGame())return;const room=currentRoom(),text=player.level+'-'+room;if(text===lastLocation)return;lastLocation=text;$('#levelHud').textContent=['STILT','FIRST FLOOR','SECOND FLOOR','PENTHOUSE'][player.level];$('#roomHud').textContent=room;}
function updateNearbyDoor(){if(!isGame())return;nearDoor=null;let nearest=1.35;for(const d of doors){if(d.floor!==player.level)continue;const dist=Math.hypot(player.x-d.cx,player.z-d.cz);if(dist<nearest){nearest=dist;nearDoor=d;}}const button=$('#doorAction');button.classList.toggle('available',!!nearDoor);if(nearDoor)button.textContent=(nearDoor.target?'Close ':'Open ')+nearDoor.name+' · E';}
function toggleDoor(){if(!nearDoor)return;nearDoor.target=nearDoor.target?0:1;updateNearbyDoor();renderNeeded=true;}
function distanceToSegment(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-(ax+t*dx),z-(az+t*dz));}
function blocked(x,z){const roadAccess=player.level===0&&x>=7.16&&x<=9.1&&z>2.05&&z<8.9;if((x<.3||x>7.16||z<.3||z>11.3)&&!roadAccess)return true;const level=Math.min(3,Math.max(0,player.level));for(const line of floors[level].colliders){if(distanceToSegment(x,z,...line)<.20)return true;}for(const d of doors){if(d.floor!==level)continue;const width=d.width,theta=d.pivot.rotation.y+d.angle,sx=d.x1+Math.cos(d.pivot.rotation.y)*d.slide,sz=d.z1-Math.sin(d.pivot.rotation.y)*d.slide;if(distanceToSegment(x,z,sx,sz,sx+Math.cos(theta)*width,sz-Math.sin(theta)*width)<.18)return true;}if($('#furniture').checked)for(const o of floors[level].obstacles){if(Math.abs(x-o.x)<o.rx+.17&&Math.abs(z-o.z)<o.rz+.17)return true;}return false;}
function parkingRampHeight(x,z){return x>7.16&&z>2.05&&z<8.9?Math.max(.08,elevations[0]-(x-7.16)*.34):elevations[0];}
function stairHeight(x,z){
 let best=null,delta=Infinity;
 for(const p of stairSurfaces){
  if(x<p.x1-.015||x>p.x2+.015||z<p.z1-.015||z>p.z2+.015)continue;
  const span=p.axis==='x'?p.x2-p.x1:p.z2-p.z1;
  const t=Math.max(0,Math.min(1,((p.axis==='x'?x-p.x1:z-p.z1)/span)));
  const y=elevations[p.base]+p.h1+(p.h2-p.h1)*t;
  const diff=Math.abs(y-player.y);
  if(diff<delta){delta=diff;best=y;}
 }
 // A flight on another storey must never block a room below it.
 return delta<=.34?best:null;
}
function walkingHeight(x,z){
 const stair=stairHeight(x,z);if(stair!==null)return stair;
 const level=player.level,ground=level===0?parkingRampHeight(x,z):elevations[level];
 // Do not let the character float across the openings beside a stair flight.
 if(level===1&&x>.2&&x<4.46&&z<3.4)return null;
 if(level>=2&&x>.2&&x<3.08&&z>3.4&&z<7.9){
  return null;
 }
 for(const p of stairSurfaces){
  if(x<p.x1||x>p.x2||z<p.z1||z>p.z2)continue;
  const t=p.axis==='x'?(x-p.x1)/(p.x2-p.x1):(z-p.z1)/(p.z2-p.z1);
  const underside=elevations[p.base]+p.h1+(p.h2-p.h1)*t-.15;
  if(underside>ground+.3&&underside<ground+1.65)return null;
 }
 return ground;
}
function movePlayer(dt){
 if(!isGame())return false;
 const forward=(pressed.has('KeyW')||pressed.has('ArrowUp')?1:0)-(pressed.has('KeyS')||pressed.has('ArrowDown')?1:0),right=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0);
 if(!forward&&!right)return false;
 const speed=(pressed.has('ShiftLeft')?3.25:1.8)*dt/Math.hypot(forward,right),dx=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*right)*speed,dz=(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*right)*speed;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));let moved=false;
 for(let n=0;n<steps;n++){
  for(const axis of ['x','z']){const nx=player.x+(axis==='x'?dx/steps:0),nz=player.z+(axis==='z'?dz/steps:0);if(blocked(nx,nz))continue;const target=walkingHeight(nx,nz);if(target===null||Math.abs(target-player.y)>.32)continue;player.x=nx;player.z=nz;player.y=target;moved=true;}
 }
 const newLevel=Math.max(0,Math.min(3,elevations.reduce((level,height,i)=>player.y>=height-.08?i:level,0)));
 if(newLevel!==player.level){player.level=newLevel;selected=String(newLevel);update();}
 if(moved){player.facing=Math.PI-Math.atan2(dx,-dz);updateGameCamera(dt);}return moved;
}
function zoomBy(direction){
 if(view==='pov'){camera.fov=Math.max(46,Math.min(86,camera.fov+(direction>0?-5:5)));camera.updateProjectionMatrix();}
 else if(view==='follow'){player.followDistance=Math.max(1.15,Math.min(4.4,player.followDistance+(direction>0?-.35:.35)));updateGameCamera();}
 else{const scale=direction>0?.82:1.22,offset=camera.position.clone().sub(controls.target).multiplyScalar(scale);if(offset.length()>=4&&offset.length()<=65){camera.position.copy(controls.target).add(offset);controls.update();}}
 renderNeeded=true;
}
const v=new THREE.Vector3();function frame(time){
 requestAnimationFrame(frame);const dt=Math.min(.12,(time-lastFrame)/1000);lastFrame=time;
 const moving=isGame()?movePlayer(dt):false;if(!isGame())controls.update();
 if(characterMixer){if(moving!==wasMoving){const from=moving?idleAction:walkAction,to=moving?walkAction:idleAction;from?.fadeOut(.15);to?.reset().fadeIn(.15).play();wasMoving=moving;}characterMixer.update(dt);if(view==='follow')renderNeeded=true;}
 for(const d of doors){if(d.sliding){const desired=d.target?d.width:0;if(Math.abs(d.slide-desired)>.002){d.slide+=(desired-d.slide)*Math.min(1,dt*10);d.leaf.position.x=d.slide;renderNeeded=true;}continue;}const desired=d.target?-1.37:0;if(Math.abs(d.angle-desired)>.005){d.angle+=(desired-d.angle)*Math.min(1,dt*10);d.leaf.rotation.y=d.angle;renderNeeded=true;}}
 for(const l of labels){const show=!isGame()&&$('#labelToggle').checked&&l.f.root.visible&&(selected!=='all'||$('#explode').checked);l.el.style.display=show?'block':'none';if(show){v.copy(l.p);l.f.root.localToWorld(v);v.project(camera);if(v.z>1||v.z< -1){l.el.style.display='none';continue;}l.el.style.left=((v.x+1)*stage.clientWidth/2)+'px';l.el.style.top=((-v.y+1)*stage.clientHeight/2)+'px';}}
 if(isGame())updateGameCamera(dt);if(renderNeeded){renderer.render(scene,camera);renderNeeded=false;}
}
for(const btn of document.querySelectorAll('[data-floor]'))btn.onclick=()=>{const next=btn.dataset.floor;if(isGame()&&next!=='all')placeAtLevel(+next);selected=next;if(next==='all'&&isGame())view='iso';$('#walls').value=next==='all'||isGame()?'full':'cut';$('#roof').checked=next==='all';setCamera(view);};
for(const id of ['iso','top','front','pov','follow'])$('#'+id).onclick=()=>{if(id==='pov'||id==='follow')$('#walls').value='full';setCamera(id);};
for(const id of ['walls','furniture','labelToggle','roof'])$('#'+id).onchange=update;
$('#explode').onchange=()=>{if($('#explode').checked){$('#walls').value='cut';$('#roof').checked=false;}update();setCamera();};
$('#layoutVariant').onchange=()=>{layoutVariant=$('#layoutVariant').value;const url=new URL(location.href);url.searchParams.set('layout',layoutVariant);history.replaceState(null,'',url);highlight=null;nearDoor=null;pressed.clear();createModel();if(isGame()){selected='1';placeAtLevel(1);player.x=2.98;player.z=10.52;player.yaw=Math.PI/2;player.facing=Math.PI/2;}setCamera(view);};
$('#reset').onclick=()=>setCamera(view,true);
$('#zoomIn').onclick=()=>zoomBy(1);$('#zoomOut').onclick=()=>zoomBy(-1);
$('#doorAction').onclick=toggleDoor;
renderer.domElement.addEventListener('wheel',e=>{if(isGame()){e.preventDefault();zoomBy(e.deltaY<0?1:-1);}}, {passive:false});
$('#save').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='Shelar-residence-'+(selected==='all'?'house':'floor-'+selected)+'.png';a.click();};
$('#source').onclick=()=>{const p=selected==='all'?1:+selected+1;$('#planImage').src='plans/page-'+p+'.png';$('#planTitle').textContent='Source drawing · Page '+p+' of 4';$('#planDialog').showModal();};$('#closeDialog').onclick=()=>$('#planDialog').close();
const moveKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft']);window.addEventListener('keydown',e=>{if(!isGame()||e.target.closest('input,select,textarea'))return;if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)toggleDoor();return;}if(e.code==='Equal'||e.code==='NumpadAdd'){e.preventDefault();zoomBy(1);return;}if(e.code==='Minus'||e.code==='NumpadSubtract'){e.preventDefault();zoomBy(-1);return;}if(moveKeys.has(e.code)){e.preventDefault();pressed.add(e.code);}});window.addEventListener('keyup',e=>pressed.delete(e.code));window.addEventListener('blur',()=>pressed.clear());for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pressed.add(b.dataset.move);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>pressed.delete(b.dataset.move));}
let down;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];if(view==='pov'||view==='follow'){dragLook=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);}});renderer.domElement.addEventListener('pointermove',e=>{if(!dragLook)return;const dx=e.clientX-dragLook[0],dy=e.clientY-dragLook[1];player.yaw-=dx*.005;player.pitch=Math.max(-.6,Math.min(.6,player.pitch-dy*.004));dragLook=[e.clientX,e.clientY];updateGameCamera();});renderer.domElement.addEventListener('pointercancel',()=>dragLook=null);renderer.domElement.addEventListener('pointerup',e=>{dragLook=null;if(view==='pov'||view==='follow')return;if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(pickables.filter(p=>p.userData.f.root.visible))[0];if(!hit)return;if(highlight)highlight.material.emissive.setHex(0);highlight=hit.object;highlight.material.emissive.setHex(0x15281a);renderNeeded=true;const d=hit.object.userData;$('#roomInfo').innerHTML='<strong>'+d.name+'</strong><span>'+d.dim+'<br>Dimensions shown on the supplied plan.</span>';});
createModel();resize();setCamera();frame(performance.now());window.__house={scene,floors,renderer,camera,controls,pickables,labels,doors,player,stairSurfaces,stairHeight,walkingHeight,movePlayer,blocked,zoomBy,setCamera,placeAtLevel};
