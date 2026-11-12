// Hanfu-inspired miniature residents: layered clothing, sculpted faces and anchored cloth motion.
const residentSphere=new T.SphereGeometry(1,24,18),residentStatic=mat('#ffffff',{vertexColors:true,roughness:.8});
const residentPalette={skin:mat('#d9b99f'),rose:mat('#bb7776'),lip:mat('#995e60'),white:mat('#ded8cc'),iris:mat('#594c42'),black:mat('#292e2d'),gold:mat('#b49b69'),jade:mat('#88a49c'),hair:mat('#343533')};
function residentPart(parent,m,p,s){return part(parent,residentSphere,m,...p,...s);}
function residentLine(parent,m,points,r=.003){return part(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,r,5,false),m,0,0,0);}
function mergeResident(parent){const positions=[],normals=[],colors=[];for(const child of [...parent.children])if(child.isMesh){child.updateMatrix();const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);const p=g.attributes.position,n=g.attributes.normal,c=child.material.color;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}parent.remove(child);g.dispose();}if(positions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));part(parent,g,residentStatic,0,0,0);}}
const fabricCache=new Map();
function fabric(color){if(fabricCache.has(color))return fabricCache.get(color);const m=mat(color,{side:T.DoubleSide,roughness:.94});m.customProgramCacheKey=()=> 'garden-woven-fabric-v1';m.onBeforeCompile=shader=>{shader.uniforms.clothTime=uniformTime;shader.uniforms.clothWind=uniformWind;shader.vertexShader='attribute float clothFlex;uniform float clothTime;uniform float clothWind;varying vec3 clothPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 clothPoint=position;vec3 clothWorld=(modelMatrix*vec4(position,1.0)).xyz;
 float flutter=sin(clothTime*1.3+clothWorld.x*.8+position.y*7.0)+.28*sin(clothTime*2.6+position.y*19.0+clothWorld.z);
 transformed.x+=flutter*.022*clothWind*clothFlex;
 transformed.z+=sin(clothTime*1.1+position.y*9.0+clothWorld.x)*.018*clothWind*clothFlex;`);shader.fragmentShader='varying vec3 clothPoint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float weave=sin(clothPoint.x*2200.0)*sin(clothPoint.y*1800.0)+.4*sin(clothPoint.z*1700.0);
 diffuseColor.rgb*=.98+.025*weave;`);};fabricCache.set(color,m);return m;}
function clothFlex(g,fn){const p=g.attributes.position,flex=[];for(let i=0;i<p.count;i++)flex.push(fn(p.getX(i),p.getY(i),p.getZ(i)));g.setAttribute('clothFlex',new T.Float32BufferAttribute(flex,1));return g;}
function skirtMesh(female,start=0,end=TAU,offset=0){const pos=[],idx=[],rows=24,cols=64;for(let j=0;j<=rows;j++){const u=j/rows,y=(female?.09:.19)+(female?.66:.56)*u,r=(female?.125:.14)+(female?.17:.055)*Math.pow(1-u,1.25)+offset;for(let i=0;i<=cols;i++){const a=start+(end-start)*i/cols,fold=1+(.023+.025*(1-u))*Math.sin(a*(female?28:14)+u*.6);pos.push(Math.sin(a)*r*fold,y,Math.cos(a)*r*fold);}}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,a+1,b,a+1,b+1,b);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return clothFlex(g,(_,y)=>Math.pow(clamp((.75-y)/.65,0,1),1.6));}
function silkRibbon(parent,color,x,y,z,length,width){const g=new T.PlaneGeometry(width,length,2,24);g.translate(x,y-length/2,z);const p=g.attributes.position;for(let i=0;i<p.count;i++){const u=(y-p.getY(i))/length;p.setZ(i,p.getZ(i)+Math.sin(u*5)*.018);p.setX(i,p.getX(i)+Math.sin(u*4)*.012);}g.computeVertexNormals();clothFlex(g,(_,py)=>clamp((y-py)/length,0,1));return part(parent,g,fabric(color),0,0,0);}
function person(color,seated=false,hat=false,profile={gender:'male',age:'adult'}){
 const female=profile.gender==='female',child=profile.age==='child',root=new T.Group(),body=new T.Group();root.add(body);
 const base=lifeMaterials[color].color.getStyle(),accent=female?(color==='wine'?'#d8b4bf':'#b3c6c0'):(color==='teal'?'#a1bab3':'#b1bbc7');
 const cloth=fabric(base),pale=fabric(female?'#ded9cb':'#bfc4b6');
 if(seated)part(root,clothFlex(sittingRobe.clone(),(_,y)=>clamp(-y*1.8,0,.65)),cloth,0,0,0);
 else{if(female)part(body,skirtMesh(true),pale,0,0,0);else for(const sign of [-1,1])part(body,clothFlex(new T.CylinderGeometry(.060,.052,.51,20,12),()=>.1),pale,sign*.071,.34,0);part(body,skirtMesh(female,female?.48:.82,TAU-(female?.48:.82),.008),cloth,0,0,0);silkRibbon(body,accent,-.055,.74,.16,female?.49:.30,.027);silkRibbon(body,accent,.055,.74,.16,female?.42:.27,.024);if(female){silkRibbon(body,accent,-.15,1.04,-.04,.65,.075);silkRibbon(body,accent,.15,1.04,-.04,.60,.075);}}
 const torso=clothFlex(residentSphere.clone(),()=>.04);part(body,torso,cloth,0,.88,0,female?.135:.16,.22,.105);
 part(body,clothCylinder,lifeMaterials.belt,0,.75,0,female?.132:.15,.035,.117);
 // Overlapping collars and a fine embroidered edging are modeled separately.
 residentLine(body,lifeMaterials.ivory,[[-.105,1.065,.055],[-.055,.96,.102],[.070,.80,.119]],.018);residentLine(body,lifeMaterials.ivory,[[.105,1.065,.055],[.04,.96,.108],[-.025,.88,.124]],.016);
 for(const sign of [-1,1])residentLine(body,residentPalette.gold,[[sign*.096,1.045,.068],[sign*.05,.96,.12],[sign*.014,.9,.132]],.0025);
 residentPart(body,residentPalette.skin,[0,1.093,0],[.038,.068,.034]);
 const head=new T.Group();head.position.set(0,1.22,.006);body.add(head);const faceGeo=new T.SphereGeometry(1,32,24),fp=faceGeo.attributes.position;
 for(let i=0;i<fp.count;i++){const y=fp.getY(i),jaw=1-.14*Math.max(0,-y);fp.setX(i,fp.getX(i)*jaw);if(fp.getZ(i)>0)fp.setZ(i,fp.getZ(i)*(1-.09*Math.max(0,y)));}faceGeo.computeVertexNormals();part(head,faceGeo,residentPalette.skin,0,0,0,female?.081:.087,child?.112:.12,.077);
 // Eyeballs sit inside eyelid arcs, with small irises, nose bridge, nostrils and lips.
 for(const sign of [-1,1]){
  residentPart(head,residentPalette.skin,[sign*.082,-.004,-.003],[.015,.027,.017]);
  residentPart(head,residentPalette.white,[sign*.031,.018,.070],[.019,.008,.006]);residentPart(head,residentPalette.iris,[sign*.031,.019,.075],[.0065,.0065,.003]);residentPart(head,residentPalette.black,[sign*.031,.019,.077],[.003,.004,.0015]);
  residentLine(head,residentPalette.black,[[sign*.013,.018,.074],[sign*.030,.026,.076],[sign*.050,.018,.067]],female?.0018:.0023);
  residentLine(head,residentPalette.hair,[[sign*.014,.046,.071],[sign*.032,.049,.072],[sign*.052,.041,.063]],female?.002:.003);
  if(female&&!child)residentPart(head,residentPalette.rose,[sign*.049,-.022,.064],[.017,.008,.002]);
 }
 residentPart(head,residentPalette.skin,[0,.008,.075],[.010,.027,.013]);residentPart(head,residentPalette.skin,[0,-.016,.087],[.012,.010,.010]);
 for(const sign of [-1,1])residentPart(head,residentPalette.rose,[sign*.008,-.023,.088],[.0025,.002,.0015]);
 residentLine(head,female&&!child?residentPalette.lip:residentPalette.rose,[[-.019,-.043,.072],[0,-.040,.079],[.019,-.043,.072]],.0025);residentPart(head,residentPalette.rose,[0,-.047,.074],[.014,.0035,.003]);
 // Hair follows the skull, with adult half-up styles and simple twin buns for children.
 const hairCap=new T.SphereGeometry(1,28,18,0,TAU,0,1.50);part(head,hairCap,residentPalette.hair,0,.019,-.010,.088,.107,.082);
 residentPart(head,residentPalette.hair,[0,-.015,-.061],[.077,.086,.029]);
 if(female){
  residentPart(head,residentPalette.hair,[0,-.10,-.074],[.062,child?.06:.19,.025]);
  for(const sign of [-1,1]){residentPart(head,residentPalette.hair,[sign*(child?.075:.040),.105,-.025],[child?.030:.039,.036,.029]);residentLine(head,residentPalette.gold,[[sign*.013,.127,-.005],[sign*.066,.125,.015],[sign*.10,.14,.012]],.003);residentPart(head,residentPalette.jade,[sign*.095,.139,.015],[.009,.014,.008]);}
  if(!child){residentPart(head,residentPalette.lip,[0,.059,.071],[.0035,.006,.001]);for(const sign of [-1,1])residentLine(head,residentPalette.gold,[[sign*.086,-.02,.01],[sign*.088,-.067,.017]],.0015);}
 }else{residentPart(head,residentPalette.hair,[0,.13,-.025],[.038,.038,.033]);residentLine(head,residentPalette.gold,[[-.047,.14,-.025],[.055,.14,-.025]],.004);}
 if(hat){part(head,new T.ConeGeometry(.27,.14,32),lifeMaterials.ochre,0,.18,-.006);part(head,clothCylinder,lifeMaterials.belt,0,.115,-.006,.26,.012,.26);}
 mergeResident(head);
 const ribbons=[];if(!hat){ribbons.push(silkRibbon(head,accent,-.025,.11,-.095,female?.33:.22,.018));if(female)ribbons.push(silkRibbon(head,base,.025,.11,-.098,.29,.015));}
 const arms=[];for(const sign of [-1,1]){const arm=new T.Group();arm.position.set(sign*(female?.125:.145),1.0,0);body.add(arm);
  const g=clothFlex(new T.CylinderGeometry(.055,female?.12:.092,.32,28,16,true),(_,y)=>clamp((.16-y)/.32,0,1));const sleeve=part(arm,g,cloth,sign*.05,-.145,.03);sleeve.rotation.z=sign*.30;
  const cuff=part(arm,new T.TorusGeometry(female?.12:.092,.008,5,28),lifeMaterials.ivory,sign*.095,-.298,.06);cuff.rotation.set(Math.PI/2,0,sign*.3);
  residentPart(arm,residentPalette.skin,[sign*.11,-.31,.065],[.027,.040,.026]);for(let j=0;j<3;j++)residentLine(arm,residentPalette.rose,[[sign*.11-.010+j*.008,-.327,.087],[sign*.11-.010+j*.008,-.34,.085]],.0011);const staticArm=new T.Group();for(const o of [...arm.children])if(o.isMesh&&!o.geometry.attributes.clothFlex){arm.remove(o);staticArm.add(o);}mergeResident(staticArm);arm.add(staticArm);arms.push(arm);
 }
 const boots=[];for(const sign of [-1,1])boots.push(part(root,footGeometry,'shoe',sign*.075,.045,.02,.045,.04,.095));
 if(seated){body.position.y=-.73;body.rotation.x=.035;for(const a of arms)a.rotation.x=-1.25;for(const b of boots){b.position.z=.29;b.position.y=-.39;}}
 // Preserve the flexible cloth meshes; merge only the static trim into one colored mesh.
 const staticBody=new T.Group();for(const o of [...body.children])if(o.isMesh&&!o.geometry.attributes.clothFlex){body.remove(o);staticBody.add(o);}mergeResident(staticBody);body.add(staticBody);
 contactShadow(root,.25,.20);scene.add(root);return{root,body,arms,boots,head,seated,ribbons,gender:profile.gender,age:profile.age,behavior:'walk',velocity:0};
}
function walkingPhase(t,group){const localTime=t+group*7,cycle=Math.floor(localTime/32),u=((localTime%32)+32)%32;let distance=cycle*4.9,speed=0,kind='walk',pose=0;
 const run=(x,duration,v)=>{if(x<1)return{d:v*(x**3-.5*x**4),s:v*smooth(0,1,x)};if(x>duration-1){const q=duration-x;return{d:v*(duration-1)-v*(q**3-.5*q**4),s:v*smooth(0,1,q)};}return{d:v*(x-.5),s:v};};
 if(u<10){const r=run(u,10,.30);distance+=r.d;speed=r.s;}else if(u<15){distance+=2.7;kind='admire';pose=smooth(10,11,u)*(1-smooth(14,15,u));}else if(u<21){distance+=2.7;kind='talk';pose=smooth(15,16,u)*(1-smooth(20,21,u));}else if(u<30){const r=run(u-21,9,.275);distance+=2.7+r.d;speed=r.s;}else{distance+=4.9;kind='admire';pose=smooth(30,30.6,u)*(1-smooth(31.4,32,u));}return{distance,speed,kind,pose};}
function personalRoute(distance,lateral){const a=routeAt(distance-.18),b=routeAt(distance),c=routeAt(distance+.18);return{x:(a.x+2*b.x+c.x)*.25+Math.cos(b.angle)*lateral,y:b.y,z:(a.z+2*b.z+c.z)*.25-Math.sin(b.angle)*lateral};}
function updateWalkers(t){for(let i=0;i<walkers.length;i++){const p=walkers[i],group=Math.floor(i/2),side=i%2?1:-1,b=walkingPhase(t,group),individualDistance=b.distance+p.phase-side*.20,lateral=side*(p.age==='child'?.19:.245),r=personalRoute(individualDistance,lateral),before=personalRoute(individualDistance-.035,lateral),after=personalRoute(individualDistance+.035,lateral),angle=Math.atan2(after.x-before.x,after.z-before.z),gait=b.distance*16+group+side*.4,pace=b.speed/.30;
 p.root.position.set(r.x,r.y,r.z);p.root.rotation.y=angle+(b.kind==='talk'?-side*.68:b.kind==='admire'?.32:0)*b.pose;
 p.head.rotation.y=b.kind==='talk'?-side*.52*b.pose:b.kind==='admire'?Math.sin(t*.35+group)*.25*b.pose:Math.sin(t*.24+group)*.05;
 p.head.rotation.x=b.kind==='talk'?Math.sin(t*1.7+i)*.035*b.pose:b.kind==='admire'?-.07*b.pose:0;
 p.body.position.y=Math.sin(gait*2)*.006*pace;p.arms[0].rotation.x=Math.sin(gait)*.15*pace;p.arms[1].rotation.x=-Math.sin(gait)*.15*pace;
 if(b.kind==='talk'){p.arms[i%2].rotation.x-=b.pose*(.20+.12*Math.sin(t*1.3+i));p.arms[i%2].rotation.z=side*b.pose*.12;}else for(const arm of p.arms)arm.rotation.z=0;
 p.boots[0].position.z=.02+Math.sin(gait)*.065*pace;p.boots[1].position.z=.02-Math.sin(gait)*.065*pace;p.boots[0].position.y=.045+Math.max(0,Math.cos(gait))*.025*pace;p.boots[1].position.y=.045+Math.max(0,-Math.cos(gait))*.025*pace;p.behavior=b.kind;p.velocity=b.speed;
 }}
function residentState(){return{adults:walkers.filter(p=>p.age==='adult').length,children:walkers.filter(p=>p.age==='child').length,male:walkers.filter(p=>p.gender==='male').length,female:walkers.filter(p=>p.gender==='female').length,adultPairs:2,profiles:walkers.map(p=>({gender:p.gender,age:p.age,scale:p.root.scale.x,behavior:p.behavior,velocity:p.velocity,headYaw:p.head.rotation.y,heading:p.root.rotation.y})),clothTime:uniformTime.value,clothWind:uniformWind.value};}
