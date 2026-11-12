// Sunflowers replace the former gravel ornament; reeds occupy a short stretch of bank.
const plantMaterials={sunStem:'#55724a',sunPetal:'#d5ae38',sunDisk:'#604b2d',sunSeed:'#8e7442',reedStem:'#8b9563',reedPlume:'#b3a88a'};
for(const [key,color]of Object.entries(plantMaterials)){M[key]=mat(color,{side:T.DoubleSide,roughness:1});M[key].onBeforeCompile=shader=>{shader.uniforms.plantTime=uniformTime;shader.uniforms.plantWind=uniformWind;shader.vertexShader='uniform float plantTime;uniform float plantWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 mvPosition=instanceMatrix*mvPosition;
 #endif
 mvPosition=modelMatrix*mvPosition;
 float height=max(0.0,mvPosition.y-.65);
 mvPosition.x+=sin(plantTime*.82+mvPosition.z*.7)*height*height*.025*plantWind;
 mvPosition.z+=cos(plantTime*.63+mvPosition.x*.5)*height*height*.018*plantWind;
 mvPosition=viewMatrix*mvPosition;gl_Position=projectionMatrix*mvPosition;`);};}
function plantSunflowers(){
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){
  const x=5.25+col*.48+rr(-.09,.09),z=-2.35+row*.56+rr(-.10,.10),h=rr(.82,1.42),y=.65+h,r=rr(.09,.115);beam([x,.65,z],[x+.035,y,z],.012,'sunStem');
  for(let j=0;j<4;j++){const a=j*2.4+row,yy=.78+h*j*.18;instance('botleaf','sunStem',x,yy,z,.24,.24,.36,[rr(-.65,-.2),a,0]);}
  instance('cyl','sunDisk',x+.035,y,z,.10,.035,.10,[Math.PI/2,0,0]);
  for(let j=0;j<16;j++){const a=j*TAU/16,radial=new T.Vector3(Math.sin(a),Math.cos(a),0),tangent=new T.Vector3(-Math.cos(a),Math.sin(a),0),normal=new T.Vector3(0,0,1),rot=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(tangent,normal,radial));instance('petal','sunPetal',x+.035+Math.sin(a)*r*.70,y+Math.cos(a)*r*.70,z+.015,.12,.08,rr(.13,.18),rot);}
  for(let j=0;j<22;j++){const a=j*2.399,rad=Math.sqrt(j/22)*.079;instance('pebble','sunSeed',x+.035+Math.cos(a)*rad,y+Math.sin(a)*rad,z+.023,.010,.010,.006);}
 }natureStats.sunflowers=36;
}
const plumeVertices=[];for(let i=0;i<96;i++){const u=i/96,a=i*2.399,y=-.14+u*.32,r=.064*Math.sin(Math.PI*u)**.7,tx=Math.cos(a),tz=Math.sin(a);plumeVertices.push(0,y,0,tx*r-tz*.003,y+.065,tz*r+tx*.003,tx*r+tz*.003,y+.068,tz*r-tx*.003);}geo.reedplume=new T.BufferGeometry();geo.reedplume.setAttribute('position',new T.Float32BufferAttribute(plumeVertices,3));geo.reedplume.computeVertexNormals();
function plantReeds(){for(let i=0;i<42;i++){const x=-2.85+rr(0,2.5),z=-3.65+rr(-.08,.12),h=rr(.70,1.45),bend=rr(-.09,.09);beam([x,.28,z],[x+bend,.49+h,z+.035],.007,'reedStem');for(let j=0;j<3;j++)instance('botleaf','reedStem',x,.58+h*j*.2,z,.034,.10,rr(.42,.69),[rr(-1.15,-.55),j*2.5+i,0]);
 const tip=.49+h;instance('reedplume','reedPlume',x+bend,tip,z+.035,1,rr(.8,1.2),1,[.12,i*.7,.12]);natureStats.reeds=(natureStats.reeds||0)+1;}}
