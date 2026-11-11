'use strict';
// Run the actual animation state in deterministic time; drawing is a no-op here.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'wallpaper.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function load(width,height){
  const gradient={addColorStop(){}},ctx=new Proxy({measureText:s=>({width:[...s].reduce((n,c)=>n+(c.charCodeAt(0)>255?100:55),0)})},{get:(o,k)=>k in o?o[k]:k==='createRadialGradient'?()=>gradient:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',style:{},classList:{toggle(){}},getContext:()=>ctx,addEventListener(){},closest(){return null;}});return elements.get(id);};
  const sandbox={Intl,URLSearchParams,AbortSignal,performance,console,innerWidth:width,innerHeight:height,devicePixelRatio:1,matchMedia:()=>({matches:false}),document:{getElementById:element,addEventListener(){},body:element('body')},localStorage:{getItem(){return null;},setItem(){}},location:{hash:''},addEventListener(){},requestAnimationFrame(){},setInterval(){},setTimeout(){},clearTimeout(){}};
  sandbox.window=sandbox;vm.runInNewContext(source,sandbox);return {api:sandbox.__WORDCLOUD__,elements};
}
for(const [width,height] of [[1600,1000],[390,844],[3440,1440]]){
  const {api,elements}=load(width,height);let prev=api.read().nodes,velocity=new Map(),maxStep=0,maxAcceleration=0;
  // Sample turns where words cross and the old rectangle solver changed axes.
  for(let frame=0;frame<1800;frame++){
    api.step(1/60);const next=api.read().nodes;
    for(let i=0;i<next.length;i++){
      const n=next[i],p=prev[i],dx=n.sx-p.sx,dy=n.sy-p.sy,v=velocity.get(n.word);
      maxStep=Math.max(maxStep,Math.hypot(dx,dy));
      if(v)maxAcceleration=Math.max(maxAcceleration,Math.hypot(dx-v[0],dy-v[1]));
      velocity.set(n.word,[dx,dy]);assert.ok(Number.isFinite(n.sx+n.sy+n.size));
    }prev=next;
  }
  assert.ok(maxStep<5,`Position jumped ${maxStep}px at ${width}x${height}`);
  assert.ok(maxAcceleration<.8,`Velocity jumped ${maxAcceleration}px/frame at ${width}x${height}`);
  // Raising the display limit must not move any existing word immediately.
  const before=new Map(api.read().nodes.map(n=>[n.word,n]));elements.get('limit').oninput({target:{value:'200'}});
  for(const n of api.read().nodes){const old=before.get(n.word);if(old){assert.equal(n.sx,old.sx);assert.equal(n.sy,old.sy);}}
  console.log(`PASS ${width}x${height}: 1800 frames, max displacement ${maxStep.toFixed(3)}px, max velocity change ${maxAcceleration.toFixed(3)}px/frame`);
}
const {api}=load(1600,1000);api.addText('星光 星光 银河');for(let i=0;i<150;i++)api.step(1/60);
const before=new Map(api.read().nodes.map(n=>[n.word,n]));api.addText('银河 银河 银河 森林');
for(const word of ['星光','银河']){const a=before.get(word),b=api.read().nodes.find(n=>n.word===word);assert.equal(a.sx,b.sx);assert.equal(a.sy,b.sy);assert.equal(a.size,b.size);assert.deepEqual([a.x,a.y,a.z],[b.x,b.y,b.z]);}
assert.equal(api.read().nodes.find(n=>n.word==='森林').alpha,0);
for(let i=0;i<180;i++)api.step(1/60);
const state=api.read();assert.ok(state.nodes.find(n=>n.word==='银河').size>state.nodes.find(n=>n.word==='星光').size);assert.ok(state.nodes.find(n=>n.word==='森林').alpha>.99);
console.log('PASS new words fade in, frequency ranking changes preserve orbits and interpolate size');
