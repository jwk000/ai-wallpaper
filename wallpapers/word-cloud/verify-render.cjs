'use strict';
const { app, BrowserWindow }=require('electron');
const assert=require('node:assert/strict'), path=require('node:path'), fs=require('node:fs'), os=require('node:os');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'wordcloud-render-'));
app.setPath('userData',profile);app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),errors=[];
  win.webContents.on('console-message',event=>{if(String(event.message).includes('Uncaught'))errors.push(event.message);});
  const run=code=>win.webContents.executeJavaScript(code);
  let collector;
  try{
    await win.loadFile(path.join(__dirname,'wallpaper.html'));
    for(const [w,h] of [[1600,1000],[390,844],[3440,1440]]){
      win.webContents.enableDeviceEmulation({screenPosition:'desktop',screenSize:{width:w,height:h},deviceScaleFactor:1,viewPosition:{x:0,y:0},viewSize:{width:w,height:h},scale:1});await new Promise(r=>setTimeout(r,200));
      const result=await run(`(()=>{dispatchEvent(new Event('resize'));__WORDCLOUD__.setTime(12);const a=__WORDCLOUD__.read();__WORDCLOUD__.setTime(42);const b=__WORDCLOUD__.read();return {a,b,width:innerWidth,height:innerHeight};})()`);
      assert.equal(result.width,w);assert.equal(result.height,h);assert.ok(result.a.nodes.length>80);
      assert.ok(result.a.nodes.every(n=>Number.isFinite(n.sx)&&Number.isFinite(n.sy)&&n.sx>=0&&n.sx<=w&&n.sy>=0&&n.sy<=h));
      assert.notEqual(result.a.nodes[0].sx,result.b.nodes[0].sx);
      const sorted=result.a.nodes.slice().sort((a,b)=>b.count-a.count);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i-1].size>=sorted[i].size);
      if(w===1600){await run('__WORDCLOUD__.setTime(12)');fs.writeFileSync(path.join(__dirname,'preview.png'),(await win.webContents.capturePage()).toPNG());}
      console.log(`PASS render ${w}x${h}, finite in-frame positions, rotation, frequency sizes`);
    }
    await run(`(()=>{const e=document.getElementById('editor');e.dispatchEvent(new CompositionEvent('compositionstart'));e.value='星光';e.dispatchEvent(new InputEvent('input',{data:'xing',isComposing:true}));})()`);
    assert.equal((await run('__WORDCLOUD__.read()')).mode,'demo');
    await run(`(()=>{const e=document.getElementById('editor');e.dispatchEvent(new CompositionEvent('compositionend',{data:'星光'}));e.dispatchEvent(new InputEvent('input',{data:'星光',inputType:'insertText'}));})()`);
    await new Promise(r=>setTimeout(r,750));assert.deepEqual((await run('__WORDCLOUD__.read()')).counts,[['星光',1]]);
    await run(`(()=>{const e=document.getElementById('editor');e.value='星光 星光 HELLO hello';e.dispatchEvent(new InputEvent('input',{inputType:'insertFromPaste'}));})()`);
    await new Promise(r=>setTimeout(r,750));assert.deepEqual((await run('__WORDCLOUD__.read()')).counts,[['星光',2],['hello',2]]);
    await run(`document.getElementById('pause').click()`);const t=(await run('__WORDCLOUD__.read()')).time;await new Promise(r=>setTimeout(r,150));assert.equal((await run('__WORDCLOUD__.read()')).time,t);
    await win.loadFile(path.join(__dirname,'wallpaper.html'));assert.deepEqual((await run('__WORDCLOUD__.read()')).counts,[['星光',2],['hello',2]]);
    const {PassThrough}=require('node:stream'),{createCollector}=require('./collector/server.cjs');
    const input=new PassThrough();collector=createCollector({dataDir:path.join(profile,'collector'),input});await collector.listen();
    const push=text=>input.write(JSON.stringify({id:'fixture',supported:true,text})+'\n');
    push('');push('星光 星光 银河');await new Promise(r=>setTimeout(r,950));push('星光 星光 银河');
    await run(`document.getElementById('token').value=${JSON.stringify(collector.token)};document.getElementById('connect').click()`);
    await new Promise(r=>setTimeout(r,500));let state=await run('__WORDCLOUD__.read()');assert.equal(state.connected,true);assert.deepEqual(state.counts,[['星光',2],['银河',1]]);
    await run(`document.getElementById('capturePause').click()`);await new Promise(r=>setTimeout(r,200));assert.equal(await run(`document.getElementById('source').textContent`),'系统采集已暂停');
    await run(`document.getElementById('disconnect').click()`);assert.deepEqual((await run('__WORDCLOUD__.read()')).counts,[['星光',2],['hello',2]]);
    await collector.close();collector=null;console.log('PASS live file-page bridge, source isolation, capture pause, disconnect restoration');
    assert.deepEqual(errors,[]);console.log('PASS IME commit exactly once, paste, local persistence, pause, no script errors');
    const {scanWallpapers}=require('../../src/main/library.js'),scan=scanWallpapers(path.join(__dirname,'..'));
    assert.ok(scan.wallpapers.find(w=>w.id==='word-cloud'));assert.equal(scan.problems.filter(p=>p.id==='word-cloud').length,0);console.log('PASS library discovery and preview');
    win.destroy();app.exit(0);
  }catch(e){console.error(e);if(collector)await collector.close();win.destroy();app.exit(1);}
});
