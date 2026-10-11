'use strict';
const $=s=>document.querySelector(s), stage=$('#stage');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e9ede5');
const camera=new THREE.PerspectiveCamera(38,1,.05,200);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){$('#error').style.display='block';$('#error').textContent='This model needs WebGL. Please open it in a current Chrome, Edge or Safari browser.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.prepend(renderer.domElement);
let renderNeeded=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;const controls=new OrbitControls(camera,renderer.domElement);controls.addEventListener('change',()=>renderNeeded=true);controls.enableDamping=true;controls.enableZoom=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI/2-.02;controls.minDistance=4;controls.maxDistance=65;
scene.add(new THREE.HemisphereLight(0xffffff,0xa2ac99,2.8));const sun=new THREE.DirectionalLight(0xfff4de,3.3);sun.position.set(-10,25,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);scene.add(sun.target);
const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.82,...extra});
const M={wall:mat('#eeeae0'),edge:mat('#b5b9ac'),stone:mat('#c8cbbd'),wood:mat('#ae8157'),darkwood:mat('#765a43'),fabric:mat('#c8c9b1'),sage:mat('#8fa28e'),white:mat('#f7f5ec'),black:mat('#293d3a'),metal:mat('#73817c',{metalness:.55,roughness:.3}),glass:mat('#a9ccd0',{transparent:true,opacity:.36,roughness:.13,depthWrite:false}),water:mat('#73989c'),tile:mat('#d3d8d3'),car:mat('#617a78',{metalness:.25,roughness:.25}),leaves:mat('#68825b')};
const house=new THREE.Group();house.position.set(-3.735,0,-5.8);scene.add(house);
const floors=[],pickables=[],labels=[],doors=[];let selected='1',view='iso',highlight=null;
const player={x:5.65,z:6.25,y:4.1148,level:1,yaw:-Math.PI/2,pitch:0,followDistance:3.2};const pressed=new Set();let dragLook=null,lastFrame=performance.now(),nearDoor=null,characterMixer=null,walkAction=null,idleAction=null;
const avatar=new THREE.Group();scene.add(avatar);
const loader=new GLTFLoader();function installCharacter(gltf){const model=gltf.scene;const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());model.scale.setScalar(1.65/Math.max(size.y,.01));const scaled=new THREE.Box3().setFromObject(model);model.position.y=-scaled.min.y;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});avatar.add(model);if(gltf.animations?.length){characterMixer=new THREE.AnimationMixer(model);const walk=gltf.animations.find(a=>a.name==='walk'),idle=gltf.animations.find(a=>a.name==='idle');if(walk)walkAction=characterMixer.clipAction(walk);if(idle){idleAction=characterMixer.clipAction(idle);idleAction.play();}}renderNeeded=true;}
if(typeof CHARACTER_GLB_BASE64!=='undefined'){const raw=atob(CHARACTER_GLB_BASE64),buffer=new Uint8Array(raw.length);for(let j=0;j<raw.length;j++)buffer[j]=raw.charCodeAt(j);loader.parse(buffer.buffer,'',installCharacter,e=>console.error('Character could not load',e));}else loader.load('character.glb',installCharacter,undefined,e=>console.error('Character could not load',e));
const elevations=[.762,4.1148,7.4676,10.8204], H=3.1728,W=7.47,D=11.6,RISE=3.3528;
function box(g,x,y,z,w,h,d,m,shadow=true){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=shadow;mesh.receiveShadow=true;g.add(mesh);return mesh;}
function cylinder(g,x,y,z,r,h,m){const v=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),m);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;g.add(v);return v;}
function line(g,points,color='#73817c'){const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));g.add(mesh);return mesh;}
function label(f,text,dim,x,z){const el=document.createElement('div');el.className='label';el.innerHTML=text+(dim?'<small>'+dim+'</small>':'');$('#labels').append(el);labels.push({f,el,p:new THREE.Vector3(x,.16,z)});}
function room(f,name,dim,x1,z1,x2,z2,color){const m=mat(color);const mesh=box(f.base,(x1+x2)/2,.017,(z1+z2)/2,x2-x1,.025,z2-z1,m,false);mesh.userData={name,dim,f};pickables.push(mesh);label(f,name,dim,(x1+x2)/2,(z1+z2)/2);return mesh;}
const signMaterials=new Map();
function signMaterial(name){if(signMaterials.has(name))return signMaterials.get(name);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5efe2';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#b59b78';ctx.lineWidth=7;ctx.strokeRect(5,5,502,118);ctx.fillStyle='#26382f';ctx.font='bold 40px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name.toUpperCase().slice(0,19),256,64,470);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});signMaterials.set(name,material);return material;}
function wall(f,x1,z1,x2,z2,openings=[],height=H,material=M.wall){
 const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz),angle=Math.atan2(dz,dx),ux=dx/L,uz=dz/L;
 const group=new THREE.Group();group.position.set(x1,0,z1);group.rotation.y=-angle;f.walls.add(group);
 const gaps=openings.filter(o=>o[4]==='door'||o[4]==='open').sort((a,b)=>a[0]-b[0]);let solidFrom=0;
 for(const gap of gaps){if(gap[0]>solidFrom)f.colliders.push([x1+ux*solidFrom,z1+uz*solidFrom,x1+ux*gap[0],z1+uz*gap[0]]);solidFrom=Math.max(solidFrom,gap[1]);}
 if(solidFrom<L)f.colliders.push([x1+ux*solidFrom,z1+uz*solidFrom,x2,z2]);
 function piece(a,b,low,high){if(b-a>.001&&high-low>.001)box(group,(a+b)/2,(high+low)/2,0,b-a,high-low,.15,material);}
 let end=0;for(const o of openings.sort((a,b)=>a[0]-b[0])){
  const[a,b,low,high,type,name='Door']=o;piece(end,a,0,height);piece(a,b,0,low);piece(a,b,high,height);
  if(type==='window'){box(group,(a+b)/2,(low+high)/2,0,b-a,high-low,.045,M.glass,false);for(const pos of [a,b,(a+b)/2])box(group,pos,(low+high)/2,0,.035,high-low,.085,M.metal);for(const yy of [low,high])box(group,(a+b)/2,yy,0,b-a,.035,.085,M.metal);}
  if(type==='door'){
   const width=b-a,pivot=new THREE.Group(),leaf=new THREE.Group();pivot.position.set(x1+ux*a,0,z1+uz*a);pivot.rotation.y=-angle;pivot.add(leaf);f.doorGroup.add(pivot);
   box(leaf,width/2,1.05,0,width,2.1,.055,M.darkwood);box(leaf,width/2,1.1,.032,width-.17,1.85,.018,M.wood,false);
   for(const y of [.45,1.15])box(leaf,width/2,y,.048,width-.27,.008,.014,M.darkwood,false);
   for(const face of [-1,1]){const plaque=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width-.12,.65),.17),signMaterial(name));plaque.position.set(width/2,1.74,face*.049);plaque.rotation.y=face===1?0:Math.PI;leaf.add(plaque);}
   cylinder(leaf,width-.115,1.05,.072,.025,.07,M.metal);
   for(const edge of [a,b])box(group,edge,1.07,0,.055,2.14,.13,M.darkwood);
   const info={floor:f.i,name,pivot,leaf,x1:x1+ux*a,z1:z1+uz*a,x2:x1+ux*b,z2:z1+uz*b,cx:x1+ux*(a+b)/2,cz:z1+uz*(a+b)/2,angle:0,target:0};doors.push(info);
  }
  end=b;
 }piece(end,L,0,height);return group;
}
const door=(a,b,name='Door')=>[a,b,0,2.15,'door',name],win=(a,b,lo=.95,hi=2.45)=>[a,b,lo,hi,'window'];
function bed(f,x,z,w=1.65,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);box(g,0,.2,0,w,.3,2.1,M.darkwood);box(g,0,.43,0,w,.22,2,M.white);box(g,0,.57,.32,w+.02,.1,1.25,M.sage);box(g,0,.63,-.98,w+.1,1.15,.12,M.wood);for(const s of [-1,1]){box(g,s*w*.24,.59,-.66,w*.4,.16,.42,M.white);box(g,s*(w/2+.24),.25,-.7,.35,.5,.42,M.wood);cylinder(g,s*(w/2+.24),.59,-.7,.11,.16,M.white);} }
function sofa(f,x,z,w=2.1,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);box(g,0,.22,0,w,.22,.82,M.darkwood);box(g,0,.42,.02,w-.12,.22,.78,M.fabric);box(g,0,.7,-.34,w,.65,.15,M.fabric);for(const s of [-1,1])box(g,s*(w/2-.06),.55,0,.13,.5,.86,M.fabric);for(let i=0;i<3;i++)box(g,(i-1)*w/3,.565,.03,w/3-.045,.04,.6,M.fabric);}
function table(f,x,z,w=1.2,d=.7,h=.42){box(f.furniture,x,h,z,w,.08,d,M.wood);for(const a of [-1,1])for(const b of [-1,1])box(f.furniture,x+a*(w/2-.09),h/2,z+b*(d/2-.09),.045,h,.045,M.black);}
function rug(f,x,z,w,d){box(f.furniture,x,.045,z,w,.015,d,mat('#d9cdb7'),false);for(let j=0;j<6;j++)box(f.furniture,x,.056,z-d/2+.09+j*.045,w-.16,.005,.012,M.white,false);}
function chair(f,x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);box(g,0,.46,0,.42,.09,.44,M.fabric);box(g,0,.68,-.2,.44,.4,.05,M.wood);for(const a of [-1,1])for(const b of [-1,1])box(g,a*.16,.23,b*.16,.035,.46,.035,M.darkwood);}
function cabinet(f,x,z,w,d=.55){box(f.furniture,x,1.12,z,w,2.24,d,M.wood);for(let a=-w/2+.45;a<w/2;a+=.45){box(f.furniture,x+a,1.12,z+d/2+.003,.012,2.2,.012,M.darkwood);box(f.furniture,x+a-.055,1.15,z+d/2+.025,.02,.18,.025,M.metal);}}
function tv(f,x,z,w=1.5,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;f.furniture.add(g);box(g,0,.23,0,w+.25,.4,.3,M.wood);box(g,0,1.13,0,w,.83,.06,M.black);box(g,0,1.13,.036,w-.07,.75,.006,mat('#405453'));}
function plant(g,x,z){cylinder(g,x,.24,z,.19,.43,M.white);for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.23,10,8),M.leaves);leaf.scale.set(.65,1.7,.6);leaf.position.set(x+Math.sin(i*2)*.14,.64+(i%2)*.15,z+Math.cos(i*2)*.14);leaf.rotation.z=Math.sin(i*2)*.4;g.add(leaf);}}
function toilet(f,x,z){box(f.furniture,x,.47,z-.2,.42,.72,.18,M.white);const bowl=cylinder(f.furniture,x,.26,z+.1,.23,.36,M.white);bowl.scale.z=1.35;const seat=cylinder(f.furniture,x,.452,z+.1,.18,.015,M.tile);seat.scale.z=1.3;}
function basin(f,x,z){box(f.furniture,x,.72,z,.62,.12,.42,M.white);cylinder(f.furniture,x,.79,z,.15,.022,M.water);cylinder(f.furniture,x,.87,z-.14,.015,.21,M.metal);}
function bathroom(f,x1,z1,x2,z2,name='Toilet',dim='7′10″ × 5′4½″'){room(f,name,dim,x1,z1,x2,z2,'#cdd6d0');toilet(f,x1+.43,z1+.36);basin(f,x2-.5,z1+.26);box(f.furniture,(x1+x2)/2,1.04,z1+.1,.025,1.4,.04,M.metal);}
function stairs(f){
  const lowX=.8,highX=1.95,z0=3.55,z1=7.75,half=RISE/2;
  for(let j=0;j<11;j++){
    const z=z1-(j+.5)*(z1-z0)/11,top=(j+1)*half/11;
    box(f.stairs,lowX,top/2,z,.9,top,(z1-z0)/11+.012,M.stone);
    const z2=z0+(j+.5)*(z1-z0)/11,top2=half+(j+1)*half/11;
    box(f.stairs,highX,top2/2,z2,.9,top2,(z1-z0)/11+.012,M.stone);
  }
  box(f.stairs,1.38,half/2,z0-.16,2.08,half,.45,M.stone);
  for(const x of [1.37,2.46])for(let z=3.55;z<7.8;z+=.72)box(f.stairs,x,.95,z,.035,1.4,.035,M.metal);
  label(f,'Staircase','UP / DOWN',1.4,5.55);
}
function stairCore(f){
  room(f,'Staircase','3′ wide flights',.2,3.42,2.56,7.86,'#c5c8c0');
  if(f.i<3)stairs(f);
  else box(f.base,1.3,.03,5.6,2.35,.08,4.5,M.stone);
}
function facade(f){
  wall(f,.12,.12,7.35,.12,[win(.45,1.7),win(3.15,4.7)]);
  wall(f,.12,.12,.12,11.48,[win(.6,1.8),win(8.7,10.5)]);
  if(f.i!==3)wall(f,7.35,.12,7.35,11.48,[win(.5,1.8),win(7.0,8.1),win(9.4,10.4)]);
  else wall(f,7.35,8.0,7.35,11.48,[win(.5,2.7)]);
  if(f.i!==3)wall(f,.12,11.48,7.35,11.48,[win(1.0,2.8),win(5.0,6.6)]);
  else wall(f,.12,11.48,5.95,11.48,[win(2,4.4)]);
}
function kitchen(f,x,z,w,d){box(f.furniture,x+w-.3,.43,z+d/2,.6,.86,d,M.wood);box(f.furniture,x+w-.3,.9,z+d/2,.65,.07,d,M.white);box(f.furniture,x+w/2,.43,z+d-.27,w,.86,.54,M.wood);box(f.furniture,x+w/2,.9,z+d-.27,w,.07,.6,M.white);box(f.furniture,x+w-.31,.942,z+.48,.5,.015,.62,M.black);for(const a of [-1,1])for(const b of [-1,1])cylinder(f.furniture,x+w-.31+a*.12,.955,z+.48+b*.16,.075,.008,M.metal);box(f.furniture,x+w*.48,.945,z+d-.28,.5,.022,.36,M.metal);box(f.furniture,x+w*.48,.961,z+d-.28,.4,.025,.26,M.water);cylinder(f.furniture,x+w*.48,1.08,z+d-.47,.014,.28,M.metal);}
function car(f,x,z){const g=new THREE.Group();g.position.set(x,0,z);f.furniture.add(g);box(g,0,.5,0,1.63,.52,3.7,M.car);box(g,0,.93,-.15,1.4,.55,1.9,M.car);box(g,0,1.01,.825,1.27,.35,.025,M.glass);box(g,0,1.01,-1.12,1.27,.35,.025,M.glass);for(const a of [-1,1]){box(g,a*.708,1.04,-.15,.02,.35,1.68,M.glass);for(const b of [-1,1]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.19,24),M.black);tire.rotation.z=Math.PI/2;tire.position.set(a*.8,.32,b*1.17);g.add(tire);}box(g,a*.54,.57,1.86,.35,.12,.025,M.white);}}
function bike(f,x,z){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=Math.PI/2;f.furniture.add(g);for(const b of [-1,1]){const t=new THREE.Mesh(new THREE.TorusGeometry(.25,.065,8,18),M.black);t.rotation.y=Math.PI/2;t.position.set(0,.31,b*.57);g.add(t);}box(g,0,.63,0,.26,.23,.82,M.car);box(g,0,.79,-.13,.28,.1,.48,M.black);box(g,0,.83,.55,.65,.035,.035,M.metal);}
function slab(f){
  // Upper slabs leave a continuous opening for the common switchback stair.
  if(f.i===0)box(f.base,W/2,-.11,D/2,W,.22,D,M.stone);
  else{
    box(f.base,W/2,-.11,1.7,W,.22,3.4,M.stone);
    box(f.base,W/2,-.11,9.72,W,.22,3.76,M.stone);
    box(f.base,(W+2.56)/2,-.11,5.65,W-2.56,.22,4.5,M.stone);
    box(f.base,.10,-.11,5.65,.2,.22,4.5,M.stone);
  }
  for(const z of [0,D])box(f.base,W/2,-.23,z,W+.08,.04,.06,M.white);
  for(const x of [0,W])box(f.base,x,-.23,D/2,.06,.04,D,M.white);
}
function makeFloor(i){const f={i,root:new THREE.Group(),base:new THREE.Group(),walls:new THREE.Group(),furniture:new THREE.Group(),stairs:new THREE.Group(),doorGroup:new THREE.Group(),roof:new THREE.Group(),colliders:[]};f.root.add(f.base,f.walls,f.furniture,f.stairs,f.doorGroup,f.roof);f.root.position.y=elevations[i];house.add(f.root);floors.push(f);slab(f);return f;}
function terrace(f,x1,z1,x2,z2){room(f,'Open terrace','Open to sky',x1,z1,x2,z2,'#d7d8cd');for(let x=x1+.1;x<x2;x+=.42)box(f.base,x,.044,(z1+z2)/2,.009,.008,z2-z1,M.stone,false);}
function balcony(f,x1,z1,x2,z2,labelText){room(f,'Balcony',labelText,x1,z1,x2,z2,'#d2c9b6');box(f.base,x2-.06,.53,(z1+z2)/2,.1,1.05,z2-z1,M.white);}
function createModel(){
 for(const f of floors){house.remove(f.root);f.root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 floors.length=0;pickables.length=0;doors.length=0;for(const l of labels)l.el.remove();labels.length=0;
 for(let i=0;i<4;i++){
  const f=makeFloor(i);facade(f);stairCore(f);
  if(i===0){
   room(f,'Lobby','9′1″ × 8′5½″',4.55,.2,7.27,3.35,'#d4c6b4');
   room(f,'Parking','23′4″ depth',2.62,3.42,7.27,6.75,'#d7d9d0');car(f,4.55,4.75);for(let j=0;j<3;j++)bike(f,6.65,4.05+j*.82);
   room(f,'Living','13′11″ × 7′1″',.2,7.95,4.45,9.1,'#ddd8ca');
   room(f,'Bedroom','10′0″ × 10′5″',.2,9.1,3.35,11.35,'#d8c8b3');
   bathroom(f,3.38,9.48,4.65,11.35,'Toilet','4′0″ × 6′6″');
   room(f,'Kitchen','7′2″ × 8′3″',4.7,9.1,7.27,10.65,'#d8d9cf');
   room(f,'Utility','7′2″ × 4′3″',4.7,10.7,7.27,11.35,'#cdd4cd');
   wall(f,.12,9.07,4.65,9.07,[door(2.62,3.45,'Bedroom')]);
   wall(f,3.37,9.08,3.37,11.48,[door(.28,1.0,'Toilet')]);
   wall(f,4.66,9.08,4.66,11.48,[door(.3,1.2,'Kitchen')]);
   wall(f,4.66,10.68,7.35,10.68,[door(.6,1.45,'Utility')]);
   wall(f,4.5,6.75,4.5,9.08,[door(1.1,2.05,'Living')]);
   sofa(f,1.2,8.4,1.6,-Math.PI/2);table(f,2.8,8.55,.9,.6);bed(f,1.8,10.28,1.6,Math.PI/2);kitchen(f,4.85,9.25,2.2,1.2);
  }
  if(i===1){
   room(f,'Lobby','9′1″ × 7′9″',4.55,.2,7.27,3.35,'#d4c6b4');
   room(f,'Storage','Storage',.2,3.42,1.5,4.0,'#bdc6bc');
   room(f,'Dining','4′8″ × 9′6″',2.62,3.42,4.0,7.8,'#dfd3c2');
   room(f,'Living','14′3″ × 12′8½″',4.02,3.42,7.27,9.05,'#e1d9c8');
   room(f,'Bedroom','10′2″ × 10′5″',.2,8.05,3.5,11.35,'#d8c7b0');
   room(f,'Dressing','4′0″ × 3′1½″',3.52,9.08,4.62,10.0,'#c9baac');
   bathroom(f,3.52,10.04,4.62,11.35,'Toilet','4′0″ × 6′6″');
   room(f,'Kitchen','6′11½″ × 9′5½″',4.67,9.08,7.27,10.66,'#d8d9cf');
   room(f,'Utility','6′11½″ × 4′9″',4.67,10.7,7.27,11.35,'#cdd4cd');
   wall(f,.12,8.0,4.0,8.0,[door(2.78,3.58,'Bedroom')]);
   wall(f,3.48,9.04,3.48,11.48,[door(.45,1.25,'Dressing')]);
   wall(f,4.64,9.04,4.64,11.48,[door(.25,1.1,'Kitchen')]);
   wall(f,4.64,10.68,7.35,10.68,[door(.62,1.46,'Utility')]);
   wall(f,4.46,.12,4.46,3.4,[door(1.85,2.8,'Living')]);
   bed(f,1.65,9.85,1.75,Math.PI/2);sofa(f,5.9,5.65,2.25,Math.PI/2);table(f,5.65,7.15,.95,.65);table(f,3.3,5.6,1.02,1.5,.75);kitchen(f,4.8,9.25,2.28,1.2);
  }
  if(i===2){
   room(f,'Bedroom','11′1″ × 10′0″',2.62,.2,5.98,3.35,'#d8c6af');
   bathroom(f,.2,.2,2.52,1.55,'Toilet','6′0″ × 5′2″');
   room(f,'Walk-in wardrobe','6′0″ × 4′4″',.2,1.6,2.52,3.35,'#c9b9a6');
   balcony(f,6.03,.2,7.27,3.35,'4′4½″ × 10′0″');
   room(f,'Living','14′8″ × 13′5″',2.62,3.42,7.27,7.86,'#ded8cb');
   room(f,'Pooja','4′4½″ × 4′0″',6.18,3.55,7.27,4.58,'#e9d1cd');
   room(f,'Master bedroom','11′1″ × 10′5″',2.62,8.02,5.98,11.35,'#d8c6af');
   bathroom(f,.2,8.02,2.52,9.35,'Toilet','6′0″ × 4′9″');
   room(f,'Walk-in wardrobe','6′0″ × 5′2″',.2,9.4,2.52,11.35,'#c9b9a6');
   balcony(f,6.03,8.02,7.27,11.35,'4′4½″ × 11′2″');
   wall(f,2.58,.12,2.58,3.4,[door(2.14,2.99,'Bedroom')]);
   wall(f,2.58,7.96,2.58,11.48,[door(2.2,3.08,'Master bedroom')]);
   wall(f,.12,3.38,7.35,3.38,[door(3.45,4.3,'Living')]);
   wall(f,.12,7.93,7.35,7.93,[door(3.72,4.58,'Master bedroom')]);
   bed(f,4.1,1.82,1.73,Math.PI);bed(f,4.1,9.63,1.78,Math.PI);
   sofa(f,4.65,5.8,1.95,Math.PI/2);table(f,5.6,5.7,.9,.6);plant(f.furniture,6.8,4.9);
  }
  if(i===3){
   terrace(f,.2,.2,7.27,3.35);
   room(f,'Lobby','4′0″ × 12′8″',2.62,3.42,3.85,7.86,'#d4c7b3');
   terrace(f,3.9,3.42,7.27,7.86);
   room(f,'Bedroom','11′1″ × 10′5″',2.62,8.02,5.98,11.35,'#d8c6af');
   bathroom(f,.2,8.02,2.52,9.35,'Toilet','6′0″ × 4′9″');
   room(f,'Walk-in wardrobe','6′0″ × 5′2″',.2,9.4,2.52,11.35,'#c9b9a6');
   balcony(f,6.03,8.02,7.27,11.35,'4′4½″ × 11′2″');
   wall(f,.12,7.93,7.35,7.93,[door(3.72,4.58,'Bedroom')]);
   wall(f,2.58,7.96,2.58,11.48,[door(2.2,3.08,'Bedroom')]);
   box(f.roof,4.05,H+.1,9.72,6.2,.2,3.76,M.white);
   bed(f,4.1,9.63,1.78,Math.PI);for(const x of [4.3,6.65])for(const z of [4.1,6.8])plant(f.furniture,x,z);table(f,5.52,5.6,1,.9,.74);
  }
 }
 update();
}
const ground=box(scene,0,-.24,0,24,.12,24,mat('#dce3d5'));ground.castShadow=false;
const plinth=box(scene,0,.24,0,8.1,.48,12.1,M.stone);
const entry=box(scene,4.6,0,0,1.2,.09,12.1,mat('#c8cebf'));
for(let j=0;j<3;j++)box(scene,4+j*.26,.64-j*.16,0,.28,.16,2.1,M.stone);
const ambientGrid=new THREE.GridHelper(24,24,0xc4cdbf,0xd2dacb);ambientGrid.position.y=-.17;scene.add(ambientGrid);
const isGame=()=>view==='pov'||view==='follow';
function update(){
 renderNeeded=true;renderer.shadowMap.needsUpdate=true;
 const game=isGame(),all=selected==='all',explode=$('#explode').checked&&all,cut=$('#walls').value==='cut';
 for(const f of floors){
  f.root.visible=game||all||String(f.i)===selected;
  f.root.position.y=game?elevations[f.i]:(all?elevations[f.i]+(explode?f.i*2.4:0):.762);
  f.walls.traverse(o=>{if(!o.isMesh)return;if(!o.userData.wallBounds){const h=o.geometry.parameters.height;o.userData.wallBounds={y:o.position.y,h};}const b=o.userData.wallBounds,lo=b.y-b.h/2,hi=cut?Math.min(1.05,b.y+b.h/2):b.y+b.h/2;o.visible=hi>lo;o.scale.y=Math.max(.0001,(hi-lo)/b.h);o.position.y=(lo+hi)/2;});
  f.furniture.visible=$('#furniture').checked;
  f.stairs.visible=true;f.stairs.scale.y=game||all&&!explode?1:.28;
  f.roof.visible=game?f.i===3:$('#roof').checked&&(selected==='3'||all);
 }
 avatar.visible=view==='follow';
 $('#viewTitle').textContent=all?(explode?'Every level, revealed':'A home in four levels'):['Arrival & parking','Life on the first floor','The private retreat','A room above it all'][+selected];
 document.querySelectorAll('.floor').forEach(b=>b.classList.toggle('active',b.dataset.floor===selected));
 $('#explode').disabled=game||!all;$('#roof').disabled=game||!(all||selected==='3');
 $('#roomInfo').innerHTML='<strong>'+(all?'Shelar Residence':['Stilt','First floor','Second floor','Penthouse'][+selected])+'</strong><span>'+(game?'Walk through the rooms and use the staircase to change levels.':all?'Select a level to explore its rooms.':'Select a room to see its plan dimensions.')+'</span>';
}
function placeAtLevel(level){player.level=level;player.y=elevations[level];player.x=[5.4,5.15,4.55,5.15][level];player.z=[7.15,6.45,5.55,5.45][level];player.yaw=0;player.pitch=0;}
function setCamera(mode=view,reset=false){
 const wasGame=isGame();view=mode;const game=isGame();stage.classList.toggle('gaming',game);controls.enabled=!game;renderer.shadowMap.enabled=!game;renderer.setPixelRatio(game?1:Math.min(devicePixelRatio,2));renderer.setSize(stage.clientWidth,stage.clientHeight);camera.fov=mode==='pov'?69:mode==='follow'?63:38;camera.updateProjectionMatrix();avatar.visible=mode==='follow';
 $('#hint').textContent=game?'WASD / arrows · Drag to look · E: door · Wheel / + / −: zoom':'Drag to orbit · Wheel / + / − to zoom · Right-drag to pan';
 if(game){if(selected==='all')selected='1';if(!wasGame||reset)placeAtLevel(+selected);update();updateGameCamera();}
 else{update();const all=selected==='all',ex=$('#explode').checked&&all,cy=all?(ex?9:6.3):.85;controls.target.set(0,cy,0);const distance=(all?(ex?32:26):20)*Math.max(1,.95/camera.aspect);let q;if(mode==='top')q=[.001,cy+distance,.001];else if(mode==='front')q=[distance,cy+distance*.12,0];else q=[distance*.70,cy+distance*.77,distance*.86];camera.position.set(...q);camera.up.set(0,1,0);controls.update();}
 ['iso','top','front','pov','follow'].forEach(id=>$('#'+id).classList.toggle('active',id===mode));renderNeeded=true;
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(isGame())updateGameCamera();else setCamera(view);renderNeeded=true;}new ResizeObserver(resize).observe(stage);
function updateGameCamera(){
 const px=player.x-3.735,pz=player.z-5.8,y=player.y;avatar.position.set(px,y,pz);avatar.rotation.y=player.yaw+Math.PI;
 if(view==='pov'){camera.position.set(px,y+1.64,pz);camera.lookAt(px+Math.sin(player.yaw)*10*Math.cos(player.pitch),y+1.64+Math.sin(player.pitch)*10,pz-Math.cos(player.yaw)*10*Math.cos(player.pitch));}
 else if(view==='follow'){const back=player.followDistance,cx=px-Math.sin(player.yaw)*back,cz=pz+Math.cos(player.yaw)*back;camera.position.set(cx,y+2.2+player.pitch*.7,cz);camera.lookAt(px+Math.sin(player.yaw)*1.4,y+1.12,pz-Math.cos(player.yaw)*1.4);}
 renderNeeded=true;updateNearbyDoor();updateLocation();
}
function currentRoom(){if(player.x<2.55&&player.z>3.4&&player.z<7.9)return 'Staircase';const matches=pickables.filter(m=>m.userData.f.i===player.level&&Math.abs(m.position.x-player.x)<m.geometry.parameters.width/2&&Math.abs(m.position.z-player.z)<m.geometry.parameters.depth/2);matches.sort((a,b)=>a.geometry.parameters.width*a.geometry.parameters.depth-b.geometry.parameters.width*b.geometry.parameters.depth);return matches[0]?.userData.name||'Hallway';}
let lastLocation='';function updateLocation(){if(!isGame())return;const room=currentRoom(),text=player.level+'-'+room;if(text===lastLocation)return;lastLocation=text;$('#levelHud').textContent=['STILT','FIRST FLOOR','SECOND FLOOR','PENTHOUSE'][player.level];$('#roomHud').textContent=room;}
function updateNearbyDoor(){if(!isGame())return;nearDoor=null;let nearest=1.35;for(const d of doors){if(d.floor!==player.level)continue;const dist=Math.hypot(player.x-d.cx,player.z-d.cz);if(dist<nearest){nearest=dist;nearDoor=d;}}const button=$('#doorAction');button.classList.toggle('available',!!nearDoor);if(nearDoor)button.textContent=(nearDoor.target?'Close ':'Open ')+nearDoor.name+' · E';}
function toggleDoor(){if(!nearDoor)return;nearDoor.target=nearDoor.target?0:1;updateNearbyDoor();renderNeeded=true;}
function distanceToSegment(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-(ax+t*dx),z-(az+t*dz));}
function blocked(x,z){if(x<.3||x>7.16||z<.3||z>11.3)return true;const level=Math.min(3,Math.max(0,player.level));for(const line of floors[level].colliders){if(distanceToSegment(x,z,...line)<.20)return true;}for(const d of doors){if(d.floor!==level||d.target)continue; if(distanceToSegment(x,z,d.x1,d.z1,d.x2,d.z2)<.20)return true;}return false;}
function stairHeight(x,z){
 if(x<.35||x>2.43||z<3.30||z>7.75)return null;
 let fraction;
 if(z<3.55)fraction=.5;
 else if(x<=1.28)fraction=.5*(7.75-z)/4.2;
 else if(x>=1.50)fraction=.5+.5*(z-3.55)/4.2;
 else return null;
 fraction=Math.max(0,Math.min(1,fraction));
 let candidate=null,distance=Infinity;
 for(let base=0;base<3;base++){const y=elevations[base]+RISE*fraction,delta=Math.abs(y-player.y);if(delta<distance){distance=delta;candidate=y;}}
 return candidate;
}
function movePlayer(dt){
 if(!isGame())return false;
 const forward=(pressed.has('KeyW')||pressed.has('ArrowUp')?1:0)-(pressed.has('KeyS')||pressed.has('ArrowDown')?1:0),right=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0);
 if(!forward&&!right)return false;
 const speed=(pressed.has('ShiftLeft')?3.25:1.8)*dt/Math.hypot(forward,right),dx=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*right)*speed,dz=(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*right)*speed;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));let moved=false;
 for(let n=0;n<steps;n++){
  for(const axis of ['x','z']){const nx=player.x+(axis==='x'?dx/steps:0),nz=player.z+(axis==='z'?dz/steps:0);if(blocked(nx,nz))continue;const stair=stairHeight(nx,nz),target=stair??elevations[player.level];if(Math.abs(target-player.y)>.32)continue;player.x=nx;player.z=nz;player.y=target;moved=true;}
 }
 const newLevel=Math.max(0,Math.min(3,elevations.reduce((level,height,i)=>player.y>=height-.08?i:level,0)));
 if(newLevel!==player.level){player.level=newLevel;selected=String(newLevel);update();}
 if(moved)updateGameCamera();return moved;
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
 if(characterMixer){characterMixer.update(dt);if(moving){if(idleAction?.isRunning())idleAction.fadeOut(.15);if(walkAction&&!walkAction.isRunning())walkAction.reset().fadeIn(.15).play();}else{if(walkAction?.isRunning())walkAction.fadeOut(.15);if(idleAction&&!idleAction.isRunning())idleAction.reset().fadeIn(.15).play();}if(view==='follow')renderNeeded=true;}
 for(const d of doors){const desired=d.target?-1.37:0;if(Math.abs(d.angle-desired)>.005){d.angle+=(desired-d.angle)*Math.min(1,dt*10);d.leaf.rotation.y=d.angle;renderNeeded=true;}}
 for(const l of labels){const show=!isGame()&&$('#labelToggle').checked&&l.f.root.visible&&(selected!=='all'||$('#explode').checked);l.el.style.display=show?'block':'none';if(show){v.copy(l.p);l.f.root.localToWorld(v);v.project(camera);if(v.z>1||v.z< -1){l.el.style.display='none';continue;}l.el.style.left=((v.x+1)*stage.clientWidth/2)+'px';l.el.style.top=((-v.y+1)*stage.clientHeight/2)+'px';}}
 if(renderNeeded){renderer.render(scene,camera);renderNeeded=false;}
}
for(const btn of document.querySelectorAll('[data-floor]'))btn.onclick=()=>{const next=btn.dataset.floor;if(isGame()&&next!=='all')placeAtLevel(+next);selected=next;if(next==='all'&&isGame())view='iso';$('#walls').value=next==='all'||view==='pov'?'full':'cut';$('#roof').checked=next==='all';setCamera(view);};
for(const id of ['iso','top','front','pov','follow'])$('#'+id).onclick=()=>{if(id==='pov')$('#walls').value='full';if(id==='follow')$('#walls').value='cut';setCamera(id);};
for(const id of ['walls','furniture','labelToggle','roof'])$('#'+id).onchange=update;
$('#explode').onchange=()=>{if($('#explode').checked){$('#walls').value='cut';$('#roof').checked=false;}update();setCamera();};
$('#reset').onclick=()=>setCamera(view,true);
$('#zoomIn').onclick=()=>zoomBy(1);$('#zoomOut').onclick=()=>zoomBy(-1);
$('#doorAction').onclick=toggleDoor;
renderer.domElement.addEventListener('wheel',e=>{if(isGame()){e.preventDefault();zoomBy(e.deltaY<0?1:-1);}}, {passive:false});
$('#save').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='Shelar-residence-'+(selected==='all'?'house':'floor-'+selected)+'.png';a.click();};
$('#source').onclick=()=>{const p=selected==='all'?1:+selected+1;$('#planImage').src='plans/page-'+p+'.png';$('#planTitle').textContent='Source drawing · Page '+p+' of 4';$('#planDialog').showModal();};$('#closeDialog').onclick=()=>$('#planDialog').close();
const moveKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft']);window.addEventListener('keydown',e=>{if(!isGame()||e.target.closest('input,select,textarea'))return;if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)toggleDoor();return;}if(e.code==='Equal'||e.code==='NumpadAdd'){e.preventDefault();zoomBy(1);return;}if(e.code==='Minus'||e.code==='NumpadSubtract'){e.preventDefault();zoomBy(-1);return;}if(moveKeys.has(e.code)){e.preventDefault();pressed.add(e.code);}});window.addEventListener('keyup',e=>pressed.delete(e.code));window.addEventListener('blur',()=>pressed.clear());for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pressed.add(b.dataset.move);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>pressed.delete(b.dataset.move));}
let down;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];if(view==='pov'||view==='follow'){dragLook=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);}});renderer.domElement.addEventListener('pointermove',e=>{if(!dragLook)return;const dx=e.clientX-dragLook[0],dy=e.clientY-dragLook[1];player.yaw-=dx*.005;player.pitch=Math.max(-.6,Math.min(.6,player.pitch-dy*.004));dragLook=[e.clientX,e.clientY];updateGameCamera();});renderer.domElement.addEventListener('pointercancel',()=>dragLook=null);renderer.domElement.addEventListener('pointerup',e=>{dragLook=null;if(view==='pov'||view==='follow')return;if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(pickables.filter(p=>p.userData.f.root.visible))[0];if(!hit)return;if(highlight)highlight.material.emissive.setHex(0);highlight=hit.object;highlight.material.emissive.setHex(0x15281a);renderNeeded=true;const d=hit.object.userData;$('#roomInfo').innerHTML='<strong>'+d.name+'</strong><span>'+d.dim+'<br>Dimensions shown on the supplied plan.</span>';});
createModel();resize();setCamera();frame(performance.now());window.__house={scene,floors,renderer,camera,controls,pickables,labels,doors,player,stairHeight,movePlayer,blocked,zoomBy,setCamera,placeAtLevel};
