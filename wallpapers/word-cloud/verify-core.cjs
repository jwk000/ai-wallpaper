'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { Tracker, inserted, tokenize } = require('./collector/core.cjs');
const { createCollector } = require('./collector/server.cjs');
async function main() {
  assert.equal(inserted('星光照亮天空','星光轻轻照亮天空'),'轻轻');
  assert.equal(inserted('星光星光','星光'),'');
  assert.deepEqual(tokenize('星光，星光！ hello HELLO 的 123'),['星光','星光','hello','hello']);
  const result=[], tracker=new Tracker(text=>result.push(text));
  const sample=(id,text,time)=>tracker.sample({id,text,supported:true},time);
  sample('a','已有文字',0); sample('a','已有文字星光',100);sample('a','已有文字星光',999);
  assert.equal(result.length,0);sample('a','已有文字星光',1000);sample('a','已有文字星光',2000);
  assert.deepEqual(result,['星光']);sample('a','已有文字',2100);sample('a','已有文字',3100);assert.equal(result.length,1);
  sample('b','旧文档',3200);sample('b','旧文档',4200);assert.equal(result.length,1);
  sample('b','旧文档xing',4300);sample('b','旧文档星光',4500);sample('b','旧文档星光',5500);assert.deepEqual(result,['星光','星光']);
  tracker.sample({supported:false},5600);sample('b','秘密',5700);sample('b','秘密',6800);assert.equal(result.length,2);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lumen-wordcloud-test-')), input=new PassThrough();
  const collector=createCollector({dataDir:dir,input,port:0});await collector.listen();
  const url='http://127.0.0.1:'+collector.server.address().port;
  const auth={Authorization:'Bearer '+collector.token};
  let second;
  try {
    assert.equal((await fetch(url+'/api/snapshot')).status,401);
    assert.equal((await fetch(url+'/api/snapshot',{headers:{...auth,Origin:'https://example.com'}})).status,403);
    assert.equal((await fetch(url+'/api/snapshot',{method:'OPTIONS',headers:{Origin:'null','Access-Control-Request-Headers':'authorization'}})).status,204);
    function push(text){input.write(JSON.stringify({supported:true,id:'test',text})+'\n');}
    async function settle(){await new Promise(r=>setTimeout(r,950));}
    push('原文');push('原文星光 星光 hello');await settle();push('原文星光 星光 hello');
    let snap=await (await fetch(url+'/api/snapshot',{headers:auth})).json();assert.deepEqual(snap.words,[['星光',2],['hello',1]]);
    await fetch(url+'/api/pause',{method:'POST',headers:auth});push('暂停期间');await settle();push('暂停期间');
    snap=await (await fetch(url+'/api/snapshot',{headers:auth})).json();assert.equal(snap.paused,true);assert.equal(snap.words.length,2);
    await fetch(url+'/api/resume',{method:'POST',headers:auth});push('恢复基线');push('恢复基线银河');await settle();push('恢复基线银河');
    await collector.close();assert.deepEqual(new Map(JSON.parse(fs.readFileSync(path.join(dir,'frequencies.json')))).get('银河'),1);
    second=createCollector({dataDir:dir,input:new PassThrough(),port:0,token:collector.token});await second.listen();
    const url2='http://127.0.0.1:'+second.server.address().port;
    snap=await (await fetch(url2+'/api/snapshot',{headers:auth})).json();assert.equal(new Map(snap.words).get('星光'),2);
    await fetch(url2+'/api/clear',{method:'POST',headers:auth});snap=await (await fetch(url2+'/api/snapshot',{headers:auth})).json();assert.deepEqual(snap.words,[]);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'frequencies.json'))),[]);
    console.log('PASS segmentation, IME-like transient text, focus baseline, deduplication, deletion, loopback API auth/CORS, pause/resume, persistence and clear');
  } finally { if(collector.server.listening)await collector.close();if(second?.server.listening)await second.close();fs.rmSync(dir,{recursive:true,force:true}); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
