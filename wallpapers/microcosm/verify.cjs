'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=path.join(__dirname,'wallpaper.html'),output=path.resolve(__dirname,'../../temp/microcosm-check');
async function browser(){
 const {app,BrowserWindow}=require('electron');
 app.commandLine.appendSwitch('force-device-scale-factor','1');
 await app.whenReady();fs.mkdirSync(output,{recursive:true});
 const win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[],requests=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 win.webContents.on('render-process-gone',(_,d)=>errors.push(JSON.stringify(d)));
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>{if(/^https?:/.test(d.url))requests.push(d.url);cb({cancel:/^https?:/.test(d.url)});});
 const js=s=>win.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const snapshot=()=>js('microcosm.snapshot()');
 const capture=async name=>{await wait(150);const img=await win.webContents.capturePage();fs.writeFileSync(path.join(output,name+'.png'),img.toPNG());return img;};
 try{
  for(const [name,w,h] of [['landscape',1600,1000],['portrait',390,844],['ultrawide',3440,1440],['4k',3840,2160]]){
   win.setContentSize(w,h);await win.loadFile(html,{query:{still:'1',hud:'0',test:'1'}});await wait(150);
   assert.ok(await js('!!window.microcosm'),'Scene did not initialize');
   const image=await capture(name),data=image.toBitmap();let min=255,max=0;for(let i=0;i<data.length;i+=400){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}assert.ok(max-min>45,'Blank scene');
   if(name==='landscape'&&process.argv.includes('--write-preview'))fs.writeFileSync(path.join(__dirname,'preview.png'),image.toPNG());
   const s=await snapshot();assert.equal(s.cells.length,106);assert.ok(Math.round(w*s.dpr)*Math.round(h*s.dpr)<=2404000);
   console.log('PASS render',name);
  }
  win.setContentSize(1600,1000);await win.loadFile(html,{query:{still:'1',hud:'0',test:'1'}});
  const initial=await snapshot();let maxCount=0;
  for(let i=0;i<20;i++){
   await js('microcosm.step(1/30,900)');const s=await snapshot();maxCount=Math.max(maxCount,s.cells.length);
   assert.ok(s.cells.length<=150&&s.remains<100,'Unbounded population or remains');
   for(const c of s.cells){assert.ok([c.x,c.y,c.vx,c.vy,c.r,c.age,c.energy].every(Number.isFinite));assert.ok(Math.hypot(c.x/780,c.y/470)<1.08,'Cell outside water');assert.ok(c.foods<=7);}
   for(let kind=0;kind<3;kind++)assert.ok(s.cells.some(c=>c.kind===kind),'Species extinct');
  }
  const later=await snapshot();assert.notDeepEqual(later.cells,initial.cells);
  for(const event of ['eaten','deaths','divisions','decomposed'])assert.ok(later.stats[event]>0,`Missing lifecycle event: ${event}`);
  await capture('after-ten-minutes');console.log('PASS 10 simulated minutes',JSON.stringify({maxCount,...later.stats}));
  // A controlled encounter must consume prey and keep a visible food vacuole.
  await js("microcosm.setCells([{kind:1,x:0,y:0,a:0,energy:.5,age:0,meal:0},{kind:0,x:10,y:0,age:0}]);microcosm.step(1/60)");
  const hunt=await snapshot();assert.equal(hunt.cells.length,1);assert.equal(hunt.cells[0].foods,1);
  const consumedId=hunt.cells[0].foodIds[0];
  await js('microcosm.step(1/30,360)');assert.ok((await snapshot()).cells.every(c=>!c.foodIds.includes(consumedId)),'Digestion did not finish');
  await win.loadFile(html,{query:{still:'1',test:'1'}});
  await js("document.getElementById('pause').click()");const start=await snapshot();await wait(1200);const live=await snapshot();assert.ok(live.time>start.time+.3&&live.frameCount>start.frameCount);
  console.log('PASS actual animation',JSON.stringify({seconds:live.time-start.time,frames:live.frameCount-start.frameCount}));
  await js("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));");const hidden=await snapshot();await wait(200);assert.equal((await snapshot()).frameCount,hidden.frameCount);
  await js("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));");await wait(200);assert.ok((await snapshot()).frameCount>hidden.frameCount);
  await js("document.getElementById('pause').click()");const stop=await snapshot();await wait(200);assert.equal((await snapshot()).time,stop.time);
  win.setContentSize(800,600);await wait(200);assert.ok((await snapshot()).frameCount>stop.frameCount);
  await js("document.getElementById('settings').click();for(const [id,v] of [['focus',.85],['light',1.2],['speed',1.5]]){document.getElementById(id).value=v;document.getElementById(id).dispatchEvent(new Event('input'));}");
  const settings=await snapshot();assert.equal(settings.focus,.85);assert.equal(settings.light,1.2);assert.equal(settings.speed,1.5);await capture('settings');
  await js("dispatchEvent(new KeyboardEvent('keydown',{key:'h'}))");assert.ok(await js("document.body.classList.contains('hud-off')"));
  win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await win.loadFile(html,{query:{test:'1'}});assert.equal((await snapshot()).paused,true);const reduced=await snapshot();await wait(200);assert.equal((await snapshot()).frameCount,reduced.frameCount);
  await win.loadFile(html,{query:{test:'1',still:'0'}});assert.equal((await snapshot()).paused,false);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const library=require('../../src/main/library').scanWallpapers(path.resolve(__dirname,'..'));assert.ok(library.wallpapers.some(w=>w.id==='microcosm'));assert.deepEqual(library.problems.filter(w=>w.id==='microcosm'),[]);
  console.log('PASS predation/digestion, pause, hidden-page scheduling, resize, controls, reduced motion, offline loading and library integration');console.log('Screenshots:',output);
 }finally{if(errors.length)console.error(errors);win.destroy();app.quit();}
}
if(process.versions.electron)browser().catch(e=>{console.error(e);require('electron').app.exit(1);});
else{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename,...process.argv.slice(2)],{env,stdio:'inherit',windowsHide:true,timeout:180000});if(r.error)throw r.error;process.exitCode=r.status??1;}
