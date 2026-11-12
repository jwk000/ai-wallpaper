'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const html=path.join(__dirname,'../wallpapers/listening-garden/wallpaper.html'),out=path.join(os.tmpdir(),'lumen-garden-check');
async function run(){
 const {app,BrowserWindow}=require('electron');app.commandLine.appendSwitch('force-device-scale-factor','1');await app.whenReady();
 const win=new BrowserWindow({width:1600,height:900,useContentSize:true,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const errors=[],requests=[];win.webContents.on('console-message',e=>{if(e.level==='error'){errors.push(e.message);console.error('Renderer:',e.message);}});win.webContents.on('render-process-gone',(_,e)=>errors.push(e.reason));
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>{if(/^https?:/.test(d.url))requests.push(d.url);cb({cancel:/^https?:/.test(d.url)});});
 const js=c=>win.webContents.executeJavaScript(c),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const hash=()=>js("document.getElementById('view').toDataURL()");fs.mkdirSync(out,{recursive:true});
 try{
 for(const [name,w,h,weather] of [['landscape',1600,900,'clear'],['ultrawide',2560,1080,'clear'],['portrait',390,844,'mist'],['rain',1600,900,'rain'],['4k',3840,2160,'clear']]){
 win.setContentSize(w,h);await win.loadFile(html,{query:{still:'1',hud:'0',weather}});await wait(200);
 const state=await js('gardenState()');assert.ok(state.paused);assert.equal(state.engine,'three-webgl');assert.equal(state.contextLost,false);assert.equal(state.koi,9);assert.ok(state.triangles>10000&&state.triangles<2600000);assert.ok(state.drawCalls<650,`Draw calls: ${state.drawCalls}`);assert.ok(state.width*state.height<2810000);const capture=await win.webContents.capturePage();assert.ok(capture.toPNG().length>20000);fs.writeFileSync(path.join(out,name+'.png'),capture.toPNG());
 if(name==='landscape')console.log('Scene budget',state.drawCalls,'draws',state.triangles,'triangles; nature:',state.nature);
 if(name==='landscape'&&process.argv.includes('--write-preview'))fs.writeFileSync(path.join(path.dirname(html),'preview.png'),capture.toPNG());console.log('PASS render',name,w,h);
 }
 win.setContentSize(1600,900);
 for(const view of ['architecture','trees','rock','fishing','chess','lotus','water','courtyard','cat','residents','sunflowers','nest']){
  await win.loadFile(html,{query:{still:'1',hud:'0',view,t:view==='fishing'?'24':view==='nest'?'5':'18',test:'1'}});await wait(120);const s=await js('gardenState()');assert.equal(s.view,view);assert.equal(s.pavilionRoof,view!=='chess');
  if(view==='fishing'){assert.ok(s.life.smokingLift>.99);assert.ok(s.life.smokeVisible>0);assert.equal(s.life.lanterns,7);}
  if(view==='water'){assert.equal(s.water.enabled,true);assert.ok(s.water.reflectionFrames>0);assert.ok(Math.abs(s.water.reflectionCamera[1]+s.camera[1]-s.water.surfaceY*2)<1e-7);assert.ok(Math.max(s.water.targetWidth,s.water.targetHeight)<=1024);const px=await js('gardenReflectionPixels()');assert.ok(px.max-px.min>.3,'Reflection must contain real scene contrast');assert.ok(s.water.koiPositions.every(p=>p[1]+.059<s.water.surfaceY));}
  fs.writeFileSync(path.join(out,view+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 console.log('PASS twelve detail cameras, smoking, lanterns, mirrored camera, reflection readback and submerged koi');
 await win.loadFile(html,{query:{still:'1',hud:'0',view:'courtyard',test:'1'}});
 const pose=t=>js(`gardenTestTime(${t})`),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 const sniffA=await pose(7),sniffB=await pose(8);assert.equal(sniffA.dogBehavior,'sniff');assert.equal(sniffA.dogVelocity,0);assert.deepEqual(sniffA.dog,sniffB.dog);assert.ok(sniffA.dogHeadPitch>1);assert.notEqual(sniffA.dogHeadYaw,sniffB.dogHeadYaw);
 await js("gardenTestAnimalView('dog')");await wait(150);
 fs.writeFileSync(path.join(out,'dog-sniff.png'),(await win.webContents.capturePage()).toPNG());
 const lookA=await pose(10.5),lookB=await pose(11.5);assert.equal(lookA.dogBehavior,'look');assert.deepEqual(lookA.dog,lookB.dog);assert.ok(Math.abs(lookA.dogHeadYaw-lookB.dogHeadYaw)>.1);
 const runA=await pose(18),runB=await pose(18.3);assert.equal(runA.dogBehavior,'run');assert.ok(distance(runA.dog,runB.dog)>.20);assert.equal(runA.dogScale,.65);assert.equal(runA.catScale,.68);await js("gardenTestAnimalView('dog')");fs.writeFileSync(path.join(out,'dog-close.png'),(await win.webContents.capturePage()).toPNG());
 for(const t of [5,9.6,13,19.8,22.6,28.2,33.4]){const a=await pose(t-.001),b=await pose(t+.001);assert.ok(distance(a.dog,b.dog)<.004,'Dog path must be continuous');assert.ok(Math.abs(a.dogVelocity-b.dogVelocity)<.005,'Dog speed must be continuous');assert.ok(Math.abs(a.dogHeadPitch-b.dogHeadPitch)<.01,'Head must ease into its pose');}
 const quiet=await pose(18),ear=await pose(15.3),tail=await pose(22);assert.equal(quiet.catEarMotion,0);assert.equal(quiet.catTailMotion,0);assert.ok(ear.catEarMotion>.9);assert.ok(tail.catTailMotion>.8);assert.deepEqual(quiet.cat,ear.cat);assert.deepEqual(quiet.cat,tail.cat);
 await js("gardenTestAnimalView('cat')");await wait(150);fs.writeFileSync(path.join(out,'cat-close.png'),(await win.webContents.capturePage()).toPNG());
 console.log('PASS smaller animals, sniff/look pauses, varying run speed, continuous transitions and occasional cat twitches');
 const people=quiet.residents;assert.equal(people.adults,4);assert.equal(people.children,2);assert.equal(people.male,3);assert.equal(people.female,3);assert.equal(people.adultPairs,2);
 const admireA=await pose(11),admireB=await pose(12),talkA=await pose(17),talkB=await pose(18);assert.equal(admireA.residents.profiles[0].behavior,'admire');assert.deepEqual(admireA.walkers[0],admireB.walkers[0]);assert.equal(talkA.residents.profiles[0].behavior,'talk');assert.deepEqual(talkA.walkers[0],talkB.walkers[0]);assert.ok(Math.abs(talkA.residents.profiles[0].headYaw)>.3);
 for(let i=0;i<6;i+=2){const d=distance(talkA.walkers[i],talkA.walkers[i+1]);assert.ok(d>.3&&d<.8,'Companions stay side by side');}
 for(const t of [10,15,21,30,32]){const before=await pose(t-.001),after=await pose(t+.001);assert.ok(distance(before.walkers[0],after.walkers[0])<.003);assert.ok(Math.abs(before.residents.profiles[0].velocity-after.residents.profiles[0].velocity)<.002);}
 const nested=await pose(5),flying=await pose(18),returned=await pose(40);assert.equal(nested.birds.perched,4);assert.equal(nested.birds.nests,1);assert.equal(nested.birds.swallowFlying,false);assert.equal(flying.birds.swallowFlying,true);assert.equal(returned.birds.swallowFlying,false);assert.deepEqual(nested.birds.swallow,returned.birds.swallow);assert.ok(distance(nested.birds.swallow,flying.birds.swallow)>2);assert.equal(flying.birds.butterflyScale,.65);assert.notDeepEqual(nested.birds.willowTipOffset,flying.birds.willowTipOffset);
 const newNature=await js('gardenState().nature');assert.equal(newNature.rocks,7);assert.equal(newNature.sunflowers,36);assert.equal(newNature.reeds,42);assert.equal(newNature.willowStrands,84);
 const corner=await pose(.5);assert.ok(corner.residents.profiles[0].scale-corner.residents.profiles[1].scale>.15);assert.ok(Math.abs(corner.residents.profiles[0].heading-corner.residents.profiles[1].heading)>.04,'Partners turn at different points');
 for(const t of [0,8,18,39,75,130,210]){await pose(t);const fish=await js('gardenState().water');for(let i=0;i<9;i++)for(let j=i+1;j<9;j++)assert.ok(distance(fish.koiPositions[i],fish.koiPositions[j])>.49,'Koi maintain clearance');assert.ok(new Set(fish.koiHeadings.map(a=>Math.round(a*3))).size>4,'Fish follow different headings');const next=await pose(t+.033);const moved=await js('gardenState().water');assert.ok(moved.koiPositions.every((p,i)=>distance(p,fish.koiPositions[i])<.04),'Fish movement is continuous');}
 console.log('PASS resident demographics, companion spacing, observation/conversation stops, willow sway, birds, nest return, sunflowers and reeds');
 win.setContentSize(1600,900);await win.loadFile(html,{query:{still:'0',hud:'0'}});await wait(300);const a=await js('gardenState()');const pic=await hash();await wait(650);const b=await js('gardenState()');assert.ok(b.time>a.time);assert.notEqual(await hash(),pic);console.log('PASS animation',b.frames-a.frames,'frames / 650ms');
 assert.equal(b.life.walkers.length,6);assert.equal(b.life.butterflies.length,4);assert.equal(b.life.dragonflies.length,3);assert.equal(b.life.fishermen,1);assert.equal(b.life.chessPlayers,2);assert.ok(b.life.chessStones>20);assert.ok(b.nature.flowers>200);assert.ok(b.nature.lotusFlowers>=10);
 assert.equal(b.architecture.doorLeaves,2);assert.ok(b.architecture.roofTiles>2000);assert.ok(b.architecture.timberFrames>=20);assert.ok(b.architecture.pavingStones>100);assert.equal(b.architecture.irregularStones,b.architecture.pavingStones);
 for(const species of ['walkers','butterflies','dragonflies','dog','dogLegAngles']){assert.notDeepEqual(a.life[species],b.life[species],species+' must move');assert.ok(b.life[species].flat().every(Number.isFinite));}
 assert.equal(b.life.pairedButterflies,2);const pairDistance=Math.hypot(...b.life.butterflies[0].map((p,i)=>p-b.life.butterflies[1][i]));assert.ok(pairDistance>.2&&pairDistance<.8);assert.notEqual(a.life.catBreathing,b.life.catBreathing);assert.deepEqual(a.life.cat,b.life.cat);assert.ok(b.water.reflectionFrames>a.water.reflectionFrames);
 await js("document.getElementById('pause').click()");const stop=await hash(),stoppedLife=await js('gardenState().life');await wait(180);assert.equal(await hash(),stop);assert.deepEqual(await js('gardenState().life'),stoppedLife);assert.equal(await js('gardenState().scheduled'),false);
 win.setContentSize(1000,700);await wait(150);assert.notEqual(await hash(),stop);assert.equal(await js('gardenState().paused'),true);
 await js("document.getElementById('settings').click()");assert.equal(await js("document.getElementById('panel').hidden"),false);
 for(const weather of ['mist','rain','clear']){await js(`{const el=document.getElementById('weather');el.value='${weather}';el.dispatchEvent(new Event('change'));}`);assert.equal(await js('gardenState().weather'),weather);}
 const viewStart=await js('gardenState()');const beforeDrag=await hash();
 win.webContents.sendInputEvent({type:'mouseDown',x:490,y:340,button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseMove',x:630,y:380,movementX:140,movementY:40});win.webContents.sendInputEvent({type:'mouseUp',x:630,y:380,button:'left',clickCount:1});await wait(150);
 const viewRotated=await js('gardenState()');assert.ok(Math.abs(viewRotated.yaw-viewStart.yaw)>.3);assert.notEqual(await hash(),beforeDrag);
 await js("document.getElementById('view').dispatchEvent(new WheelEvent('wheel',{deltaY:-180,cancelable:true}))");assert.ok((await js('gardenState()')).zoom>viewStart.zoom);
 fs.writeFileSync(path.join(out,'rotated.png'),(await win.webContents.capturePage()).toPNG());
 await js("document.getElementById('reset').click()");assert.equal(await js('gardenState().zoom'),1);assert.equal(await js('gardenState().yaw'),-.60);
 await js("document.getElementById('orbit').click()");const orbitStart=await js('gardenState().yaw');
 await js("document.getElementById('pause').click()");await wait(180);assert.equal(await js('gardenState().paused'),false);assert.ok((await js('gardenState().yaw'))>orbitStart);
 win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await win.loadFile(html,{query:{hud:'0'}});assert.equal(await js('gardenState().paused'),true);assert.equal(await js('gardenState().scheduled'),false);
 await win.loadFile(html,{query:{still:'0',t:'86400',wind:'2'}});await wait(180);const late=await js('gardenState()');assert.ok(Number.isFinite(late.time));assert.equal(late.paused,false);for(const species of ['walkers','butterflies','dragonflies'])assert.ok(late.life[species].flat().every(Number.isFinite));
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const lib=require('../src/main/library').scanWallpapers(path.join(__dirname,'../wallpapers'));assert.ok(lib.wallpapers.some(w=>w.id==='listening-garden'));assert.deepEqual(lib.problems.filter(w=>w.id==='listening-garden'),[]);
 console.log('PASS actual 3D geometry, GPU draw budget, pointer orbit, zoom, camera reset, auto orbit, controls, pause/resume, resize, reduced motion and override, large time, offline, library');console.log(out);
 }finally{win.destroy();app.quit();}
}
if(process.versions.electron)run().catch(e=>{console.error(e);require('electron').app.exit(1);});
else{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const result=require('node:child_process').spawnSync(require('electron'),[__filename,...process.argv.slice(2)],{env,stdio:'inherit',windowsHide:true,timeout:90000});if(result.error)throw result.error;process.exitCode=result.status??1;}
