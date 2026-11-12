(() => {
'use strict';
const T=THREE,$=id=>document.getElementById(id),canvas=$('view'),params=new URLSearchParams(location.search),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const number=(k,d,a,b)=>params.has(k)&&Number.isFinite(Number(params.get(k)))?clamp(Number(params.get(k)),a,b):d;
let time=number('t',18,0,86400),wind=number('wind',1,0,2),speed=number('speed',1,.25,2),paused=params.has('still')?params.get('still')==='1':reduced.matches;
let weather=['clear','mist','rain'].includes(params.get('weather'))?params.get('weather'):'clear',orbit=params.get('orbit')==='1';
let raf=0,last=0,frames=0,lost=false,yaw=number('angle',-.60,-6.3,6.3),pitch=.69,zoom=1,drag=null,view='garden',activeRoof='';
const INITIAL_YAW=-.60,INITIAL_PITCH=.69,TAU=Math.PI*2,uniformTime={value:time},uniformWind={value:wind};
let randomSeed=80127;const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};const rr=(a,b)=>a+(b-a)*random();
let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;return;}
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const scene=new T.Scene();scene.background=new T.Color('#d6dacd');scene.fog=new T.Fog('#d6dacd',65,140);
const camera=new T.OrthographicCamera(-24,24,15,-15,.1,160),target=new T.Vector3(0,1.0,0);
const hemi=new T.HemisphereLight('#fff2cf','#718275',2.1);scene.add(hemi);
const sun=new T.DirectionalLight('#ffe4ae',3.5);sun.position.set(-14,26,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:80});sun.shadow.bias=-.00035;sun.shadow.normalBias=.045;sun.shadow.radius=3;scene.add(sun);
const fill=new T.DirectionalLight('#b8d1d3',.65);fill.position.set(15,12,-15);scene.add(fill);
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.83,...extra});
const M={base:mat('#4b5047'),trim:mat('#9e9a78',{metalness:.25}),soil:mat('#7e8666'),grass:mat('#8c9d6b'),sand:mat('#c9c6a5'),pond:mat('#457b65'),rock:mat('#929b86',{flatShading:true}),stone:mat('#aaa98c'),lightstone:mat('#d0cbb0'),darkstone:mat('#747b66'),moss:mat('#62794b'),wall:mat('#e8e0c3'),wallshadow:mat('#c7c5aa'),roof:mat('#394c48'),tile:mat('#52635a'),tileedge:mat('#6d7b6b'),wood:mat('#68523a'),woodlight:mat('#9a8057'),wooddark:mat('#423c2d'),leaf:mat('#537d43'),leaf2:mat('#7f9b54'),pine:mat('#3c6945'),pink:mat('#d3b5a2'),lotus:mat('#728e4f',{side:T.DoubleSide}),flower:mat('#e8b9aa'),gold:mat('#c3ab71',{metalness:.3}),black:mat('#253a34')};
for(const key of ['leaf','leaf2','pine','pink']){M[key].onBeforeCompile=shader=>{shader.uniforms.gardenTime=uniformTime;shader.uniforms.gardenWind=uniformWind;shader.vertexShader='uniform float gardenTime; uniform float gardenWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(gardenTime * 0.8 + instanceMatrix[3].x * 1.7 + instanceMatrix[3].z) * 0.075 * gardenWind; transformed.z += cos(gardenTime * 0.64 + instanceMatrix[3].y * 2.0) * 0.045 * gardenWind;');};}
const geo={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,10),taper:new T.CylinderGeometry(.55,1,1,9),sphere:new T.IcosahedronGeometry(1,1),pebble:new T.IcosahedronGeometry(1,0),leaf:new T.SphereGeometry(1,7,5),cone:new T.ConeGeometry(1,1,8)};
const pools=new Map(),dummy=new T.Object3D(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),va=new T.Vector3(),vb=new T.Vector3();
function instance(type,material,x,y,z,sx,sy,sz,rotation=null,color=null){const key=type+':'+material+':'+activeRoof;let pool=pools.get(key);if(!pool){pool={type,material,roof:activeRoof,items:[]};pools.set(key,pool);}dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,0);if(rotation instanceof T.Quaternion)dummy.quaternion.copy(rotation);else if(rotation)dummy.rotation.set(...rotation);dummy.updateMatrix();pool.items.push({matrix:dummy.matrix.clone(),color:color?new T.Color(color):null});}
const box=(m,x,y,z,w,h,d,rot=0)=>instance('box',m,x,y,z,w,h,d,[0,rot,0]);
const ball=(m,x,y,z,sx,sy=sx,sz=sx)=>instance('sphere',m,x,y,z,sx,sy,sz,[rr(-.3,.3),rr(0,6.28),rr(-.3,.3)]);
function beam(a,b,r,m='wood',type='cyl'){va.set(...a);vb.set(...b);const length=va.distanceTo(vb);q.setFromUnitVectors(up,vb.clone().sub(va).normalize());instance(type,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,length,r,q);}
function mesh(geometry,material,position=[0,0,0]){const o=new T.Mesh(geometry,typeof material==='string'?M[material]:material);o.position.set(...position);o.castShadow=true;o.receiveShadow=true;o.userData.roof=activeRoof;scene.add(o);return o;}
function flush(){for(const pool of pools.values()){const o=new T.InstancedMesh(geo[pool.type],M[pool.material],pool.items.length),hasColor=pool.items.some(item=>item.color);pool.items.forEach((item,i)=>{o.setMatrixAt(i,item.matrix);if(hasColor)o.setColorAt(i,item.color||new T.Color('#ffffff'));});o.userData.roof=pool.roof;o.castShadow=!['lotus','flower'].includes(pool.material);o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();scene.add(o);}pools.clear();}
function polygon(points){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();return shape;}
function slab(shape,depth,material,y){const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:48});geometry.rotateX(-Math.PI/2);return mesh(geometry,material,[0,y-depth,0]);}
/* GARDEN_NATURE */
/* GARDEN_ARCHITECTURE */
// A solid exhibition plinth: soil and pond are actual geometry above its upper face.
box('base',0,-.67,0,28.2,.95,22.2);box('trim',0,-.16,0,28.35,.10,22.35);box('base',0,-.06,0,28.0,.12,22.0);box('soil',0,.16,0,27.0,.32,21.0);
box('wooddark',0,-1.18,0,26.6,.13,20.6);
const floor=mesh(new T.PlaneGeometry(240,240),mat('#d6dacd'),[0,-1.29,0]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
// Broad contact shadow under the display, combined with the real sun shadow.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const sg=shadowCanvas.getContext('2d'),shadowGrad=sg.createRadialGradient(64,64,20,64,64,64);shadowGrad.addColorStop(0,'rgba(29,43,31,.35)');shadowGrad.addColorStop(1,'rgba(29,43,31,0)');sg.fillStyle=shadowGrad;sg.fillRect(0,0,128,128);const shadow=mesh(new T.PlaneGeometry(43,35),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),[0,-1.27,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
const pondCurve=new T.CatmullRomCurve3([[-8,-2.4],[-6.2,-4.6],[-2,-4.1],[1.5,-3.8],[4.4,-1.1],[3.2,3.4],[.8,5.7],[-4.9,5.6],[-8.0,2.4]].map(([x,z])=>new T.Vector3(x,0,z)),true,'catmullrom',.4);
const shorePoints=pondCurve.getPoints(180).slice(0,-1).map(p=>[p.x,p.z]);
const ground=polygon([[-13.5,-10.5],[13.5,-10.5],[13.5,10.5],[-13.5,10.5]]);ground.holes.push(new T.Path(polygon(shorePoints).getPoints()));slab(ground,.32,'grass',.64);
slab(polygon(shorePoints),.08,'pond',.28);
for(let i=0;i<230;i++){const p=pondCurve.getPoint(i/230);ball(i%4?'stone':'darkstone',p.x,.58+rr(-.03,.05),p.z,rr(.18,.33),rr(.12,.23),rr(.17,.3));if(i%3===0)ball('moss',p.x+.06,.75,p.z,.17,.035,.13);}
/* GARDEN_WATER */
// Individual paving stones form continuous paths around the pond and buildings.
function paving(points,width=1.1){bluestonePaving(points,width);}
paving([[-11,8.4],[-9,4.7],[-9.7,-1.8],[-10,-6.4],[-5.7,-7],[0,-7],[7,-7],[9.4,-4],[9.3,3.4],[8,7.6],[3.8,8],[-3,8],[-11,8.4]],1.25);
paving([[3.8,8],[3.3,5],[3.1,3.5]],1);paving([[-9,4.7],[-7.6,3.5]],1.2);paving([[7,-7],[7,-3.7]],1.0);
// Roofs are curved four-sided meshes, with modeled tile rolls following each slope.
function roof(x,z,y,w,d,h){layeredRoof(x,z,y,w,d,h);}
function lattice(x,z,y,w,h,rotation=0){const dir=new T.Vector3(Math.cos(rotation),0,-Math.sin(rotation));const at=(u,v)=>[x+dir.x*u,y+v,z+dir.z*u];for(const v of [-h/2,h/2])beam(at(-w/2,v),at(w/2,v),.035,'woodlight');for(const u of [-w/2,w/2])beam(at(u,-h/2),at(u,h/2),.035,'woodlight');for(let u=-w/2+.16;u<w/2;u+=.22)beam(at(u,-h/2),at(u,h/2),.018,'woodlight');for(let v=-h/2+.2;v<h/2;v+=.27)beam(at(-w/2,v),at(w/2,v),.018,'woodlight');}
function railing(a,b,y){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.62);for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;box('wood',x,y+.3,z,.07,.6,.07);ball('woodlight',x,y+.63,z,.06);}for(const h of [.15,.52])beam([a[0],y+h,a[1]],[b[0],y+h,b[1]],.035,'woodlight');}
function plaque(x,y,z,text,width){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#394536';g.fillRect(0,0,512,128);g.strokeStyle='#c4aa70';g.lineWidth=5;g.strokeRect(10,9,492,110);g.fillStyle='#dfcc95';g.font='68px KaiTi, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,67);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;mesh(new T.PlaneGeometry(width,width/4),new T.MeshStandardMaterial({map:tex,roughness:.8}),[x,y,z]);}
function pavilion(x,z,w=3.6,d=3.6,y=.78,double=false){box('darkstone',x,y-.07,z,w+.55,.24,d+.55);box('lightstone',x,y+.08,z,w+.7,.10,d+.7);for(const dx of [-w*.39,w*.39])for(const dz of [-d*.39,d*.39]){instance('cyl','wood',x+dx,y+1.4,z+dz,.095,2.65,.095);instance('cyl','lightstone',x+dx,y+.22,z+dz,.16,.25,.16);for(const sign of [-1,1]){beam([x+dx,y+2.05,z+dz],[x+dx+sign*.37,y+2.55,z+dz],.055,'woodlight');beam([x+dx,y+2.05,z+dz],[x+dx,y+2.55,z+dz+sign*.37],.055,'woodlight');}}
 for(const dz of [-d*.39,d*.39])timberFrame(x,z+dz,w*.78,y+2.50,0);for(const dx of [-w*.39,w*.39])timberFrame(x+dx,z,d*.78,y+2.38,Math.PI/2);
 roof(x,z,y+2.67,w+1.1,d+1.1,1.05);if(double)roof(x,z,y+3.65,w*.72,d*.72,.85);
 railing([x-w*.39,z-d*.39],[x+w*.39,z-d*.39],y+.14);railing([x-w*.39,z-d*.39],[x-w*.39,z+d*.39],y+.14);railing([x+w*.39,z-d*.39],[x+w*.39,z+d*.39],y+.14);
 for(const dx of [-w*.3,w*.3]){box('woodlight',x+dx,y+.58,z,.27,.09,d*.65);box('wood',x+dx,y+.32,z-.7,.08,.5,.09);box('wood',x+dx,y+.32,z+.7,.08,.5,.09);}
 instance('cyl','stone',x,y+.65,z,.43,.15,.43);instance('cyl','darkstone',x,y+.37,z,.14,.5,.14);for(const dz of [-.72,.72]){instance('cyl','stone',x,y+.265,z+dz,.165,.27,.165);instance('cyl','woodlight',x,y+.425,z+dz,.17,.05,.17);}
 ball('wooddark',x,y+.82,z,.11,.09,.09);beam([x+.04,y+.85,z],[x+.17,y+.88,z],.025,'wooddark');ball('gold',x+.22,y+.76,z+.1,.045,.04,.045);
 plaque(x,y+2.36,z+d*.4+.015,'聽 雨',1.15);
}
// A hall with a covered front veranda and carved gridded windows.
function hall(){doubleDoorHall();}
hall();pavilion(7.0,4.8,3.5,3.5,.85,true);
for(let i=0;i<3;i++)box('lightstone',6.3,.78-i*.11,7.0+i*.24,1.7+i*.12,.15,.32);
// Open gallery turns the eastern corner and joins the main hall to the waterside pavilion.
function gallery(x,z,length,angle=0){const v=(a,b)=>[x+Math.cos(angle)*a-Math.sin(angle)*b,z+Math.sin(angle)*a+Math.cos(angle)*b];box('lightstone',x,.79,z,length,.18,1.5,-angle);const count=Math.ceil(length/1.3);for(let i=0;i<=count;i++)for(const side of [-1,1]){const p=v(-length/2+i*length/count,side*.59);instance('cyl','wood',p[0],1.85,p[1],.055,2.0,.055);instance('cyl','lightstone',p[0],.96,p[1],.095,.19,.095);}if(angle===0)roof(x,z,2.92,length+.55,2.0,.6);else{ // Build along the same axes then rotate the roof's collected primitives and meshes.
 const oldCounts=new Map([...pools].map(([k,p])=>[k,p.items.length])),oldChildren=scene.children.length;
 roof(0,0,2.92,length+.55,2,.6);const transform=new T.Matrix4().makeRotationY(-angle);transform.setPosition(x,0,z);
 for(const [key,p]of pools)for(let i=oldCounts.get(key)||0;i<p.items.length;i++)p.items[i].matrix.premultiply(transform);
 for(let i=oldChildren;i<scene.children.length;i++)scene.children[i].applyMatrix4(transform);
 }const a=v(-length/2,.6),b=v(length/2,.6);railing(a,b,.89);
 for(let i=0;i<=count;i++){const p=v(-length/2+i*length/count,0);timberFrame(p[0],p[1],1.18,2.62,angle+Math.PI/2);}
 for(const side of [-1,1]){const p=v(0,side*.59);box('wood',p[0],2.77,p[1],length+.22,.13,.12,-angle);}
}
gallery(9.35,-2.5,6.7,Math.PI/2);gallery(7.6,-5.85,3.5);
// Thick plaster walls: the circular opening is a real hole through extruded geometry.
function moonWall(){const x=-10.65,z=-4.9,w=5.2,h=2.8;const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();const hole=new T.Path();hole.absarc(0,1.23,1.15,0,TAU,true);s.holes.push(hole);const g=new T.ExtrudeGeometry(s,{depth:.32,bevelEnabled:false,curveSegments:64});const o=mesh(g,'wall',[x,.65,z]);o.rotation.y=Math.PI/2;
 const ring=new T.Mesh(new T.TorusGeometry(1.17,.07,8,64),M.lightstone);ring.position.set(x+.34,1.88,z);ring.rotation.y=Math.PI/2;ring.castShadow=true;scene.add(ring);
 // Curved wall cap and individual capping tiles.
 for(let i=0;i<35;i++){const zz=z-w/2+i*w/34,yy=3.52+.12*Math.cos(i/34*TAU);box('roof',x+.16,yy,zz,.60,.11,.16);beam([x-.12,yy+.08,zz],[x+.45,yy+.08,zz],.04,'tileedge');}
 paving([[-12,-4.9],[-9.5,-4.9],[-8.7,-4.3]],1.2);
}
moonWall();
// Rear boundary with framed perforated diamond windows.
box('wall',-7.2,1.72,-9.25,9.4,2.15,.28);for(let i=0;i<4;i++){const x=-10.3+i*2.05;box('wooddark',x,1.9,-9.08,1.15,1.0,.02);lattice(x,-9.05,1.9,1.04,.88);}
for(let i=0;i<65;i++){const x=-11.9+i*.146;box('roof',x,2.86,-9.25,.15,.12,.63);beam([x,2.94,-9.54],[x,2.94,-8.96],.032,'tileedge');}
// Stone arch bridge with modeled vault, deck blocks, balusters and continuous rails.
const bridgeX=-2.1,bridgeZ=3.45,bridgeLength=10.7;
function bridgeHeight(u){return .86+1.37*Math.pow(Math.sin(Math.PI*u),1.25);}
for(let i=0;i<40;i++){const u=(i+.5)/40,x=bridgeX+(u-.5)*bridgeLength,y=bridgeHeight(u),derivative=(bridgeHeight(Math.min(1,u+.002))-bridgeHeight(Math.max(0,u-.002)))/(.004*bridgeLength);instance('box',i%7?'lightstone':'stone',x,y,bridgeZ,bridgeLength/40+.012,.23,1.35,[0,0,Math.atan(derivative)]);for(const side of [-1,1]){box('stone',x,y-.19,bridgeZ+side*.66,bridgeLength/40+.015,.28,.12);}}
for(const side of [-1,1]){for(let i=0;i<=20;i++){const u=i/20,x=bridgeX+(u-.5)*bridgeLength,y=bridgeHeight(u);box('lightstone',x,y+.45,bridgeZ+side*.63,.105,.75,.105);ball('lightstone',x,y+.86,bridgeZ+side*.63,.085,.075,.085);if(i<20){const v=(i+1)/20,nx=bridgeX+(v-.5)*bridgeLength,ny=bridgeHeight(v);for(const h of [.34,.78])beam([x,y+h,bridgeZ+side*.63],[nx,ny+h,bridgeZ+side*.63],.045,'lightstone');}}}
// Sculptural limestone grottoes with dark recesses, erosion ribs and moss at their feet.
function rock(x,z,s=1){
 naturalRock(x,z,s);
}
rock(3.4,-1.7,1.4);rock(4.2,-.9,.85);rock(2.8,-2.3,.85);rock(-8.7,1.3,1.15);rock(-9.2,1.9,.65);rock(10.7,6.9,1.3);rock(11.6,7.4,.7);
// Trees use tapered branching trunks and hundreds of small three-dimensional foliage clusters.
function tree(x,z,s=1,kind='leaf'){naturalTree(x,z,s,kind);}
tree(-11.4,6.3,1.25,'pine');tree(-11.6,-1.4,1.0,'leaf2');tree(-7.6,-7.6,.92,'pine');tree(-4.6,-8.3,.8,'leaf2');tree(11.2,-7.4,1.25,'pine');tree(11.4,-3.1,.95,'leaf');tree(11.9,2.1,.95,'leaf2');tree(10.7,8.6,1.13,'pine');tree(-5.7,8.6,.82,'pink');tree(.7,8.9,.95,'leaf2');
// Willow: gracefully drooping 3D stems. Their leaf clusters sway in the foliage shader.
naturalWillow(-6.9,-2.4);
// Bamboo grove behind the moon gate, kept sparse enough to see its opening.
for(let i=0;i<28;i++){const x=rr(-12.9,-11.2),z=rr(-8.6,-6.1),h=rr(1.5,3.5);instance('cyl','moss',x,.65+h/2,z,.028,h,.028);for(let j=1;j<6;j++){const y=.65+h*j/6;instance('cyl','leaf2',x,y,z,.036,.04,.036);for(let k=0;k<3;k++){const a=random()*TAU;beam([x,y,z],[x+Math.cos(a)*.35,y+.2,z+Math.sin(a)*.35],.009,'moss');instance('leaf','leaf',x+Math.cos(a)*.4,y+.25,z+Math.sin(a)*.4,.23,.025,.055,[.2,a,-.4]);}}}
// Low shrubs, flowering tufts and individual gravel surround paths without blocking them.
for(const [x,z]of [[-11,3],[-12.2,8],[-8,8.8],[-3.5,9.3],[4.1,9],[8.7,8.7],[12,4.9],[11,-.1],[10.8,-9],[-1,-9.6],[-8.3,-6.6]])naturalShrub(x,z);
for(let i=0;i<230;i++){const p=pondCurve.getPoint(random()),offset=rr(.22,.55),x=p.x+(p.x+2)*offset*.08,z=p.z+p.z*offset*.08;instance('pebble','lightstone',x,.73,z,rr(.03,.08),rr(.02,.04),rr(.03,.07));}
for(let i=0;i<540;i++){const side=i%4,x=side<2?rr(-12.8,12.8):(side===2?-12.8:12.8),z=side<2?(side===0?-10.0:10.0):rr(-10,10);for(let j=0;j<3;j++)instance('botleaf','herb',x+rr(-.10,.10),.65,z+rr(-.10,.10),.025,.06,rr(.15,.30),[rr(-1.3,-.7),rr(0,TAU),rr(-.3,.3)]);}
function lantern(x,z){box('darkstone',x,.73,z,.55,.15,.55);instance('taper','stone',x,1.1,z,.16,.65,.16);box('lightstone',x,1.5,z,.51,.12,.51);box('stone',x,1.78,z,.38,.5,.38);box('gold',x,1.79,z+.198,.21,.29,.018);box('wooddark',x,1.79,z+.212,.025,.30,.025);instance('cone','darkstone',x,2.14,z,.48,.32,.48,[0,Math.PI/4,0]);ball('stone',x,2.36,z,.075,.13,.075);}
lantern(-9.1,5.2);lantern(4.1,6.8);lantern(-4.7,-5.3);lantern(10.3,-4.5);
// Sunflower patch in the former dry courtyard.
plantSunflowers();plantReeds();
instance('cyl','darkstone',-11.4,.94,3.6,.39,.53,.39);instance('cyl','lightstone',-11.4,1.23,3.6,.52,.12,.52);instance('cyl','black',-11.4,1.30,3.6,.39,.014,.39);instance('cyl','lotus',-11.4,1.315,3.6,.31,.008,.31);
// Lotus leaves and modeled petal blossoms on the surface of the pond.
plantLotuses();plantMeadow();
// Small inset maker's plaque on the front face of the pedestal.
box('trim',0,-.66,11.14,2.5,.43,.035);plaque(0,-.65,11.166,'聽 雨 園',2.15);
finishPaving();flush();
// Nine koi are real meshes below the semitransparent water surface.
const koi=createKoi();
/* GARDEN_LIFE */
// Rain is a bounded line buffer, updated only in rainy weather.
const rainPositions=new Float32Array(350*6),rainSeeds=Array.from({length:350},()=>[rr(-13,13),rr(0,13),rr(-10,10)]),rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#c1d6cf',transparent:true,opacity:.42,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
const ripples=[];for(let i=0;i<18;i++){const ring=new T.Mesh(new T.RingGeometry(.96,1,48),new T.MeshBasicMaterial({color:'#d5ecce',transparent:true,opacity:.15,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.renderOrder=4;ring.position.set(-2.5+Math.cos(i*2.4)*2.6,.505,.3+Math.sin(i*2.4)*2.3);scene.add(ring);ripples.push(ring);}
function setWeather(){const mist=weather==='mist',wet=weather==='rain';sun.intensity=wet?1.25:mist?2.0:2.7;hemi.intensity=wet?1.55:1.8;sun.color.set(wet?'#d2e3d8':'#ffe4ae');scene.background.set(wet?'#bdc9c1':mist?'#dce0d2':'#d6dacd');scene.fog.color.copy(scene.background);scene.fog.near=mist?36:65;scene.fog.far=mist?95:140;rain.visible=wet;renderer.shadowMap.needsUpdate=true;}
const viewPresets={residents:{target:[-4.5,2.4,3.45],height:1.6,yaw:-.6,pitch:.30},sunflowers:{target:[6.5,1.1,-.9],height:2.8,yaw:-.6,pitch:.73},nest:{target:[4.5,3.10,-5.5],height:.65,yaw:-.50,pitch:.15},water:{target:[-.7,1,1.8],height:5.8,yaw:-1.95,pitch:.40},courtyard:{target:[6.5,1.1,-1.2],height:3.7,yaw:-.1,pitch:.85},cat:{target:[1,4.6,-6.5],height:1.25,yaw:-.3,pitch:.70},garden:{target:[0,1,0],height:15,yaw:-.60,pitch:.69},architecture:{target:[3.0,2.3,-5.8],height:4.8,yaw:-.30,pitch:.29},trees:{target:[-10.2,2.1,4.7],height:4.8,yaw:-.72,pitch:.45},rock:{target:[3.2,1.7,-1.5],height:3.8,yaw:-.5,pitch:.45},fishing:{target:[-2.6,1.45,6.1],height:2.0,yaw:2.1,pitch:.65},chess:{target:[7,1.8,4.8],height:3.4,yaw:-.6,pitch:.48},lotus:{target:[-4.4,.9,-.9],height:3.5,yaw:-.50,pitch:.66}};
function showRoof(show){for(const o of scene.children)if(o.userData.roof==='pavilion')o.visible=show;renderer.shadowMap.needsUpdate=true;}
function setView(name){view=Object.hasOwn(viewPresets,name)?name:'garden';const p=viewPresets[view];target.set(...p.target);yaw=p.yaw;pitch=p.pitch;zoom=1;$('viewpoint').value=view;$('roof').checked=view!=='chess';showRoof(view!=='chess');updateCamera();render();}
function updateCamera(){const aspect=innerWidth/innerHeight,base=viewPresets[view].height,halfHeight=Math.max(base,base*4/3/aspect)/zoom;camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();camera.position.set(target.x+Math.sin(yaw)*45*Math.cos(pitch),Math.sin(pitch)*45+target.y,target.z+Math.cos(yaw)*45*Math.cos(pitch));camera.lookAt(target);}
function render(){if(lost)return;uniformTime.value=time;uniformWind.value=wind;updateGardenLife(time);updateKoi(time);
 for(let i=0;i<ripples.length;i++){const r= ripples[i],u=(time*.27+i*.31)%1;r.scale.setScalar(.05+u*.75);r.material.opacity=(1-u)*(weather==='rain'?.30:.11);}
 if(weather==='rain'){for(let i=0;i<rainSeeds.length;i++){const [x,y,z]=rainSeeds[i],h=(y-time*6%13+13)%13;rainPositions.set([x,h,z,x-.10-wind*.1,h+.45,z+.04],i*6);}rainGeo.attributes.position.needsUpdate=true;}
 renderReflection();renderer.render(scene,camera);frames++;}
function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(2800000/(innerWidth*innerHeight))));renderer.setSize(innerWidth,innerHeight,false);resizeReflection();updateCamera();render();}
function schedule(){if(!paused&&!document.hidden&&!lost&&!raf)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(paused||document.hidden||lost)return;if(!last)last=now;const dt=(now-last)/1000;if(dt>=1/31){const step=Math.min(dt,.1)*speed;time+=step;last=now;if(orbit&&!drag){yaw+=step*.028;updateCamera();}render();}schedule();}
function sync(){cancelAnimationFrame(raf);raf=0;last=0;$('pause').textContent=paused?'繼續':'暫停';schedule();}
function togglePause(){paused=!paused;sync();}
function reset(){setView('garden');}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}}
const pointers=new Map();let pinchDistance=0;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)zoom=clamp(zoom*distance/pinchDistance,.65,2.6);pinchDistance=distance;}else if(drag){yaw-=(e.clientX-drag.x)*.006;pitch=clamp(pitch+(e.clientY-drag.y)*.004,.28,1.35);}drag={x:e.clientX,y:e.clientY};updateCamera();render();});
function release(e){pointers.delete(e.pointerId);const remaining=pointers.values().next().value;drag=remaining?{...remaining}:null;pinchDistance=0;}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.65,2.6);updateCamera();render();},{passive:false});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;sync();$('error').textContent='三維渲染暫時中斷，正在等待顯卡恢復…';$('error').hidden=false;});canvas.addEventListener('webglcontextrestored',()=>{lost=false;$('error').hidden=true;renderer.shadowMap.needsUpdate=true;resize();sync();});
$('settings').addEventListener('click',()=>{const open=$('panel').hidden;$('panel').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));});
$('weather').value=weather;$('wind').value=wind;$('speed').value=speed;$('orbit').checked=orbit;
$('viewpoint').addEventListener('change',e=>setView(e.target.value));$('roof').addEventListener('change',e=>{showRoof(e.target.checked);render();});
$('weather').addEventListener('change',e=>{weather=e.target.value;setWeather();render();});$('wind').addEventListener('input',e=>{wind=Number(e.target.value);render();});$('speed').addEventListener('input',e=>{speed=Number(e.target.value);});$('orbit').addEventListener('change',e=>{orbit=e.target.checked;});$('pause').addEventListener('click',togglePause);$('reset').addEventListener('click',reset);$('fullscreen').addEventListener('click',fullscreen);
addEventListener('resize',resize);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',e=>{if(!params.has('still')){paused=e.matches;sync();}});
addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(e.code==='Space'){e.preventDefault();togglePause();}if(key==='h')document.body.classList.toggle('hud-off');if(key==='f')fullscreen();if(key==='r')reset();if(key==='escape'){$('panel').hidden=true;$('settings').setAttribute('aria-expanded','false');}if(['arrowleft','arrowright','arrowup','arrowdown','+','=','-'].includes(key)){e.preventDefault();if(key==='arrowleft')yaw+=.12;if(key==='arrowright')yaw-=.12;if(key==='arrowup')pitch=clamp(pitch+.08,.28,1.35);if(key==='arrowdown')pitch=clamp(pitch-.08,.28,1.35);if(key==='+'||key==='=')zoom=clamp(zoom*1.1,.65,2.6);if(key==='-')zoom=clamp(zoom/1.1,.65,2.6);updateCamera();render();}});
if(params.get('hud')==='0')document.body.classList.add('hud-off');setTimeout(()=>$('title').classList.add('dim'),16000);
setWeather();resize();if(params.has('view'))setView(params.get('view'));sync();
if(params.get('test')==='1')window.gardenTestAnimalView=kind=>{const object=kind==='cat'?cat:dog;target.copy(object.position);target.y+=kind==='cat'?.12:.23;viewPresets[view].height=kind==='cat'?.65:.95;yaw=kind==='cat'?-.30:-2.2;pitch=kind==='cat'?.7:1.1;updateCamera();render();};
if(params.get('test')==='1')window.gardenTestTime=t=>{time=t;reflectionInfo.signature='';render();return lifeState();};
window.gardenState=()=>({engine:'three-webgl',revision:T.REVISION,time,paused,frames,weather,wind,speed,orbit,yaw,pitch,zoom,view,pavilionRoof:$('roof').checked,width:canvas.width,height:canvas.height,scheduled:!!raf,meshes:scene.children.filter(o=>o.isMesh).length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,koi:koi.length,contextLost:lost,camera:camera.position.toArray(),nature:natureStats,architecture:architectureStats,life:lifeState(),water:waterState()});
})();
