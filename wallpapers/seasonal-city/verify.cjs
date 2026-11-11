'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=__dirname,out=path.join(__dirname,'../../temp/seasonal-city');
async function run(){
 const {app,BrowserWindow}=require('electron');app.commandLine.appendSwitch('force-device-scale-factor','1');
 await app.whenReady();fs.mkdirSync(out,{recursive:true});
 const win=new BrowserWindow({width:1600,height:1000,show:false,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[],requests=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>{if(/^https?:/.test(d.url))requests.push(d.url);cb({cancel:/^https?:/.test(d.url)})});
 const js=s=>win.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 try{
 await win.loadFile(path.join(dir,'wallpaper.html'),{query:{still:'1',orbit:'0'}});await wait(600);
 assert.ok(await js('!!window.__CITY__'),JSON.stringify(errors));
 for(const [name,s,h] of [['spring',0,9],['summer',1,13],['autumn',2,16.5],['winter',3,10],['night',1,22]]){
  await js(`__CITY__.set(${s},${h})`);await wait(100);const img=await win.webContents.capturePage();fs.writeFileSync(path.join(out,name+'.png'),img.toPNG());
  const state=await js('__CITY__.state()');assert.equal(state.season,s);assert.equal(state.hour,h);assert.ok(state.buildings>=25);assert.ok(state.triangles>10000);
  const pixels=img.toBitmap();let min=255,max=0;for(let i=0;i<pixels.length;i+=140){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i])}assert.ok(max-min>50,'blank render');
  if(name==='spring'&&process.argv.includes('--write-preview'))fs.writeFileSync(path.join(dir,'preview.png'),img.toPNG());
  console.log('PASS',name,JSON.stringify(state));
 }
 for(const [name,w,h] of [['portrait',480,900],['ultrawide',2560,1080]]){win.setContentSize(w,h);await wait(150);await js('__CITY__.set(0,9)');await wait(100);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());const s=await js('__CITY__.state()');assert.ok(w*h*s.pixelRatio**2<=2600001);console.log('PASS',name);}
 win.setContentSize(1280,800);await js("document.getElementById('pause').click()");const a=await js('__CITY__.state()');await wait(800);const b=await js('__CITY__.state()');assert.ok(b.time>a.time&&b.frames>a.frames);await js("document.getElementById('pause').click()");const c=await js('__CITY__.state()');await wait(120);assert.equal((await js('__CITY__.state()')).time,c.time);
 await js("document.getElementById('settings').click();document.getElementById('season').value='3';document.getElementById('season').dispatchEvent(new Event('change'));document.getElementById('hour').value='23';document.getElementById('hour').dispatchEvent(new Event('input'))");assert.equal(await js("document.getElementById('panel').hidden"),false);assert.equal((await js('__CITY__.state()')).winter,1);assert.ok((await js('__CITY__.state()')).night>.9);
 await js("document.getElementById('view').dispatchEvent(new WheelEvent('wheel',{deltaY:-100,cancelable:true}))");assert.ok((await js('__CITY__.state()')).zoom>1);
 // Exercise a full year, including every transition and the wrap back to spring.
 await js("document.getElementById('season').value='auto';document.getElementById('season').dispatchEvent(new Event('change'));document.getElementById('daymode').value='auto';document.getElementById('daymode').dispatchEvent(new Event('change'))");
 for(let i=0;i<32;i++){await js('__CITY__.advance(23)');const s=await js('__CITY__.state()');assert.ok(s.season>=0&&s.season<4);assert.ok(s.hour>=0&&s.hour<24);assert.ok(Number.isFinite(s.triangles));}
 win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await win.loadFile(path.join(dir,'wallpaper.html'));assert.ok((await js('__CITY__.state()')).paused);assert.equal((await js('__CITY__.state()')).scheduled,false);
 const {scanWallpapers}=require('../../src/main/library');const library=scanWallpapers(path.join(dir,'..'));assert.ok(library.wallpapers.find(w=>w.id==='seasonal-city'));assert.deepEqual(library.problems.filter(w=>w.id==='seasonal-city'),[]);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS animation, pause, controls, zoom, full annual cycle, reduced motion, offline and library integration. Screenshots:',out);
 }finally{win.destroy();app.quit();}
}
if(process.versions.electron)run().catch(e=>{console.error(e);require('electron').app.exit(1)});
else{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename,...process.argv.slice(2)],{stdio:'inherit',env,windowsHide:true,timeout:120000});if(r.error)throw r.error;process.exitCode=r.status??1;}
