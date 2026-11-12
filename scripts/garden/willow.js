// Drooping twigs and their leaves share a bend field; attachment points remain fixed.
const willowStem=mat('#6f7750'),willowLeaf=mat('#8c9b56',{side:T.DoubleSide,roughness:.98});
for(const m of [willowStem,willowLeaf]){m.customProgramCacheKey=()=> 'willow-strand-bend-v1';m.onBeforeCompile=shader=>{shader.uniforms.willowTime=uniformTime;shader.uniforms.willowWind=uniformWind;shader.vertexShader='attribute float willowFlex;attribute float willowPhase;uniform float willowTime;uniform float willowWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.x+=sin(willowTime*.82+willowPhase)*.13*willowWind*willowFlex;
 transformed.z+=cos(willowTime*.61+willowPhase*.73)*.095*willowWind*willowFlex;`);};}
const willowBatches={stem:{p:[],n:[],f:[],a:[]},leaf:{p:[],n:[],f:[],a:[]}};
function willowAppend(g,key,phase,flex){const geo=g.index?g.toNonIndexed():g,p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,b=willowBatches[key];for(let i=0;i<p.count;i++){b.p.push(p.getX(i),p.getY(i),p.getZ(i));b.n.push(n.getX(i),n.getY(i),n.getZ(i));const u=typeof flex==='number'?flex:uv.getX(i);b.f.push(u*u);b.a.push(phase);}if(geo!==g)geo.dispose();g.dispose();}
function naturalWillow(x,z){const trunk=twig([[x,.65,z],[x+.13,1.65,z-.12],[x+.28,2.75,z-.08],[x+.40,3.65,z]],.17);
 for(let i=0;i<14;i++){const a=i*2.399,root=trunk.getPoint(rr(.55,.92)),tip=[x+Math.cos(a)*rr(1.0,1.6),rr(3.15,3.8),z+Math.sin(a)*rr(.95,1.4)];twig([root.toArray(),[(root.x+tip[0])*.5,tip[1]+.10,(root.z+tip[2])*.5],tip],.036);
  for(let k=0;k<6;k++){const aa=a+rr(-.30,.3),length=rr(1.5,2.6),p0=[tip[0]+rr(-.18,.18),tip[1],tip[2]+rr(-.18,.18)],p1=[p0[0]+Math.cos(aa)*.30,p0[1]-length*.4,p0[2]+Math.sin(aa)*.3],p2=[p0[0]+Math.cos(aa)*.45,p0[1]-length,p0[2]+Math.sin(aa)*.45],curve=new T.CatmullRomCurve3([p0,p1,p2].map(p=>new T.Vector3(...p))),phase=a+k*.16;
   willowAppend(new T.TubeGeometry(curve,20,.006,4,false),'stem',phase,null);
   for(let j=0;j<40;j++){const u=(j+rr(0,.4))/40,p=curve.getPoint(u),sign=j%2?1:-1;dummy.position.set(p.x+sign*.01,p.y,p.z);dummy.rotation.set(rr(.7,1.1),aa+sign*rr(.5,1.1),sign*.2);dummy.scale.set(.035,.06,rr(.12,.18));dummy.updateMatrix();willowAppend(leafGeo.clone().applyMatrix4(dummy.matrix),'leaf',phase,u);natureStats.leaves++;}natureStats.willowStrands=(natureStats.willowStrands||0)+1;
  }
 }
 for(const [key,m]of [['stem',willowStem],['leaf',willowLeaf]]){const b=willowBatches[key],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('willowFlex',new T.Float32BufferAttribute(b.f,1));g.setAttribute('willowPhase',new T.Float32BufferAttribute(b.a,1));const o=mesh(g,m);g.computeBoundingSphere();g.boundingSphere.radius+=.4;o.castShadow=false;}
}
