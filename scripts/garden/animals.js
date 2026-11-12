// Anatomical silhouettes and time-addressable behavior keep pause, seek and replay exact.
const animalSphere=new T.SphereGeometry(1,24,16);
const animalFur=mat('#927353',{roughness:1}),animalCream=mat('#d4c6aa',{roughness:1}),animalDark=mat('#514a40',{roughness:1}),animalNose=mat('#292724',{roughness:.54}),earInside=mat('#a18a79',{roughness:1});
const tabbyFur=mat('#a3947b',{roughness:1}),tabbyFace=mat('#a3947b',{roughness:1});
for(const fur of [animalFur,animalCream,animalDark,tabbyFur,tabbyFace]){
 fur.customProgramCacheKey=()=>fur===tabbyFur?'natural-tabby-v2':'short-coat-v2';
 fur.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 coatPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncoatPoint=position;');shader.fragmentShader='varying vec3 coatPoint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float mottling=sin(coatPoint.x*19.0+sin(coatPoint.z*23.0))*sin(coatPoint.y*31.0+coatPoint.z*12.0);
 float fiber=sin(coatPoint.x*1600.0+sin(coatPoint.z*100.0)*2.0+coatPoint.y*130.0)*sin(coatPoint.z*730.0+coatPoint.y*310.0);
 diffuseColor.rgb*=.93+.07*mottling+.065*fiber;
 ${fur===tabbyFur?'float band=sin(coatPoint.x*69.0+sin(coatPoint.z*27.0)*1.6+sin(coatPoint.y*30.0)*.6);float stripe=smoothstep(.25,.8,band)*smoothstep(.095,.22,coatPoint.y);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.47,.46,.43),stripe*.8);':''}`);};
}
function animalOval(parent,m,p,s){return part(parent,animalSphere,m,...p,...s);}
// Variable elliptical sections form a continuous back, chest and tucked abdomen.
function organicTube(points,widths,heights,segments=40,sides=20){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),radii=new T.CatmullRomCurve3(widths.map((r,i)=>new T.Vector3(r,heights[i],0))),pos=[],idx=[],normal=new T.Vector3(),vertical=new T.Vector3();
 for(let j=0;j<=segments;j++){const u=j/segments,c=curve.getPoint(u),tangent=curve.getTangent(u),r=radii.getPoint(u);normal.crossVectors(tangent,up).normalize();if(normal.lengthSq()<.01)normal.set(1,0,0);vertical.crossVectors(normal,tangent).normalize();for(let i=0;i<=sides;i++){const a=i/sides*TAU;const p=c.clone().addScaledVector(normal,Math.cos(a)*Math.max(.001,r.x)).addScaledVector(vertical,Math.sin(a)*Math.max(.001,r.y));pos.push(p.x,p.y,p.z);}}
 for(let j=0;j<segments;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;idx.push(a,b,a+1,a+1,b,b+1);}const firstCenter=pos.length/3;pos.push(...curve.getPoint(0).toArray(),...curve.getPoint(1).toArray());for(let i=0;i<sides;i++){idx.push(firstCenter,i,i+1);const last=segments*(sides+1);idx.push(firstCenter+1,last+i+1,last+i);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function animalTube(parent,m,points,widths,heights=widths){return part(parent,organicTube(points,widths,heights),m,0,0,0);}
function fineCurve(parent,points,r,m){return part(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),16,r,5,false),m,0,0,0);}
// Slightly cupped ear leather, with a rounded tip and a small inward fold.
function earMesh(parent,m,width,height,fold=0){const p=[],idx=[],rows=12,cols=10;for(let j=0;j<=rows;j++){const u=j/rows,w=width*Math.pow(1-u,.72);for(let i=0;i<=cols;i++){const v=i/cols*2-1;p.push(v*w,u*height,Math.sin(u*Math.PI)*.022*(1-v*v)+fold*u*u);}}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const o=part(parent,g,m,0,0,0);o.material.side=T.DoubleSide;return o;}
const dog=new T.Group(),dogBody=new T.Group();dog.scale.setScalar(.65);dog.add(dogBody);scene.add(dog);contactShadow(dog,.22,.53);
animalTube(dogBody,animalFur,[[0,.45,-.42],[0,.45,-.28],[0,.48,-.05],[0,.48,.20],[0,.53,.32],[0,.62,.37]],[.015,.145,.135,.16,.12,.055],[.02,.17,.145,.205,.17,.07]);
animalOval(dogBody,animalCream,[0,.40,.28],[.10,.15,.10]);
const dogNeck=new T.Group();dogNeck.position.set(0,.53,.29);dogBody.add(dogNeck);
animalTube(dogNeck,animalFur,[[0,0,0],[0,.10,.04],[0,.20,.08]],[.11,.10,.07],[.12,.10,.075]);
const dogHead=new T.Group();dogHead.position.set(0,.19,.07);dogNeck.add(dogHead);
animalTube(dogHead,animalFur,[[0,0,-.12],[0,.015,-.035],[0,-.018,.065],[0,-.055,.16],[0,-.065,.255]],[.015,.108,.086,.060,.035],[.02,.125,.095,.052,.033],32);
animalOval(dogHead,animalCream,[0,-.086,.16],[.057,.027,.095]);animalOval(dogHead,animalNose,[0,-.056,.25],[.043,.028,.028]);
const dogEars=[];for(const sign of [-1,1]){
 animalOval(dogHead,animalDark,[sign*.078,.026,.071],[.023,.027,.015]);animalOval(dogHead,animalNose,[sign*.084,.028,.081],[.013,.016,.010]);animalOval(dogHead,animalCream,[sign*.086,.034,.087],[.003,.004,.002]);
 fineCurve(dogHead,[[sign*.025,-.079,.25],[sign*.048,-.083,.19],[sign*.063,-.069,.12]],.0025,animalDark);
 const ear=new T.Group();ear.position.set(sign*.078,.09,-.046);ear.rotation.set(.22,sign*.15,sign*-.23);dogHead.add(ear);earMesh(ear,animalFur,.059,.15,.10);const inner=earMesh(ear,earInside,.039,.115,.079);inner.position.set(0,.013,.003);dogEars.push(ear);
}
mergeBodyParts(dogHead);mergeBodyParts(dogBody);
const dogLegs=[],dogHocks=[];
for(const back of [true,false])for(const sign of [-1,1]){const leg=new T.Group();leg.position.set(sign*.105,.46,back?-.26:.22);dogBody.add(leg);
 animalTube(leg,animalFur,[[0,.05,0],[0,-.08,back?.045:-.008],[0,-.20,back?.075:-.02]],[.055,back?.057:.039,.026],[.07,back?.07:.049,.03]);
 const hock=new T.Group();hock.position.set(0,-.20,back?.075:-.02);leg.add(hock);animalTube(hock,animalFur,[[0,0,0],[0,-.11,back?-.05:.006],[0,-.22,back?-.018:.025]],[.026,.020,.019],[.03,.024,.025]);animalOval(hock,animalCream,[0,-.23,back?.005:.048],[.032,.029,.064]);
 for(const s of [-1,1])fineCurve(hock,[[s*.01,-.24,.065],[s*.01,-.245,.095]],.0013,animalDark);
 mergeBodyParts(leg);mergeBodyParts(hock);dogLegs.push(leg);dogHocks.push(hock);
}
const dogTail=new T.Group();dogTail.position.set(0,.51,-.37);dogBody.add(dogTail);animalTube(dogTail,animalFur,[[0,0,0],[0,.07,-.12],[.025,.17,-.22],[.06,.24,-.24]],[.047,.038,.021,.001]);
// Stops occur at different places on a courtyard route that stays clear of the pond and rock.
const dogRoute=new T.CatmullRomCurve3([[4.8,.65,-4.1],[7.6,.65,-4.1],[8.3,.65,-2.5],[8.3,.65,.5],[7.5,.65,1.6],[5.2,.65,1.6],[4.65,.65,.3],[4.55,.65,-2.4]].map(p=>new T.Vector3(...p)),true,'catmullrom',.22);dogRoute.arcLengthDivisions=500;const dogRouteLength=dogRoute.getLength();
const cat=new T.Group(),catBody=new T.Group();cat.scale.setScalar(.68);cat.position.set(1,4.39,-6.50);cat.rotation.set(.69,0,0);cat.add(catBody);scene.add(cat);
animalTube(catBody,tabbyFur,[[-.34,.105,.035],[-.22,.15,-.015],[-.05,.17,-.04],[.12,.145,-.055],[.23,.09,.025]],[.002,.17,.225,.175,.002],[.002,.135,.17,.14,.002],52);
animalOval(catBody,tabbyFur,[.13,.105,.105],[.095,.085,.115]);
for(const x of [.055,.125])animalOval(catBody,animalCream,[x,.047,.245],[.04,.029,.075]);
const catHead=new T.Group();catHead.position.set(.14,.12,.195);catHead.rotation.set(.20,-.18,-.10);catBody.add(catHead);
animalOval(catHead,tabbyFace,[0,0,0],[.117,.096,.105]);animalOval(catHead,animalCream,[-.030,-.033,.084],[.043,.031,.037]);animalOval(catHead,animalCream,[.030,-.033,.084],[.043,.031,.037]);animalOval(catHead,earInside,[0,-.019,.12],[.016,.011,.009]);
const catEars=[];for(const sign of [-1,1]){
 const ear=new T.Group();ear.position.set(sign*.072,.061,-.025);ear.rotation.z=sign*-.28;catHead.add(ear);earMesh(ear,tabbyFace,.043,.103,-.012);const inner=earMesh(ear,earInside,.028,.075,-.009);inner.position.set(0,.009,.002);catEars.push(ear);
 fineCurve(catHead,[[sign*.022,.011,.099],[sign*.050,.004,.100],[sign*.080,.014,.080]],.003,animalDark);
 for(let i=0;i<3;i++)fineCurve(catHead,[[sign*.035,-.032,.117],[sign*.10,-.026+i*.012,.14],[sign*(.17+i*.012),-.035+i*.018,.13]],.0009,animalCream);
 for(let i=0;i<2;i++)fineCurve(catHead,[[sign*.035,.07-i*.018,.073],[sign*.053,.057-i*.017,.084]],.004,animalDark);
}
mergeBodyParts(catHead);mergeBodyParts(catBody);
const catTail=new T.Group();catTail.position.set(.22,.05,-.14);catBody.add(catTail);
animalTube(catTail,tabbyFur,[[0,0,0],[.08,.005,.14],[.035,.005,.34],[-.13,.005,.43],[-.33,.012,.39]],[.044,.042,.035,.026,.017]);
const catTailTip=new T.Group();catTailTip.position.set(-.33,.012,.39);catTail.add(catTailTip);animalTube(catTailTip,animalDark,[[0,0,0],[-.07,.012,-.04],[-.10,.025,-.09]],[.017,.012,.001]);
// Accelerating/decelerating runs integrate to an exact distance, without snapping at phase boundaries.
const dogSchedule=[{kind:'run',duration:8,speed:.86},{kind:'sniff',duration:4.6},{kind:'look',duration:3.4},{kind:'run',duration:6.8,speed:1.12},{kind:'look',duration:2.8},{kind:'run',duration:5.6,speed:.72},{kind:'sniff',duration:5.2}];
const dogCycle=dogSchedule.reduce((sum,s)=>sum+s.duration,0),dogCycleDistance=dogSchedule.reduce((sum,s)=>sum+(s.kind==='run'?s.speed*(s.duration-1):0),0);
function easedRun(s,elapsed){const u=clamp(elapsed,0,s.duration);if(u<1)return{distance:s.speed*(u**3-.5*u**4),speed:s.speed*smooth(0,1,u)};if(u>s.duration-1){const v=s.duration-u;return{distance:s.speed*(s.duration-1)-s.speed*(v**3-.5*v**4),speed:s.speed*smooth(0,1,v)};}return{distance:s.speed*(u-.5),speed:s.speed};}
function dogBehaviorAt(t){const shifted=t+3,cycle=Math.floor(shifted/dogCycle);let local=((shifted%dogCycle)+dogCycle)%dogCycle,distance=cycle*dogCycleDistance;for(const phase of dogSchedule){if(local<phase.duration){const run=phase.kind==='run'?easedRun(phase,local):{distance:0,speed:0};return{kind:phase.kind,elapsed:local,duration:phase.duration,distance:distance+run.distance,speed:run.speed};}if(phase.kind==='run')distance+=phase.speed*(phase.duration-1);local-=phase.duration;}return{kind:'sniff',elapsed:0,duration:5.2,distance,speed:0};}
let dogBehavior='run',dogVelocity=0,catEarMotion=0,catTailMotion=0;
function updateAnimals(t){
 const b=dogBehaviorAt(t),u=((b.distance/dogRouteLength)%1+1)%1,p=dogRoute.getPointAt(u),dir=dogRoute.getTangentAt(u),stride=b.distance*17,pace=clamp(b.speed/.85,0,1),envelope=smooth(0,.8,b.elapsed)*(1-smooth(b.duration-.8,b.duration,b.elapsed));dogBehavior=b.kind;dogVelocity=b.speed;dog.position.copy(p);
 // Raise the paws smoothly where the route crosses the existing paving near the gallery.
 const paving=smooth(6.25,6.65,p.x)*(1-smooth(7.5,7.85,p.x))*(1-smooth(-3.9,-3.4,p.z));dog.position.y+=paving*.085;dog.rotation.y=Math.atan2(dir.x,dir.z);
 const sniff=b.kind==='sniff'?envelope:0,look=b.kind==='look'?envelope:0;dogBody.position.y=.006+Math.sin(stride*2)*.012*pace;dogBody.rotation.x=Math.sin(stride)*.018*pace;
 dogLegs.forEach((leg,i)=>{const phase=stride+(i===0||i===3?0:Math.PI);leg.rotation.x=Math.sin(phase)*.40*pace;dogHocks[i].rotation.x=Math.max(0,-Math.sin(phase))*.38*pace;});
 dogNeck.rotation.x=sniff*1.32;dogNeck.position.y=.53-sniff*.17;dogHead.rotation.x=sniff*.20+look*-.10;dogHead.rotation.y=look*Math.sin(b.elapsed*1.45)*.55+sniff*Math.sin(t*3.4)*.09;dogHead.position.z=.07+sniff*Math.sin(t*5.2)*.008;
 dogTail.rotation.z=Math.sin(t*(b.kind==='run'?4.5:1.8))*(.10+.18*pace);dogTail.rotation.x=sniff*-.35;
 dogEars.forEach((ear,i)=>ear.rotation.x=.22+Math.sin(stride+i)*.07*pace+look*.13);
 catBody.scale.y=1+Math.sin(t*1.25)*.018;
 const earPhase=((t+2)%17+17)%17;catEarMotion=smooth(0,.13,earPhase)*(1-smooth(.5,1.15,earPhase));catEars[0].rotation.z=-.28-catEarMotion*.26;catEars[0].rotation.x=catEarMotion*.22;catEars[1].rotation.z=.28+catEarMotion*.11;
 const tailPhase=((t+9)%29+29)%29;catTailMotion=smooth(0,.8,tailPhase)*(1-smooth(2.5,4.0,tailPhase));catTail.rotation.y=Math.sin(tailPhase*2.6)*catTailMotion*.055;catTailTip.rotation.y=Math.sin(tailPhase*3.1)*catTailMotion*.32;catTailTip.rotation.x=catTailMotion*.14;
}
function animalState(){return{dog:dog.position.toArray(),dogLegAngles:dogLegs.map(l=>l.rotation.x),dogBehavior,dogVelocity,dogScale:dog.scale.x,dogHeadPitch:dogNeck.rotation.x,dogHeadYaw:dogHead.rotation.y,cat:cat.position.toArray(),catScale:cat.scale.x,catBreathing:catBody.scale.y,catEarMotion,catTailMotion};}
