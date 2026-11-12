// Miniature residents and pollinators. All motion derives from scene time, so pause is exact.
const lifeMaterials={skin:mat('#d0ad87'),hair:mat('#302f2a'),ivory:mat('#ded3b7'),ink:mat('#333c38'),belt:mat('#a78c61'),shoe:mat('#45423a'),teal:mat('#527c78'),wine:mat('#8e5e64'),blue:mat('#60768c'),sage:mat('#80916f'),ochre:mat('#a28b65')};
const skinGeometry=new T.SphereGeometry(1,12,10),clothCylinder=new T.CylinderGeometry(1,1,1,16),footGeometry=new T.SphereGeometry(1,10,6);
function part(parent,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,typeof m==='string'?lifeMaterials[m]:m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.receiveShadow=true;parent.add(o);return o;}
function rodPart(parent,a,b,r,m){const av=new T.Vector3(...a),bv=new T.Vector3(...b),o=part(parent,clothCylinder,m,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,av.distanceTo(bv),r);o.quaternion.setFromUnitVectors(up,bv.sub(av).normalize());return o;}
function garmentGeometry(seated=false){const p=[],idx=[],rings=14,segments=48;for(let j=0;j<=rings;j++){const u=j/rings,y=seated?-.40+u*.40:.14+u*.62,r=seated?.15+.065*Math.sin(u*Math.PI):.145+.115*(1-u)**1.3;for(let i=0;i<=segments;i++){const a=seated?-Math.PI*.55+i/segments*Math.PI*1.10:i/segments*TAU,fold=1+.045*Math.sin(a*16)*(1-u),front=seated?.25*(1-u):0;p.push(Math.sin(a)*r*fold,y,Math.cos(a)*r*fold+front);}}for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i;idx.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}
const standingRobe=garmentGeometry(),sittingRobe=garmentGeometry(true);
function contactShadow(parent,sx=.35,sz=.25){const o=part(parent,new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:shadow.material.map,transparent:true,opacity:.68,depthWrite:false}),0,.012,0,sx*2,sz*2,1);o.rotation.x=-Math.PI/2;}
function mergeBodyParts(parent){const groups=new Map();for(const child of [...parent.children])if(child.isMesh){child.updateMatrix();const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);let list=groups.get(child.material);if(!list){list=[];groups.set(child.material,list);}list.push(g);parent.remove(child);}for(const [material,list]of groups){const positions=[],normals=[];for(const g of list){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));const m=new T.Mesh(g,material);m.receiveShadow=true;parent.add(m);}}
/* GARDEN_RESIDENTS */
// The route follows only existing paving and the bridge centerline.
const walkPoints=[[-9,4.7],[-7.45,3.45],[3.25,3.45],[3.3,5],[3.8,8],[-3,8],[-11,8.4],[-9,4.7]];
const routeSegments=walkPoints.slice(0,-1).map((p,i)=>({a:p,b:walkPoints[i+1],length:Math.hypot(walkPoints[i+1][0]-p[0],walkPoints[i+1][1]-p[1]),bridge:i===1}));
const routeLength=routeSegments.reduce((s,r)=>s+r.length,0);
function routeAt(distance){let d=((distance%routeLength)+routeLength)%routeLength;for(let i=0;i<routeSegments.length;i++){const r=routeSegments[i];if(d<=r.length||i===routeSegments.length-1){const u=clamp(d/r.length,0,1),x=r.a[0]+(r.b[0]-r.a[0])*u,z=r.a[1]+(r.b[1]-r.a[1])*u;let y=.745;if(r.bridge)y=bridgeHeight(u)+.119;else if(i===0)y=.745+(.979-.745)*u;else if(i===2)y=.979+(.745-.979)*u;
 const current=new T.Vector2(r.b[0]-r.a[0],r.b[1]-r.a[1]).normalize();const blendDistance=.28;if(d<blendDistance){const prev=routeSegments[(i+routeSegments.length-1)%routeSegments.length],v=new T.Vector2(prev.b[0]-prev.a[0],prev.b[1]-prev.a[1]).normalize();current.lerp(v,.5*(1-d/blendDistance));}else if(r.length-d<blendDistance){const next=routeSegments[(i+1)%routeSegments.length],v=new T.Vector2(next.b[0]-next.a[0],next.b[1]-next.a[1]).normalize();current.lerp(v,.5*(1-(r.length-d)/blendDistance));}
 return{x,y,z,angle:Math.atan2(current.x,current.y),bridge:r.bridge,segment:i};}d-=r.length;}}
const walkers=['teal','wine','blue','sage','ivory','ochre'].map((color,i)=>{const p=person(color,false,false,{gender:i%2?'female':'male',age:i<4?'adult':'child'});p.phase=Math.floor(i/2)*routeLength/3+2;p.size=[1.00,.83,1.02,.85,.63,.60][i];p.root.scale.setScalar(p.size);if(i>=4)p.head.scale.setScalar(1.08);return p;});
// Fishing deck, low stool, creel and a single fisherman facing the water.
for(let i=0;i<9;i++)box('woodlight',-3.35+i*.24,.76,6.24,.22,.12,1.35);
for(const x of [-3.35,-1.43])for(const z of [5.7,6.8])instance('cyl','wood',x,.46,z,.07,.65,.07);
box('wood',-2.8,1.195,6.60,.49,.09,.42);for(const x of [-2.98,-2.62])for(const z of [6.45,6.75])box('wooddark',x,1.0,z,.045,.35,.045);
const fisher=person('ochre',true,true);fisher.root.position.set(-2.8,1.24,6.56);fisher.root.rotation.y=Math.PI;fisher.arms[1].rotation.x=-1.3;
instance('cyl','woodlight',-3.65,.99,6.57,.18,.40,.18);instance('cyl','wooddark',-3.65,1.20,6.57,.13,.012,.13);
for(let i=0;i<11;i++){const a=i*TAU/11;beam([-3.65+Math.cos(a)*.18,.82,6.57+Math.sin(a)*.18],[-3.65+Math.cos(a)*.18,1.18,6.57+Math.sin(a)*.18],.009,'wooddark');}
const rodCurve=new T.CatmullRomCurve3([new T.Vector3(-2.9,1.62,6.36),new T.Vector3(-2.7,2.25,5.5),new T.Vector3(-2.4,2.65,4.50)]);
const fishingRod=mesh(new T.TubeGeometry(rodCurve,24,.012,6,false),'wooddark');fishingRod.castShadow=false;
const fishingLineGeo=new T.BufferGeometry();fishingLineGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(25*3),3));const fishingLine=new T.Line(fishingLineGeo,new T.LineBasicMaterial({color:'#d7d4b7',transparent:true,opacity:.62}));scene.add(fishingLine);
const floatGroup=new T.Group();part(floatGroup,new T.CylinderGeometry(.012,.018,.13,8),lifeMaterials.wine,0,.025,0);part(floatGroup,new T.CylinderGeometry(.010,.010,.09,8),lifeMaterials.ivory,0,.13,0);floatGroup.position.set(-2.37,.51,4.65);scene.add(floatGroup);
// Go table and two seated players in the open pavilion, with an actual 13-line board.
box('woodlight',7,1.615,4.8,.73,.055,.73);
for(let i=0;i<13;i++){const u=-.30+i*.05;box('wooddark',7+u,1.644,4.8,.006,.004,.60);box('wooddark',7,1.644,4.8+u,.60,.004,.006);}
for(const [x,z]of [[-.15,-.15],[.15,-.15],[0,0],[-.15,.15],[.15,.15]])instance('cyl','wooddark',7+x,1.649,4.8+z,.011,.004,.011);
const stoneMoves=[[3,3],[9,9],[3,9],[9,3],[4,3],[8,9],[4,4],[8,8],[5,4],[7,8],[5,5],[7,7],[5,6],[6,7],[4,6],[8,7],[6,5],[9,7],[7,5],[9,6],[7,4],[8,5],[6,3],[10,5],[3,7],[10,8],[4,8],[8,3],[6,8]];
stoneMoves.forEach(([x,z],i)=>instance('leaf',i%2?'lightstone':'black',7-.3+x*.05,1.662,4.5+z*.05,.023,.012,.023));
for(const x of [6.51,7.49]){instance('cyl','wooddark',x,1.60,4.8,.10,.10,.10);ball('black',x,1.66,4.8,.075,.015,.075);}
const players=[person('blue',true),person('ivory',true)];players[0].root.position.set(7,1.38,4.07);players[1].root.position.set(7,1.38,5.53);players[1].root.rotation.y=Math.PI;
// Delicate butterfly wings: vein patterns painted into an offline cutout texture.
const butterflyMap=textureCanvas((g,n)=>{g.clearRect(0,0,n,n);const wing=(cx,cy,rx,ry)=>{g.beginPath();g.ellipse(cx,cy,rx,ry,-.35,0,TAU);g.fillStyle='#f5dfb1';g.fill();g.strokeStyle='#493e35';g.lineWidth=10;g.stroke();};wing(145,83,88,64);wing(125,168,71,57);g.strokeStyle='#6b5143';g.lineWidth=2;for(let i=0;i<10;i++){g.beginPath();g.moveTo(42,128);g.quadraticCurveTo(100,80+i*8,165+Math.cos(i)*47,30+i*19);g.stroke();}for(let i=0;i<15;i++){const a=i/15*TAU;g.fillStyle='#fff5d4';g.beginPath();g.arc(142+Math.cos(a)*67,110+Math.sin(a)*67,4,0,TAU);g.fill();}});
const butterflyWing=new T.PlaneGeometry(.23,.30);butterflyWing.translate(.11,0,0);butterflyWing.rotateX(-Math.PI/2);
const butterflyPaths=[
 [[-11,1.2,2],[-9.5,1.8,3.0],[-9,1.1,6.4],[-7.5,1.6,9],[-11.6,1.3,8]],
 [[-6,1.5,9],[-2.8,1.1,9.3],[2.7,1.6,9.1],[3.5,1.8,7.6],[-1.5,1.1,7.1]],
 [[10.5,1.2,4.7],[12,1.9,3.3],[12,1.3,7.5],[9.2,1.6,9.3],[9.8,1.1,6.8]],
 [[-12,1.2,-3],[-11.4,1.8,-1.2],[-10.4,1.3,.8],[-9.3,1.7,1.6],[-11.7,1.2,.7]]
].map(points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),true,'catmullrom',.30));
const butterflies=[];for(let i=0;i<4;i++){const group=new T.Group(),m=new T.MeshStandardMaterial({map:butterflyMap,color:['#f0cc7e','#d4deec','#dcab91'][i%3],alphaTest:.4,side:T.DoubleSide,roughness:.95});const wings=[];for(const sign of [-1,1]){const pivot=new T.Group(),wing=new T.Mesh(butterflyWing,m);wing.scale.x=sign;pivot.add(wing);group.add(pivot);wings.push(pivot);}part(group,skinGeometry,'ink',0,0,0,.015,.016,.105);scene.add(group);group.scale.setScalar(.65);butterflies.push({group,wings,path:butterflyPaths[i],phase:i*2.399});}
// Four translucent, veined wings and a long segmented abdomen for each dragonfly.
const dragonMap=textureCanvas((g,n)=>{g.clearRect(0,0,n,n);g.fillStyle='#e2eade9c';g.beginPath();g.ellipse(n*.5,n*.5,n*.47,n*.21,0,0,TAU);g.fill();g.strokeStyle='#718b7b99';g.lineWidth=1;for(let i=0;i<12;i++){g.beginPath();g.moveTo(8,n*.5);g.lineTo(n*.15+i*n*.06,n*.30);g.lineTo(n*.13+i*n*.06,n*.70);g.stroke();}g.beginPath();g.moveTo(8,n*.5);g.lineTo(n*.94,n*.5);g.stroke();});
const dragonWingGeo=new T.PlaneGeometry(.30,.11);dragonWingGeo.rotateX(-Math.PI/2);const dragonWingMat=new T.MeshBasicMaterial({map:dragonMap,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false});
const dragonflies=[];for(let i=0;i<3;i++){const group=new T.Group(),wings=[];part(group,clothCylinder,mat(i%2?'#546d71':'#a35a43'),0,0,0,.012,.30,.012).rotation.x=Math.PI/2;part(group,skinGeometry,'ink',0,.01,.15,.031,.026,.026);for(const sign of [-1,1])for(const z of [-.03,.05]){const wing=new T.Mesh(dragonWingGeo,dragonWingMat);wing.position.set(sign*.15,.01,z);wing.rotation.y=sign*(z<0?.25:-.18);group.add(wing);wings.push(wing);}scene.add(group);dragonflies.push({group,wings,phase:i*1.618,site:lotusSites[(i*4)%lotusSites.length]});}
// Warm silk lanterns hang outside the walking clearance under the eaves.
const lanternMaterial=mat('#a54d32',{emissive:'#ee6e20',emissiveIntensity:.38,roughness:.72});
const lanternProfile=[new T.Vector2(.06,-.23),new T.Vector2(.105,-.20),new T.Vector2(.157,-.12),new T.Vector2(.175,0),new T.Vector2(.157,.12),new T.Vector2(.105,.20),new T.Vector2(.06,.23)];
const lanternShell=new T.LatheGeometry(lanternProfile,24),hangingLanterns=[];
for(const [x,y,z]of [[-.55,3.38,-5.54],[5.35,3.38,-5.54],[9.99,2.70,-4.7],[9.99,2.70,-2.4],[9.99,2.70,-.1],[5.65,3.35,6.20],[8.35,3.35,6.20]]){
 const pivot=new T.Group();pivot.position.set(x,y,z);scene.add(pivot);rodPart(pivot,[0,0,0],[0,-.18,0],.009,'ink');
 const body=new T.Group();body.position.y=-.42;pivot.add(body);part(body,lanternShell,lanternMaterial,0,0,0);
 for(const sign of [-1,1]){part(body,new T.CylinderGeometry(.105,.105,.035,16),lifeMaterials.belt,0,sign*.215,0);part(body,new T.TorusGeometry(.105,.009,5,24),lifeMaterials.ochre,0,sign*.235,0).rotation.x=Math.PI/2;}
 for(let i=0;i<12;i++){const a=i*TAU/12,pts=lanternProfile.map(p=>new T.Vector3(Math.cos(a)*(p.x+.004),p.y,Math.sin(a)*(p.x+.004)));const curve=new T.CatmullRomCurve3(pts);part(body,new T.TubeGeometry(curve,12,.004,4,false),lifeMaterials.belt,0,0,0);}
 for(let j=0;j<6;j++)rodPart(body,[.012*Math.cos(j),-.24,.012*Math.sin(j)],[.018*Math.cos(j),-.43,.018*Math.sin(j)],.004,lifeMaterials.wine);
 mergeBodyParts(body);hangingLanterns.push(pivot);
}
// Dry tobacco pipe: the mouthpiece reaches the lips during the short held pose.
const tobaccoPipe=new T.Group();fisher.body.add(tobaccoPipe);
rodPart(tobaccoPipe,[0,0,-.145],[0,0,.25],.009,'ochre');rodPart(tobaccoPipe,[0,0,-.145],[0,0,-.10],.012,'ink');
part(tobaccoPipe,new T.CylinderGeometry(.033,.025,.052,10),lifeMaterials.belt,0,.015,.25);
part(tobaccoPipe,new T.CylinderGeometry(.025,.025,.004,10),mat('#4f3024',{emissive:'#a84416',emissiveIntensity:.4}),0,.043,.25);
const smokeMap=textureCanvas((g,n)=>{g.clearRect(0,0,n,n);const gradient=g.createRadialGradient(n*.5,n*.5,0,n*.5,n*.5,n*.5);gradient.addColorStop(0,'rgba(217,217,201,.42)');gradient.addColorStop(.3,'rgba(217,217,201,.28)');gradient.addColorStop(1,'rgba(217,217,201,0)');g.fillStyle=gradient;g.fillRect(0,0,n,n);},64);
const smoke=[];for(let i=0;i<18;i++){const p=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:smokeMap,transparent:true,depthWrite:false,opacity:0,side:T.DoubleSide}));p.renderOrder=5;scene.add(p);smoke.push(p);}
const pipeHand=new T.Vector3(),mouthPoint=new T.Vector3(0,1.195,.102),pipeDirection=new T.Vector3(),smokeSource=new T.Vector3();let smokingLift=0;
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
function smokingPhase(t){return((t+11)%24+24)%24;}
function updateSmoking(t){const phase=smokingPhase(t);smokingLift=smooth(5,9,phase)*(1-smooth(12,16,phase));
 fisher.arms[0].rotation.set(-.4-1.7*smokingLift,0,.65*smokingLift);fisher.arms[0].updateMatrix();pipeHand.set(-.11,-.31,.065).applyMatrix4(fisher.arms[0].matrix);pipeDirection.copy(pipeHand).sub(mouthPoint).normalize();tobaccoPipe.position.copy(pipeHand);tobaccoPipe.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),pipeDirection);
 fisher.root.updateMatrixWorld(true);smokeSource.copy(mouthPoint).applyMatrix4(fisher.body.matrixWorld);
 for(let i=0;i<smoke.length;i++){const age=(t+i*.323)%5.8,birthPhase=smokingPhase(t-age),emitting=birthPhase>=9.5&&birthPhase<=13.0,p=smoke[i];p.visible=emitting;p.position.copy(smokeSource);p.position.x+=age*(.035+.045*wind)+Math.sin(age*1.5+i)*.025*age;p.position.y+=age*.17;p.position.z+=Math.cos(age*1.1+i)*.035*age;p.scale.setScalar(.07+age*.075);p.quaternion.copy(camera.quaternion);p.material.opacity=emitting?(1-age/5.8)*.65:0;}
}
// A paired flight across several flower beds, parameterized by distance for steady travel.
const pairedFlight=new T.CatmullRomCurve3([[-12,1.3,3.2],[-11.9,1.5,8.2],[-7.4,1.25,9.1],[-3.1,1.5,9.45],[3.8,1.35,9.3],[8.8,1.6,8.8],[12.9,2.2,7.9],[12.4,1.4,4.6],[12.8,2.2,7.9],[9.4,2,9.4],[3.2,1.9,8.4],[-4.5,1.8,8.5],[-10.3,1.7,7.5]].map(p=>new T.Vector3(...p)),true,'catmullrom',.25);
pairedFlight.arcLengthDivisions=600;const pairedLength=pairedFlight.getLength();
/* GARDEN_ANIMALS */
/* GARDEN_BIRDS */
flush();
function updateGardenLife(t){
 updateAnimals(t);updateBirds(t);
 updateWalkers(t);
 fisher.body.rotation.x=.025+Math.sin(t*.38)*.008;fisher.arms[1].rotation.x=-1.3+Math.sin(t*.7)*.025;
 updateSmoking(t);for(let i=0;i<hangingLanterns.length;i++){hangingLanterns[i].rotation.z=Math.sin(t*.65+i*1.9)*.027*wind;hangingLanterns[i].rotation.x=Math.cos(t*.49+i)*.018*wind;}
 floatGroup.position.y=.51+Math.sin(t*1.7)*.018;const arr=fishingLineGeo.attributes.position.array;for(let i=0;i<=24;i++){const u=i/24;arr[i*3]=-2.4+.03*u+Math.sin(Math.PI*u)*Math.sin(t*.5)*.016;arr[i*3+1]=2.65+(floatGroup.position.y+.13-2.65)*u;arr[i*3+2]=4.50+.15*u;}fishingLineGeo.attributes.position.needsUpdate=true;
 players.forEach((p,i)=>{p.body.rotation.x=.04+Math.sin(t*.19+i*Math.PI)*.025;p.arms[i].rotation.x=-1.25-Math.pow(Math.max(0,Math.sin(t*.12+i*Math.PI)),8)*.15;});
 for(let i=0;i<butterflies.length;i++){const b=butterflies[i],paired=i<2,u=paired?((t*1.45/pairedLength+.24)%1):((t*.022+b.phase/TAU+.006*Math.sin(t*.35+b.phase))%1),path=paired?pairedFlight:b.path,p=path.getPointAt(u),tangent=path.getTangentAt(u);b.group.position.copy(p);if(paired){const side=i===0?-1:1,offset=side*(.20+.08*Math.sin(t*2.0));b.group.position.x+=tangent.z*offset;b.group.position.z-=tangent.x*offset;b.group.position.y+=side*Math.sin(t*2.3)*.14;}else b.group.position.y+=Math.sin(t*3.1+b.phase)*.10;b.group.rotation.y=Math.atan2(tangent.x,tangent.z);b.group.rotation.z=Math.sin(t*1.7+b.phase)*.20;b.group.visible=weather!=='rain';const flap=.25+Math.sin(t*24+b.phase)*.90;b.wings[0].rotation.z=flap;b.wings[1].rotation.z=-flap;}
 for(const d of dragonflies){const a=t*.34+d.phase,fly=.5+.5*Math.sin(t*.22+d.phase),radius=.08+fly*.78;d.group.position.set(d.site[0]+Math.cos(a)*radius,d.site[1]+.12+fly*.58,d.site[2]+Math.sin(a*1.4)*radius*.60);d.group.rotation.y=-a;d.group.visible=weather!=='rain';for(let j=0;j<d.wings.length;j++)d.wings[j].rotation.z=Math.sin(t*53+d.phase+j*.7)*.17;}
}
function lifeState(){return{walkers:walkers.map(p=>p.root.position.toArray()),butterflies:butterflies.map(p=>p.group.position.toArray()),pairedButterflies:2,dragonflies:dragonflies.map(p=>p.group.position.toArray()),...animalState(),residents:residentState(),birds:birdState(),fishermen:1,chessPlayers:players.length,chessStones:stoneMoves.length,fishingFloat:floatGroup.position.toArray(),lanterns:hangingLanterns.length,smokingLift,smokeVisible:smoke.filter(p=>p.visible).length,routeLength};}
