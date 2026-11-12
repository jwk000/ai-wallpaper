// Detailed botanical geometry and eroded limestone, all generated locally.
const birdPerches=[];
const natureStats={leaves:0,rocks:0,flowers:0,lotusFlowers:0,lotusLeaves:0};
function textureCanvas(paint,size=256){const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const turfTexture=textureCanvas((g,n)=>{g.fillStyle='#8c9773';g.fillRect(0,0,n,n);for(let i=0;i<30000;i++){const v=Math.floor(rr(60,145));g.fillStyle=`rgba(${v},${v+15},${Math.floor(v*.65)},.25)`;g.fillRect(rr(0,n),rr(0,n),rr(.3,1.8),rr(.5,2.8));}});turfTexture.repeat.set(1.8,1.8);M.grass.color.set('#c4c8ac');M.grass.map=turfTexture;M.grass.bumpMap=turfTexture;M.grass.bumpScale=.035;
const barkTexture=textureCanvas((g,n)=>{g.fillStyle='#81725a';g.fillRect(0,0,n,n);for(let i=0;i<950;i++){const x=rr(0,n),y=rr(0,n);g.strokeStyle=i%3?'#3b393061':'#cfb58b55';g.lineWidth=rr(.3,2);g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+rr(-5,5),y+9,x+rr(-5,5),y+22,x+rr(-3,3),y+rr(25,65));g.stroke();}});
M.bark=mat('#c1b49c',{map:barkTexture,bumpMap:barkTexture,bumpScale:.045});
M.rock=mat('#9a9b90',{roughness:.98,vertexColors:true});M.rock.side=T.DoubleSide;
M.rock.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 stonePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n stonePosition=position;');shader.fragmentShader='varying vec3 stonePosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float grain=fract(sin(dot(floor(stonePosition*190.0),vec3(12.9898,78.233,31.41)))*43758.5453);
float striation=sin(stonePosition.x*52.0+stonePosition.y*7.0+sin(stonePosition.z*26.0)*1.8);
diffuseColor.rgb*=.95+.04*grain+.025*striation;`);};
M.herb=mat('#547346',{side:T.DoubleSide});M.petals=mat('#e3b2be',{side:T.DoubleSide});M.flower.color.set('#d694a7');M.flower.side=T.DoubleSide;M.ochre=mat('#d4b968',{side:T.DoubleSide});M.wildwhite=mat('#ece4c6',{side:T.DoubleSide});M.wildpink=mat('#c68d9b',{side:T.DoubleSide});M.wildblue=mat('#8a9cb7',{side:T.DoubleSide});M.lotus.color.set('#638551');
for(const key of ['leaf','leaf2','pine','pink']){M[key].side=T.DoubleSide;M[key].roughness=.95;}
M.leaf.color.set('#476d3b');M.leaf2.color.set('#7d9557');M.pine.color.set('#375d42');
// Folded pointed leaves: six facets, a lifted midrib, and no opaque canopy balls.
const leafGeo=new T.BufferGeometry(),leafVertices=[],leafIndices=[];for(let j=0;j<=6;j++){const v=j/6,w=.34*Math.sin(Math.PI*v)**.85;leafVertices.push(-w,.035*Math.sin(v*Math.PI),v,0,.105*Math.sin(v*Math.PI),v,w,.035*Math.sin(v*Math.PI),v);if(j<6){const a=j*3;leafIndices.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}}leafGeo.setAttribute('position',new T.Float32BufferAttribute(leafVertices,3));leafGeo.setIndex(leafIndices);leafGeo.computeVertexNormals();geo.botleaf=leafGeo;
const needlePositions=[];for(let j=0;j<10;j++){const a=j*2.399,r=.25+(j%3)*.10,px=Math.cos(a)*r,pz=Math.sin(a)*r;needlePositions.push(0,0,0,px-.015,.12,pz,px,.20+(j%4)*.06,pz+.18);}geo.needles=new T.BufferGeometry();geo.needles.setAttribute('position',new T.Float32BufferAttribute(needlePositions,3));geo.needles.computeVertexNormals();
function foliageLeaf(x,y,z,size,kind='leaf',angle=0){instance(kind==='pine'?'needles':'botleaf',kind,x,y,z,size,size,size,[rr(-1.4,1.4),angle||rr(0,TAU),rr(-.7,.7)],new T.Color().setHSL(.20+rr(-.025,.025),rr(.10,.23),rr(.65,1)));natureStats.leaves++;}
function twig(points,radius,material='bark'){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));let previous=path.getPoint(0);for(let i=1;i<=9;i++){const p=path.getPoint(i/9);beam(previous.toArray(),p.toArray(),radius*(1-i/11),material);previous=p;}return path;}
function naturalTree(x,z,s,kind){const lean=rr(-.4,.4),trunk=twig([[x,.65,z],[x-.1*s,1.45*s+.65,z+.08*s],[x+lean*s,2.45*s+.65,z-.14*s],[x+lean*s+.18*s,3.2*s+.65,z+.05*s]],.16*s);
 const pine=kind==='pine',branches=pine?10:12;
 for(let b=0;b<branches;b++){const a=b*2.399+rr(-.2,.2),u=.30+b/branches*.61,start=trunk.getPoint(u),spread=(1-u*.6)*rr(1.15,1.8)*s,ey=start.y+(pine?.12:.40)*s,end=new T.Vector3(start.x+Math.cos(a)*spread,ey,start.z+Math.sin(a)*spread);
  const branchCurve=twig([start.toArray(),[start.x+Math.cos(a)*spread*.42,start.y-.12*s,start.z+Math.sin(a)*spread*.42],end.toArray()],.052*s*(1-u*.4));if(b===2)birdPerches.push(branchCurve.getPoint(.66));
  for(let sub=0;sub<5;sub++){const aa=a+(sub-2)*.44,reach=rr(.32,.70)*s,origin=start.clone().lerp(end,.45+sub*.10),tip=new T.Vector3(end.x+Math.cos(aa)*reach,end.y+rr(.05,.33)*s,end.z+Math.sin(aa)*reach);beam(origin.toArray(),tip.toArray(),.012*s,'bark');
   const count=pine?42:72;for(let k=0;k<count;k++){const az=random()*TAU,r=Math.sqrt(random())*rr(.30,.58)*s,px=tip.x+Math.cos(az)*r,pz=tip.z+Math.sin(az)*r,py=tip.y+rr(-.16,.26)*s;
    foliageLeaf(px,py,pz,rr(pine?.20:.12,pine?.32:.23)*s,kind,az);
   }
  }
 }
 for(let i=0;i<6;i++){const a=i*1.2;twig([[x,.91,z],[x+Math.cos(a)*.18*s,.73,z+Math.sin(a)*.18*s],[x+Math.cos(a)*.44*s,.66,z+Math.sin(a)*.44*s]],.045*s);}
}
function naturalShrub(x,z){for(let branch=0;branch<12;branch++){const a=branch*2.4,bx=x+Math.cos(a)*rr(.2,.6),bz=z+Math.sin(a)*rr(.15,.45),h=rr(.3,.65);beam([x,.65,z],[bx,.65+h,bz],.013,'bark');for(let j=0;j<38;j++)foliageLeaf(bx+rr(-.25,.25),.7+h+rr(-.15,.15),bz+rr(-.25,.25),rr(.08,.16),j%5?'leaf':'leaf2');}}
/* GARDEN_WILLOW */
// A watertight implicit stone solid, excavated by noncircular winding tunnels.
// Marching tetrahedra avoids the repeated torus silhouettes of the earlier rocks.
const rockCache=[];
function makeLimestone(variant){
 const phase=variant*1.91,ellipsoids=[[-.3,.25,.04,.63,.40,.51],[.21,.72,.02,.50,.69,.41],[-.25,1.30,-.06,.43,.68,.36],[.08,1.88,-.04,.32,.50,.31],[.43,.31,.14,.41,.36,.40],[-.48,.88,.06,.29,.44,.33]];
 function field(x,y,z){let f=10;for(const [cx,cy,cz,rx,ry,rz]of ellipsoids){const d=(Math.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2)-1)*Math.min(rx,ry,rz);const h=Math.max(.16-Math.abs(f-d),0)/.16;f=Math.min(f,d)-h*h*.04;}
  const cut1=Math.hypot((x-.05-Math.sin(z*4+phase)*.09)*.95,(y-.73-Math.sin(z*3)*.04)*1.1)-.20;
  const cut2=Math.hypot((x+.17-Math.sin(z*3+phase)*.045)*1.2,(y-1.43)*.9)-.16;
  const cut3=Math.hypot((z-.04-Math.sin(x*5)*.06)*1.15,(y-1.95)*1.3)-.10;
  f=Math.max(f,-cut1,-cut2,-cut3);
  return f+.012*Math.sin(x*21+y*8+phase)*Math.sin(y*17-z*12)+.005*Math.sin(x*43+z*31)*Math.sin(y*37)+.025*Math.sin(x*8+y*3)*Math.cos(z*9+y*4);
 }
 const nx=34,ny=46,nz=26,x0=-1.02,y0=-.12,z0=-.67,dx=2.04/nx,dy=2.67/ny,dz=1.34/nz,values=new Float32Array((nx+1)*(ny+1)*(nz+1)),positions=[];
 const index=(x,y,z)=>(y*(nz+1)+z)*(nx+1)+x;
 for(let y=0;y<=ny;y++)for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++)values[index(x,y,z)]=field(x0+x*dx,y0+y*dy,z0+z*dz);
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 for(let y=0;y<ny;y++)for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const vals=corners.map(c=>values[index(x+c[0],y+c[1],z+c[2])]);if(vals.every(v=>v>0)||vals.every(v=>v<0))continue;
  const coords=corners.map(c=>[x0+(x+c[0])*dx,y0+(y+c[1])*dy,z0+(z+c[2])*dz]);
  const edge=(a,b)=>{const t=vals[a]/(vals[a]-vals[b]);return coords[a].map((v,i)=>v+(coords[b][i]-v)*t);};
  for(const tet of tetra){const inside=tet.filter(i=>vals[i]<0),outside=tet.filter(i=>vals[i]>=0);if(!inside.length||!outside.length)continue;
   if(inside.length===1||inside.length===3){const a=inside.length===1?inside[0]:outside[0],other=inside.length===1?outside:inside;for(const b of other)positions.push(...edge(a,b));}
   else{const a=edge(inside[0],outside[0]),b=edge(inside[0],outside[1]),c=edge(inside[1],outside[0]),d=edge(inside[1],outside[1]);positions.push(...a,...b,...c,...b,...d,...c);}
  }
 }
 const normals=[],colors=[],color=new T.Color();for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3),e=.006,n=new T.Vector3(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();normals.push(n.x,n.y,n.z);const shade=.64+.22*(.5+.5*Math.sin(x*14+y*9+Math.sin(z*17)));color.setRGB(shade,shade*1.01,shade*.96);if(y<.38&&Math.sin(x*12+z*9)>.05)color.lerp(new T.Color('#587042'),.55);colors.push(color.r,color.g,color.b);}
 // Align each triangle winding with the analytical outward gradient.
 for(let i=0;i<positions.length;i+=9){const a=new T.Vector3(...positions.slice(i,i+3)),b=new T.Vector3(...positions.slice(i+3,i+6)),c=new T.Vector3(...positions.slice(i+6,i+9)),n=new T.Vector3(...normals.slice(i,i+3));if(b.sub(a).cross(c.sub(a)).dot(n)<0){for(const arr of [positions,normals,colors])for(let k=0;k<3;k++){const v=arr[i+3+k];arr[i+3+k]=arr[i+6+k];arr[i+6+k]=v;}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;
}
function naturalRock(x,z,s){const v=natureStats.rocks%3;if(!rockCache[v])rockCache[v]=makeLimestone(v);const o=mesh(rockCache[v],'rock',[x,.64,z]);o.scale.set(s*rr(.9,1.1),s*rr(.88,1.05),s);o.rotation.y=rr(-1,1);natureStats.rocks++;for(let i=0;i<24;i++){const a=random()*TAU,r=rr(.35,.65)*s;instance('pebble','darkstone',x+Math.cos(a)*r,.69,z+Math.sin(a)*r,.08*s,.04*s,.06*s);}}
// Cupped leaves with a radial notch, surface veins and stems of varied heights.
const padPositions=[],padIndices=[];for(let i=0;i<=40;i++){const a=.13+i/40*(TAU-.26);padPositions.push(0,0,0,Math.cos(a)*.55,.02,Math.sin(a)*.55,Math.cos(a),.10+.045*Math.sin(a*6),Math.sin(a));if(i<40){const k=i*3;padIndices.push(k,k+1,k+4,k+1,k+2,k+5,k+1,k+5,k+4);}}const padGeometry=new T.BufferGeometry();padGeometry.setAttribute('position',new T.Float32BufferAttribute(padPositions,3));padGeometry.setIndex(padIndices);padGeometry.computeVertexNormals();geo.lotuspad=padGeometry;
// A curved petal surface, thin enough to read as petals instead of little spheres.
const petalPositions=[],petalIndex=[];for(let j=0;j<=6;j++)for(let i=0;i<=4;i++){const v=j/6,u=i/4*2-1;petalPositions.push(u*Math.sin(Math.PI*v)*.36,v*v*.48,v);}for(let j=0;j<6;j++)for(let i=0;i<4;i++){const a=j*5+i;petalIndex.push(a,a+5,a+1,a+1,a+5,a+6);}geo.petal=new T.BufferGeometry();geo.petal.setAttribute('position',new T.Float32BufferAttribute(petalPositions,3));geo.petal.setIndex(petalIndex);geo.petal.computeVertexNormals();
const lotusSites=[];
function lotusFlower(x,z,h,s=1){const y=.5+h;beam([x,.45,z],[x+.035,y,z],.012,'moss');for(let ring=0;ring<3;ring++){const count=ring===0?10:8,size=(.26-ring*.035)*s;for(let j=0;j<count;j++){const a=j/count*TAU+ring*.30;instance('petal',ring===0?'flower':'petals',x,y,z,size,.30*s,size,[-.08-ring*.26,a,0]);}}instance('cyl','ochre',x,y+.06,z,.05*s,.05,.05*s);for(let j=0;j<7;j++)ball('gold',x+Math.cos(j)*.032*s,y+.095,z+Math.sin(j)*.032*s,.007);natureStats.lotusFlowers++;lotusSites.push([x,y+.16,z]);}
function plantLotuses(){for(let i=0;i<62;i++){const front=i>=42,a=random()*TAU,r=Math.sqrt(random())*(front?1.05:1.8),cx=front?.25:-4.65,cz=front?4.65:-.8,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*.68,h=i%5===0?rr(.18,.40):rr(.025,.09),s=rr(.19,.40);instance('lotuspad','lotus',x,.5+h,z,s,s,s,[rr(-.12,.12),a,rr(-.1,.1)]);beam([x,.36,z],[x,.5+h,z],.009,'moss');for(let j=0;j<8;j++){const aa=a+j*TAU/8;beam([x,.51+h,z],[x+Math.cos(aa)*s*.93,.54+h,z+Math.sin(aa)*s*.93],.0035,'leaf2');}natureStats.lotusLeaves++;if(i%6===0)lotusFlower(x+.12,z-.08,rr(.38,.65),rr(.85,1.2));else if(i%13===0){beam([x,.5,z],[x,1.01,z],.012,'moss');instance('leaf','flower',x,1.05,z,.065,.12,.065);}}}
const meadowBeds=[[-7.4,9.1],[-3.1,9.45],[3.8,9.3],[8.8,8.8],[12.2,4.6],[-12.0,3.2],[-12.0,8.2]];
function plantMeadow(){for(const [cx,cz]of meadowBeds){for(let i=0;i<36;i++){const a=random()*TAU,r=Math.sqrt(random())*.7,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*.57,h=rr(.18,.48),kind=['wildwhite','wildpink','wildblue','ochre'][Math.floor(random()*4)];beam([x,.65,z],[x,.65+h,z],.005,'herb');for(let k=0;k<3;k++)instance('botleaf','herb',x,.68+h*k/3,z,.07,.07,.14,[rr(-.4,.6),random()*TAU,.2]);for(let j=0;j<6;j++)instance('petal',kind,x,.65+h,z,.09,.08,.12,[.1,j*TAU/6,0]);ball('ochre',x,.665+h,z,.025,.016,.025);natureStats.flowers++;}
 for(let i=0;i<170;i++){const x=cx+rr(-.9,.9),z=cz+rr(-.55,.55);instance('botleaf','herb',x,.65,z,.025,.14,rr(.12,.30),[rr(-1.3,-.3),random()*TAU,rr(-.2,.2)]);}}
}

/* GARDEN_FLORA */
