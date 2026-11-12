// True planar reflection of the current garden, sampled through small moving water normals.
const WATER_Y=.49,reflectionCamera=new T.OrthographicCamera(),reflectionMatrix=new T.Matrix4();
const reflectionTarget=new T.WebGLRenderTarget(1024,576,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
reflectionTarget.texture.colorSpace=T.LinearSRGBColorSpace;reflectionTarget.texture.generateMipmaps=false;
const waterClip=new T.Plane(new T.Vector3(0,1,0),-WATER_Y-.002),biasMatrix=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
const reflectedTarget=new T.Vector3(),eyeDirection=new T.Vector3(),reflectionInfo={frames:0,lastTime:-Infinity,signature:'',triangles:0,drawCalls:0};
let reflectionsEnabled=params.get('reflection')!=='0';
const waterUniforms={gardenTime:uniformTime,gardenWind:uniformWind,reflectionMap:{value:reflectionTarget.texture},reflectionMatrix:{value:reflectionMatrix},eyeDirection:{value:eyeDirection},reflectionsEnabled:{value:reflectionsEnabled?1:0},weatherDim:{value:1}};
const waterMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:waterUniforms,
 vertexShader:`varying vec3 waterWorld;
 void main(){vec4 world=modelMatrix*vec4(position,1.0);waterWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
 fragmentShader:`uniform sampler2D reflectionMap; uniform mat4 reflectionMatrix;
 uniform float gardenTime; uniform float gardenWind; uniform float reflectionsEnabled; uniform float weatherDim;
 uniform vec3 eyeDirection; varying vec3 waterWorld;
 void main(){
  vec2 p=waterWorld.xz;float t=gardenTime;
  float strength=.32+.68*gardenWind;
  float dx=(.017*cos(p.x*1.70+p.y*.82+t*.65)+.009*cos(p.y*3.4-p.x*.73-t*.47))*strength;
  float dz=(.014*cos(p.y*1.35-p.x*.52+t*.51)+.007*sin(p.x*3.7+p.y*2.0-t*.74))*strength;
  vec3 normal=normalize(vec3(dx,1.0,dz));
  float grazing=1.0-clamp(dot(normal,eyeDirection),0.0,1.0);
  float fresnel=.22+.52*pow(grazing,2.5);
  vec4 projected=reflectionMatrix*vec4(waterWorld+vec3(dx*1.8,0.0,dz*1.8),1.0);
  vec2 uv=clamp(projected.xy/projected.w,vec2(.002),vec2(.998));
  vec3 reflected=texture2D(reflectionMap,uv).rgb;
  vec3 tint=vec3(.075,.17,.145)*weatherDim;
  vec3 color=mix(tint,reflected,.79+.12*fresnel);
  float alpha=.31+fresnel*.42;
  float sparkle=pow(max(0.0,dot(reflect(-normalize(vec3(-.4,.8,.3)),normal),eyeDirection)),140.0);
  color+=vec3(.65,.67,.51)*sparkle*.09;
  if(reflectionsEnabled<.5){color=tint;alpha=.24;}
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
const water=mesh(new T.ShapeGeometry(polygon(shorePoints),64),waterMat,[0,WATER_Y,0]);water.rotation.x=-Math.PI/2;water.castShadow=false;water.receiveShadow=false;water.renderOrder=-1;
M.pond.color.set('#517965');
M.pond.onBeforeCompile=shader=>{shader.uniforms.gardenTime=uniformTime;shader.vertexShader='varying vec2 pondXZ;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n pondXZ=(modelMatrix*vec4(transformed,1.0)).xz;');shader.fragmentShader='varying vec2 pondXZ;uniform float gardenTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float lightNet=sin(pondXZ.x*7.3+sin(pondXZ.y*4.1+gardenTime*.45))*sin(pondXZ.y*8.6-pondXZ.x*2.2-gardenTime*.52);
diffuseColor.rgb*=.97+.055*pow(max(0.0,lightNet),7.0);`);};
function resizeReflection(){const ratio=Math.min(1,1024/Math.max(innerWidth,innerHeight));reflectionTarget.setSize(Math.max(128,Math.round(innerWidth*ratio)),Math.max(128,Math.round(innerHeight*ratio)));reflectionInfo.signature='';}
function renderReflection(){
 camera.updateMatrixWorld(true);camera.getWorldDirection(eyeDirection).negate();waterUniforms.weatherDim.value=weather==='rain'?.78:1;waterUniforms.reflectionsEnabled.value=reflectionsEnabled?1:0;
 if(!reflectionsEnabled)return;
 const signature=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements,weather,$('roof').checked,reflectionTarget.width,reflectionTarget.height].join(',');
 if(signature===reflectionInfo.signature&&time-reflectionInfo.lastTime<1/15)return;
 reflectionCamera.copy(camera,false);reflectionCamera.position.copy(camera.position);reflectionCamera.position.y=2*WATER_Y-camera.position.y;
 reflectedTarget.copy(target);reflectedTarget.y=2*WATER_Y-target.y;reflectionCamera.up.set(0,-1,0);reflectionCamera.lookAt(reflectedTarget);reflectionCamera.updateMatrixWorld(true);
 reflectionMatrix.copy(biasMatrix).multiply(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);
 const previousTarget=renderer.getRenderTarget(),previousPlanes=renderer.clippingPlanes,hidden=[];
 // Exclude the water itself and water-surface rings; clip everything below the waterline.
 for(const object of [water,...ripples,...koi.map(k=>k.group)]){hidden.push([object,object.visible]);object.visible=false;}
 try{renderer.clippingPlanes=[waterClip];renderer.setRenderTarget(reflectionTarget);renderer.clear();renderer.render(scene,reflectionCamera);reflectionInfo.triangles=renderer.info.render.triangles;reflectionInfo.drawCalls=renderer.info.render.calls;}
 finally{renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=previousPlanes;for(const [object,visible]of hidden)object.visible=visible;}
 reflectionInfo.lastTime=time;reflectionInfo.signature=signature;reflectionInfo.frames++;
}
function createKoi(){const result=[];for(let i=0;i<9;i++){
 const group=new T.Group(),pattern=textureCanvas((g,n)=>{g.fillStyle=i%3===2?'#ebba54':'#f3eee0';g.fillRect(0,0,n,n);for(let j=0;j<5;j++){g.fillStyle=j===3&&i%2?'#45443a':i%3===2?'#d57829':'#ce582c';g.beginPath();g.ellipse((.12+j*.19)*n,(.32+.20*Math.sin(j*2.4+i))*n,(.08+.025*Math.sin(i+j))*n,.12*n,j*.6,0,TAU);g.fill();}g.strokeStyle='#bcaf8a33';g.lineWidth=.7;for(let j=0;j<25;j++){g.beginPath();g.moveTo(0,j*n/25);g.lineTo(n,j*n/25);g.stroke();}});
 const bodyMat=mat('#ffffff',{map:pattern,roughness:.42,emissive:'#302015',emissiveIntensity:.12});bodyMat.customProgramCacheKey=()=>`koi-${i}`;bodyMat.onBeforeCompile=shader=>{shader.uniforms.gardenTime=uniformTime;shader.vertexShader='uniform float gardenTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n transformed.z+=pow(max(0.0,-position.x),2.0)*sin(gardenTime*3.4+${i.toFixed(1)}+position.x*3.0)*.19;`);};
 const body=new T.Mesh(new T.SphereGeometry(1,24,14),bodyMat);body.scale.set(.31,.059,.099);body.receiveShadow=true;group.add(body);
 const finMaterial=mat(i%3===2?'#e7c16e':'#e7debd',{side:T.DoubleSide,transparent:true,opacity:.76,roughness:.65});
 const tail=new T.Group();tail.position.x=-.265;const tailGeometry=new T.BufferGeometry();tailGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.17,.003,-.11,-.12,0,0,0,0,0,-.12,0,0,-.17,.003,.11],3));tailGeometry.computeVertexNormals();tail.add(new T.Mesh(tailGeometry,finMaterial));group.add(tail);
 const fins=[];for(const sign of [-1,1]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([.08,0,sign*.05,-.02,-.006,sign*.18,-.07,0,sign*.075],3));g.computeVertexNormals();const fin=new T.Mesh(g,finMaterial);group.add(fin);fins.push(fin);const eye=new T.Mesh(new T.SphereGeometry(.009,7,5),M.black);eye.position.set(.235,.025,sign*.054);group.add(eye);}
 const points=[];for(let j=0;j<7;j++){const a=j*TAU/7+i*.43,r=1.55+.85*(.5+.5*Math.sin(i*2.7+j*1.9));points.push(new T.Vector3(-2+Math.cos(a)*r,.395,Math.sin(a)*r*.68));}if(i%2)points.reverse();const path=new T.CatmullRomCurve3(points,true,'catmullrom',.35);path.arcLengthDivisions=320;
 scene.add(group);result.push({group,tail,fins,phase:i*2.399,path,length:path.getLength(),speed:.145+i*.013});
 }return result;}
function koiGoalsAt(t){return koi.map((k,i)=>{const distance=t*k.speed+.18*Math.sin(t*.17+i*1.3)+k.phase;return k.path.getPointAt(((distance/k.length)%1+1)%1);});}
let koiSimulationTime=null;
function separateKoi(){for(let pass=0;pass<5;pass++)for(let i=0;i<koi.length;i++)for(let j=i+1;j<koi.length;j++){const a=koi[i].swimPosition,b=koi[j].swimPosition,dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);if(d<.58){const amount=(.58-d)*.5,angle=i*2.399+j,nx=d>1e-6?dx/d:Math.cos(angle),nz=d>1e-6?dz/d:Math.sin(angle);a.x+=nx*amount;a.z+=nz*amount;b.x-=nx*amount;b.z-=nz*amount;}}}
function advanceKoi(dt,t){const goals=koiGoalsAt(t+3.5),desired=[];
 for(let i=0;i<koi.length;i++){const k=koi[i],p=k.swimPosition,v=goals[i].clone().sub(p);v.y=0;v.normalize().multiplyScalar(k.speed*(.86+.14*Math.sin(t*.21+i)));
  for(let j=0;j<koi.length;j++)if(i!==j){const other=koi[j].swimPosition,dx=p.x-other.x,dz=p.z-other.z,d=Math.hypot(dx,dz);if(d<1.0&&d>.0001){const force=(1-d)**2*.80;v.x+=dx/d*force;v.z+=dz/d*force;}}
  const radius=Math.hypot((p.x+2)/3.35,p.z/2.25);if(radius>.88){v.x-=(p.x+2)*.22*(radius-.88);v.z-=p.z*.32*(radius-.88);}v.clampLength(0,.29);desired.push(v);
 }
 for(let i=0;i<koi.length;i++){const k=koi[i];k.swimVelocity.lerp(desired[i],1-Math.exp(-dt*2.1));k.swimPosition.addScaledVector(k.swimVelocity,dt);}separateKoi();
}
function updateKoi(t){
 // Normal playback integrates continuously; a URL time jump receives a short deterministic warm-up.
 if(koiSimulationTime===null||t<koiSimulationTime||t-koiSimulationTime>2){const start=t-6,positions=koiGoalsAt(start);koi.forEach((k,i)=>{k.swimPosition=positions[i];k.swimVelocity=new T.Vector3();});separateKoi();koiSimulationTime=start;}
 while(t-koiSimulationTime>1e-8){const dt=Math.min(1/60,t-koiSimulationTime);koiSimulationTime+=dt;advanceKoi(dt,koiSimulationTime);}
 for(let i=0;i<koi.length;i++){const k=koi[i],p=k.swimPosition,v=k.swimVelocity;k.group.position.set(p.x,.388+Math.sin(t*.33+i)*.018,p.z);if(v.lengthSq()>.00001)k.group.rotation.y=-Math.atan2(v.z,v.x);const beat=t*(2.8+i*.16)+i;k.tail.rotation.y=Math.sin(beat)*.34;for(let j=0;j<2;j++)k.fins[j].rotation.x=Math.sin(t*2.4+i+j)*.12;}
}
function waterState(){return{enabled:reflectionsEnabled,reflectionFrames:reflectionInfo.frames,targetWidth:reflectionTarget.width,targetHeight:reflectionTarget.height,reflectionCamera:reflectionCamera.position.toArray(),surfaceY:WATER_Y,reflectionTriangles:reflectionInfo.triangles,reflectionDrawCalls:reflectionInfo.drawCalls,koiPositions:koi.map(k=>k.group.position.toArray()),koiHeadings:koi.map(k=>k.group.rotation.y)};}
// Readback is opt-in for verification and never runs during normal wallpaper playback.
if(params.get('test')==='1')window.gardenReflectionPixels=()=>{const pixels=new Uint16Array(reflectionTarget.width*reflectionTarget.height*4);renderer.readRenderTargetPixels(reflectionTarget,0,0,reflectionTarget.width,reflectionTarget.height,pixels);let min=Infinity,max=-Infinity,checksum=0;for(let i=0;i<pixels.length;i+=101){const v=T.DataUtils.fromHalfFloat(pixels[i]);if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);checksum+=v;}}return{min,max,checksum};};
