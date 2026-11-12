// Individual overlapped clay tiles, exposed timber joints, and irregular bluestone paving.
const architectureStats={pavingStones:0,irregularStones:0,roofTiles:0,timberFrames:0,doorLeaves:0};
M.bluestone=mat('#647c88',{vertexColors:true,roughness:.94});M.roof.color.set('#293636');M.tile.color.set('#3d4a49');M.tileedge.color.set('#596463');
M.clay=mat('#a8b0ad',{vertexColors:true,side:T.DoubleSide,roughness:.93});M.endgrain=mat('#947557');
const blueTexture=textureCanvas((g,n)=>{g.fillStyle='#bdc5c7';g.fillRect(0,0,n,n);for(let i=0;i<16000;i++){const v=Math.floor(rr(135,200));g.fillStyle=`rgba(${v},${v+3},${v+4},.16)`;g.fillRect(rr(0,n),rr(0,n),rr(.3,2),rr(.4,2));}for(let i=0;i<32;i++){const x=rr(0,n),y=rr(0,n);g.strokeStyle='#d3d9d422';g.lineWidth=rr(.3,1);g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+30,y-9,x+60,y+8,x+100,y+rr(-20,20));g.stroke();}});
M.bluestone.map=blueTexture;M.bluestone.bumpMap=blueTexture;M.bluestone.bumpScale=.012;
const pavingChunks=[];
function clipCell(poly,nx,ny,c){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*ny-c,db=b[0]*nx+b[1]*ny-c;if(da<=0)out.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;}
function bluestonePaving(points,width){for(let k=0;k<points.length-1;k++){const a=points[k],b=points[k+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length,rows=Math.max(1,Math.ceil(length/.64)),seeds=[];
 for(let row=0;row<rows;row++)for(let col=0;col<2;col++)seeds.push([(col-.5)*width*.48+rr(-.15,.15)*width,(row+.5+rr(-.22,.22))*length/rows]);
 for(const seed of seeds){let poly=[[-width/2,0],[width/2,0],[width/2,length],[-width/2,length]];for(const other of seeds){if(seed===other)continue;poly=clipCell(poly,other[0]-seed[0],other[1]-seed[1],(other[0]**2+other[1]**2-seed[0]**2-seed[1]**2)/2);if(poly.length<3)break;}if(poly.length<3)continue;
  const cx=poly.reduce((v,p)=>v+p[0],0)/poly.length,cz=poly.reduce((v,p)=>v+p[1],0)/poly.length;
  // Narrow joints and tiny clipped corners make each edge look hand split.
  poly=poly.map(p=>[cx+(p[0]-cx)*.94,cz+(p[1]-cz)*.94]);const chipped=[];for(let i=0;i<poly.length;i++){const p=poly[i],prev=poly[(i+poly.length-1)%poly.length],next=poly[(i+1)%poly.length];chipped.push([p[0]+(prev[0]-p[0])*.09,p[1]+(prev[1]-p[1])*.09],[p[0]+(next[0]-p[0])*.06,p[1]+(next[1]-p[1])*.06]);}
  const world=chipped.map(p=>[a[0]+dx*p[1]-dz*p[0],a[1]+dz*p[1]+dx*p[0]]),g=new T.ExtrudeGeometry(polygon(world),{depth:.085,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.006});g.rotateX(-Math.PI/2);g.translate(0,.648+k*.00004,0);const color=new T.Color().setHSL(rr(.48,.55),rr(.02,.09),rr(.82,.99));pavingChunks.push({g,color});architectureStats.pavingStones++;if(chipped.length>4)architectureStats.irregularStones++;
 }
}}
function finishPaving(){const position=[],normal=[],uv=[],colors=[];for(const chunk of pavingChunks){const g=chunk.g.index?chunk.g.toNonIndexed():chunk.g;const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){position.push(p.getX(i),p.getY(i),p.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(p.getX(i)*1.7,p.getZ(i)*1.7);colors.push(chunk.color.r,chunk.color.g,chunk.color.b);}g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));mesh(g,'bluestone');pavingChunks.length=0;}
function layeredRoof(x,z,y,w,d,h){activeRoof=Math.abs(x-7)<.01&&Math.abs(z-4.8)<.01?'pavilion':'roof';const rh=w*.24,hw=w/2,hd=d/2,lift=Math.min(.53,.16+Math.min(w,d)*.09);
 function surface(side,u,v){const edge=Math.abs(u),boost=1+.025*Math.pow(edge,6)*Math.pow(v,8),yy=y+h*Math.pow(1-v,1.7)+lift*Math.pow(edge,7)*Math.pow(v,5)+.11*Math.pow(v,10);if(side<2)return new T.Vector3(x+u*(rh+(hw-rh)*v)*boost,yy,z+(side===0?1:-1)*hd*v*boost);return new T.Vector3(x+(side===2?1:-1)*(rh+(hw-rh)*v)*boost,yy,z+u*hd*v*boost);}
 const tilePos=[],tileColors=[];
 function tri(a,b,c,color){for(const p of [a,b,c]){tilePos.push(p.x,p.y,p.z);tileColors.push(color.r,color.g,color.b);}}
 function tile(side,u,halfWidth,v0,v1,cap){const vertices=[[],[]],shade=rr(.34,.49)+(cap?.025:0),color=new T.Color().setRGB(shade,shade*1.035,shade*1.025);
  for(let row=0;row<2;row++)for(let col=0;col<=4;col++){const s=col/2-1,p=surface(side,clamp(u+s*halfWidth,-1,1),row?v1:v0);p.y+=.025+(row?.046:0)+(cap?.047*Math.sqrt(Math.max(0,1-s*s)):-.012*(1-s*s));vertices[row].push(p);}
  for(let col=0;col<4;col++){tri(vertices[0][col],vertices[1][col],vertices[0][col+1],color);tri(vertices[0][col+1],vertices[1][col],vertices[1][col+1],color);const a=vertices[1][col],b=vertices[1][col+1],c=a.clone().add(new T.Vector3(0,-.024,0)),d=b.clone().add(new T.Vector3(0,-.024,0)),dark=color.clone().multiplyScalar(.72);tri(a,c,b,dark);tri(b,c,d,dark);}architectureStats.roofTiles++;
 }
 for(let side=0;side<4;side++){const pos=[],indices=[],nu=side<2?32:20,nv=16;for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const p=surface(side,i/nu*2-1,j/nv);pos.push(p.x,p.y-.035,p.z);}for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;indices.push(a,b,a+1,b,b+1,a+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,'roof').material.side=T.DoubleSide;
  const cols=Math.max(9,Math.ceil((side<2?w:d)/.22)),rows=Math.max(5,Math.ceil(Math.hypot(h,hd)/.29));
  // Laid from eave to ridge: each upper course covers the following one's head.
  for(let row=rows-1;row>=0;row--){const v0=.04+row*.96/rows,v1=Math.min(1,.04+(row+1.14)*.96/rows);for(let col=0;col<cols;col++){tile(side,-1+(col+.5)*2/cols,.93/cols,v0,v1,false);tile(side,-1+(col+1)*2/cols,.33/cols,v0,v1,true);}}
  // Curved fascia under the eaves, with separate hanging tile ends.
  for(let i=0;i<cols;i++){const a=surface(side,-1+i*2/cols,1),b=surface(side,-1+(i+1)*2/cols,1);beam([a.x,a.y-.07,a.z],[b.x,b.y-.07,b.z],.055,'wooddark');}
  for(let i=0;i<=cols;i++){const p=surface(side,-1+i*2/cols,1);ball('tileedge',p.x,p.y+.06,p.z,.042,.052,.042);}
  for(const u of [-1,1]){let p=surface(side,u,0);for(let j=1;j<=20;j++){const n=surface(side,u,j/20);beam([p.x,p.y+.085,p.z],[n.x,n.y+.085,n.z],.055,'tileedge');p=n;}}
  for(let i=1;i<cols;i+=3){const u=-1+i*2/cols;let a=surface(side,u,.12);for(let j=1;j<=5;j++){const b=surface(side,u,.12+j*.88/5);beam([a.x,a.y-.13,a.z],[b.x,b.y-.13,b.z],.033,'wood');a=b;}}
 }
 const tiles=new T.BufferGeometry();tiles.setAttribute('position',new T.Float32BufferAttribute(tilePos,3));tiles.setAttribute('color',new T.Float32BufferAttribute(tileColors,3));tiles.computeVertexNormals();mesh(tiles,'clay');
 beam([x-rh,y+h+.08,z],[x+rh,y+h+.08,z],.085,'tileedge');for(const sign of [-1,1]){beam([x+sign*rh,y+h+.08,z],[x+sign*(rh+.20),y+h+.23,z],.065,'tileedge');ball('tileedge',x+sign*(rh+.22),y+h+.27,z,.075,.11,.075);}activeRoof='';
}
function timberFrame(x,z,span,height,angle=0){const at=u=>[x+Math.cos(angle)*u,z+Math.sin(angle)*u];box('wood',x,height,z,span+.32,.18,.17,-angle);box('wooddark',x,height-.115,z,span-.12,.045,.15,-angle);
 for(const sign of [-1,1]){const p=at(sign*span/2),end=at(sign*(span/2+.19));box('woodlight',p[0],height+.11,p[1],.28,.10,.27,-angle);box('wood',p[0],height+.21,p[1],.42,.10,.18,-angle);box('endgrain',end[0],height+.005,end[1],.10,.105,.105,-angle);
  // Exposed square tenon, joint shoulder and a small transverse locking peg.
  const peg=at(sign*(span/2-.055));instance('cyl','wooddark',peg[0]-.10*Math.sin(angle),height,peg[1]+.10*Math.cos(angle),.019,.06,.019,[Math.PI/2,0,-angle]);
  const inner=at(sign*(span/2-.40));beam([p[0],height-.43,p[1]],[inner[0],height-.13,inner[1]],.045,'woodlight');
 }architectureStats.timberFrames++;
}
function doubleDoorHall(){const x=2.4,z=-7.35,w=8.2,d=3.0,y=.75;box('darkstone',x,y-.04,z,w+.6,.26,d+.8);box('lightstone',x,y+.12,z,w+.75,.09,d+1);box('wall',x,y+1.45,z-.22,w,2.6,d-.5);
 const columns=[-3.78,-2.42,-1.13,1.13,2.42,3.78];for(const dx of columns){instance('cyl','wood',x+dx,y+1.45,z+1.72,.08,2.65,.08);instance('cyl','lightstone',x+dx,y+.25,z+1.72,.13,.28,.13);timberFrame(x+dx,z+.85,1.74,y+2.48,Math.PI/2);}
 for(let i=0;i<columns.length-1;i++)timberFrame(x+(columns[i]+columns[i+1])/2,z+1.72,columns[i+1]-columns[i],y+2.59,0);
 // Four smaller windows flank a single pair of doors; no row of door-like panels.
 for(const dx of [-3.13,-1.83,1.83,3.13]){box('wooddark',x+dx,y+1.62,z+1.045,.90,1.14,.055);lattice(x+dx,z+1.085,y+1.62,.80,1.02);box('woodlight',x+dx,y+1.02,z+1.10,1.04,.07,.16);}
 const front=z+1.09,bottom=y+.18,height=2.13,doorWidth=1.88;
 for(const sign of [-1,1]){const cx=x+sign*(doorWidth/4+.008);box('wood',cx,bottom+height/2,front,doorWidth/2-.026,height,.09);for(const dx of [-.435,.435])box('wooddark',cx+dx,bottom+height/2,front+.055,.055,height,.055);
  for(const yy of [.08,.65,1.38,2.06])box('wooddark',cx,bottom+yy,front+.06,.88,.065,.055);
  for(const [yy,hh]of [[.36,.45],[1.01,.61],[1.72,.57]]){box('woodlight',cx,bottom+yy,front+.048,.71,hh,.018);box('wood',cx,bottom+yy,front+.061,.62,hh-.10,.018);}
  for(let j=0;j<6;j++)box('wooddark',cx-.32+j*.128,bottom+1.72,front+.08,.009,.50,.009);
  const hx=x+sign*.13;instance('cyl','gold',hx,bottom+1.0,front+.13,.055,.025,.055,[Math.PI/2,0,0]);const ring=mesh(new T.TorusGeometry(.052,.008,6,20),'gold',[hx,bottom+.955,front+.16]);ring.rotation.x=.12;
  for(const hy of [.30,1.75])box('wooddark',x+sign*.97,bottom+hy,front+.07,.09,.13,.06);architectureStats.doorLeaves++;
 }
 for(const sign of [-1,1])box('wooddark',x+sign*1.02,bottom+height/2,front,.11,height+.12,.20);box('wooddark',x,bottom+height+.04,front,2.15,.13,.20);box('darkstone',x,bottom-.025,front+.03,2.15,.10,.25);
 roof(x,z,y+2.85,w+1.15,d+1.6,1.55);plaque(x,y+2.43,z+1.84,'半 日 清 閒',2.1);
 for(let i=0;i<3;i++)box('darkstone',x,.73-i*.13,z+2.0+i*.27,2.1+i*.2,.15,.36);
 for(const sign of [-1,1]){box('wooddark',x+sign*(w/2+.02),y+1.5,z,.08,1.45,1.7);lattice(x+sign*(w/2+.07),z,y+1.5,1.5,1.3,Math.PI/2);}
}
