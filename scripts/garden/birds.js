// Perched sparrows and a swallow returning to a mud nest under the hall veranda.
const birdBrown=mat('#81745f'),birdWing=mat('#514e45'),birdBelly=mat('#c7bc9e'),birdBeak=mat('#51433a'),swallowBack=mat('#354950'),swallowThroat=mat('#9b6b54');
function gardenBird(swallow=false){const root=new T.Group(),head=new T.Group();
 part(root,residentSphere,swallow?swallowBack:birdBrown,0,.10,0,.064,.065,swallow?.14:.105);part(root,residentSphere,birdBelly,0,.076,.025,.052,.043,.082);head.position.set(0,.16,.082);root.add(head);part(head,residentSphere,swallow?swallowBack:birdBrown,0,0,0,.048,.045,.051);
 part(head,new T.ConeGeometry(.014,.053,8),birdBeak,0,-.003,.064).rotation.x=Math.PI/2;
 for(const sign of [-1,1])part(head,residentSphere,animalNose,sign*.038,.009,.024,.006,.007,.005);
 if(swallow)part(head,residentSphere,swallowThroat,0,-.023,.034,.031,.025,.021);
 else for(const sign of [-1,1])residentLine(head,birdBelly,[[sign*.032,.026,.035],[sign*.047,.024,-.005]],.005);
 const wings=[];for(const sign of [-1,1]){const wing=new T.Group();wing.position.set(sign*.035,.12,-.015);root.add(wing);if(swallow){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,.055,sign*.13,.005,.035,sign*.32,-.004,-.16,0,0,.055,sign*.32,-.004,-.16,sign*.09,0,-.11],3));g.computeVertexNormals();const m=swallowBack.clone();m.side=T.DoubleSide;part(wing,g,m,0,0,0);}else{part(wing,residentSphere,birdWing,0,0,-.025,.032,.055,.10);for(let j=0;j<3;j++)residentLine(wing,birdBrown,[[sign*.023,-.015,-.02-j*.018],[sign*.015,-.03,-.085-j*.015]],.003);}mergeResident(wing);for(const mesh of wing.children){mesh.material=mesh.material.clone();mesh.material.side=T.DoubleSide;}wings.push(wing);}
 for(const sign of [-1,1]){const tail=new T.BufferGeometry();tail.setAttribute('position',new T.Float32BufferAttribute([sign*.012,.10,-.075,sign*.045,.095,swallow?-.29:-.20,sign*.002,.10,-.16],3));tail.computeVertexNormals();part(root,tail,swallow?swallowBack:birdWing,0,0,0).material.side=T.DoubleSide;rodPart(root,[sign*.024,.05,.025],[sign*.026,.006,.033],.003,birdBeak);residentLine(root,birdBeak,[[sign*.04,.004,.055],[sign*.026,.006,.033],[sign*.015,.004,.054]],.002);}
 mergeResident(head);mergeResident(root);for(const mesh of root.children)if(mesh.isMesh){mesh.material=mesh.material.clone();mesh.material.side=T.DoubleSide;}return{root,head,wings};
}
const treeBirds=[];for(const index of [0,1,5,8]){const p=birdPerches[index];if(!p)continue;const b=gardenBird();b.root.position.copy(p);b.root.position.y+=.035;b.root.rotation.y=index*1.3;b.root.scale.setScalar(.85);scene.add(b.root);treeBirds.push(b);}
const nestPosition=new T.Vector3(4.50,3.14,-5.52),mudMaterial=mat('#857158',{roughness:1});
const nestProfile=[[.018,-.13],[.12,-.10],[.19,.02],[.17,.09],[.145,.09],[.155,.025],[.10,-.075],[.018,-.10]].map(p=>new T.Vector2(...p));const nest=new T.Group();nest.position.copy(nestPosition);scene.add(nest);part(nest,new T.LatheGeometry(nestProfile,40),mudMaterial,0,0,0);
for(let i=0;i<90;i++){const a=i*2.399,y=-.08+(i%7)*.024,r=.12+(y+.08)*.35;part(nest,geo.pebble,i%4?mudMaterial:birdBrown,Math.sin(a)*r,y,Math.cos(a)*r,.018,.012,.013);}
for(let i=0;i<11;i++){const a=i*2.4;residentLine(nest,birdBelly,[[Math.sin(a)*.10,.045,Math.cos(a)*.10],[Math.sin(a+.4)*.12,.06,Math.cos(a+.4)*.12]],.002);}
mergeResident(nest);
const swallow=gardenBird(true);scene.add(swallow.root);const flightPoints=[[4.5,3.16,-5.37],[4.5,3.08,-5.10],[4.55,3.06,-4.66],[4.7,4.7,-3],[5,6.6,-.5]];
for(let lap=0;lap<3;lap++)for(let i=0;i<16;i++){const a=i/16*TAU;flightPoints.push([-1+Math.cos(a)*6,6.6+Math.sin(a*2+lap*.4)*.35,1+Math.sin(a)*4]);}
flightPoints.push([5,6.6,1],[5,5.9,2.1],[2.6,5.5,1.2],[3.8,4.6,-3.0],[4.5,3.06,-4.66],[4.5,3.08,-5.10],[4.5,3.16,-5.37]);
const swallowRoute=new T.CatmullRomCurve3(flightPoints.map(p=>new T.Vector3(...p)),false,'catmullrom',.15);swallowRoute.arcLengthDivisions=1600;let swallowFlying=false;
function updateBirds(t){for(let i=0;i<treeBirds.length;i++){const b=treeBirds[i],phase=(t+i*3.7)%14,peek=smooth(1,2,phase)*(1-smooth(4,5,phase));b.head.rotation.y=Math.sin(t*.9+i)*.55*peek;b.head.rotation.x=Math.sin(t*1.2+i)*.12*peek;b.root.rotation.z=Math.sin(t*.65+i)*.012;}
 const cycle=((t%48)+48)%48,elapsed=cycle-10;swallowFlying=elapsed>=0&&elapsed<26;
 if(swallowFlying){const progress=easedRun({duration:26,speed:1/25},elapsed).distance,p=swallowRoute.getPointAt(progress),d=swallowRoute.getTangentAt(progress);swallow.root.position.copy(p);swallow.root.rotation.set(-Math.atan2(d.y,Math.hypot(d.x,d.z)),Math.atan2(d.x,d.z),Math.sin(progress*TAU*3)*.18,'YXZ');const flap=Math.sin(t*19)*.72*(.55+.45*Math.sin(t*2.1)**2);swallow.wings.forEach((w,i)=>{w.rotation.z=(i?1:-1)*flap;w.scale.x=1;});}
 else{swallow.root.position.set(4.5,3.16,-5.37);swallow.root.rotation.set(-.25,0,0);swallow.wings.forEach((w,i)=>{w.rotation.z=(i?1:-1)*1.05;w.scale.x=.46;});}swallow.head.rotation.y=Math.sin(t*.6)*.10;
}
function birdState(){return{perched:treeBirds.length,nests:1,swallows:1,swallowFlying,swallow:swallow.root.position.toArray(),butterflyScale:butterflies[0].group.scale.x,willowTipOffset:[Math.sin(time*.82)*.13*wind,Math.cos(time*.61)*.095*wind]};}
