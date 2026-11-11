'use strict';
// Authoring sources live beside this file. Outputs are standalone, offline HTML.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const works = [
  ['gravity-specimen', '引力标本馆', 'A Cabinet of Gravity', '#d7b77d', '深空', '玻璃容器中的万点星尘，沿多重引力轨道编织光丝；指针轻轻倾斜星系，潮汐偶尔将它舒展开。', '潮汐展开'],
  ['breathing-shanshui', '山河呼吸', 'The Breathing Landscape', '#9b5448', '自然', '宣纸上的群山缓慢呼吸，河流悄悄改道，薄雾穿过松林；偶有墨点聚成飞鸟，掠过远山。', '雁过远山'],
  ['woven-ocean', '无人编织的海', 'An Ocean of One Thread', '#8ac7d9', '自然', '一根连续银线折返成整片深海，波浪与涡流在丝线中传播；巨鲸经过时，只留下水线被推开的体积。', '巨鲸经过'],
  ['time-resin', '时间的树脂', 'Amber, Keeping Time', '#d9a553', '抽象', '气泡、植物残片和晶体悬浮在琥珀中，每一分钟活跃运行都会沉积一层日夜色泽，留存在本机。', '晶体闪光'],
  ['waking-reflection', '雨城的倒影先醒了', 'The Reflection Wakes First', '#8da6d0', '城市', '雨夜的窗灯与电车在倒影中提前出现，水中的楼宇渐渐长成树；雨圈偶尔让两个世界重新对齐。', '两个世界对齐'],
  ['forgetting-garden', '会遗忘的花园', 'A Garden That Forgets', '#b9caa2', '自然', '递归枝条、叶序螺旋与数学花瓣组成的植物不断生长、盛开、遗忘，在原地留下漂散的孢子。', '夜花盛开'],
  ['lunar-tide-clock', '月球上的潮汐钟', 'A Lunar Tide Clock', '#c6c3b4', '时间', '低悬的月亮照着银灰沙地，潮汐梳理出唱片般的沙纹；月面明暗显示本地小时，沙上的光圈记录分钟。', '月尘流星'],
  ['eclipse-rehearsal', '群星排练一场日食', 'Rehearsal for an Eclipse', '#e3c497', '深空', '数千个发光个体由散游渐渐汇成日冕，迟到的光点追上队形；完成一场日食后，它们重新散入星海。', '日食排练'],
];
const runtime = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8');
for (const [index, [id, title, subtitle, accent, category, description, event]] of works.entries()) {
  const dir = path.join(root, 'wallpapers', id);
  fs.mkdirSync(dir, { recursive: true });
  const meta = { title, subtitle, description, tags: ['Canvas 2D', '程序艺术', category, '离线'], accent, order: 20 + index / 10 };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const code = runtime.replace('/* ARTWORK_SOURCE */', fs.readFileSync(path.join(__dirname, id + '.js'), 'utf8')).replaceAll('__ART_ID__', id);
  fs.writeFileSync(path.join(dir, 'wallpaper.html'), `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title} · ${subtitle}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#070a10;color:#f2eadb;font-family:system-ui,"Microsoft YaHei",sans-serif}canvas{display:block;width:100%;height:100%;touch-action:none}button,select,input{font:inherit;accent-color:${accent}}button,select{color:inherit;background:#ffffff0c;border:1px solid #ffffff24;border-radius:7px;padding:8px 12px}button{cursor:pointer}button:hover{background:#ffffff1c}button:focus-visible,select:focus-visible{outline:2px solid ${accent};outline-offset:4px}#settings{position:fixed;right:20px;bottom:20px;opacity:0;transition:opacity .3s;background:#111820b8;backdrop-filter:blur(12px)}body:hover #settings,body:focus-within #settings,body.intro #settings{opacity:.75}#panel{position:fixed;bottom:72px;right:20px;width:min(330px,calc(100vw - 40px));max-height:calc(100vh - 100px);overflow:auto;background:#10151eea;border:1px solid #ffffff25;border-radius:14px;padding:22px;backdrop-filter:blur(20px);box-shadow:0 18px 70px #0006}#panel[hidden]{display:none}h1{font-family:serif;font-size:23px;font-weight:400;margin:0 0 5px}small{font-size:10px;letter-spacing:2px;color:${accent}}p{font-size:12px;line-height:1.8;color:#c3c6cd}.controls{display:flex;flex-wrap:wrap;gap:8px}.row{display:flex;align-items:center;justify-content:space-between;margin:14px 0;font-size:12px}#status{display:block;margin-top:14px;color:#a4b1c1;font-size:11px}kbd{font-family:inherit;color:#eee}body.clean #settings{opacity:0;pointer-events:none}body.clean #panel{display:none}
</style></head><body class="intro"><canvas id="scene" aria-label="${title}：${description}"></canvas>
<button id="settings" type="button" aria-controls="panel" aria-expanded="false" title="显示设置（H）">☷ 设置</button>
<aside id="panel" hidden aria-label="壁纸设置"><h1>${title}</h1><small>${subtitle}</small><p>${description}</p><div class="controls"><button id="pause" type="button">暂停</button><button id="event" type="button">${event}</button><button id="reseed" type="button">变换构图</button></div><label class="row">时间流速<select id="speed"><option value="0.5">舒缓 · ½</option><option value="1" selected>自然 · 1</option><option value="2">轻快 · 2</option></select></label><label class="row">画质<select id="quality"><option value="high">精细</option><option value="low">节能</option></select></label><p><kbd>空格</kbd> 暂停 / 继续 · <kbd>H</kbd> 设置<br><kbd>E</kbd> 特殊事件 · <kbd>R</kbd> 变换构图</p><output id="status" aria-live="polite"></output></aside>
<script>${code}</script></body></html>\n`);
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${title} · ${subtitle}\n\n${description}\n\n这是一幅独立壁纸。打开本目录的 wallpaper.html 即可离线播放，也会作为独立条目被流光壁纸自动扫描。无外部字体、图片、音频或网络依赖。\n\n- H：打开或关闭设置；空格：暂停或继续；E：${event}；R：变换构图。\n- 设置中可调流速和画质。系统“减少动态效果”默认显示静帧，可手动继续。页面隐藏时停止绘制，暂停及静帧状态调整窗口仍会重绘。\n- 特殊事件也会按各作品的时间节奏自然出现。暂停时触发会显示事件中段；播放时触发从头开始。\n- 支持 ?seed=42&t=30&still=1&hud=0&quality=low 参数；t 为动画秒数，still=0 可明确启用动画。\n- 画布最多约 260 万像素（节能 120 万），目标 30 FPS；不依赖帧数推进动画。\n${id === 'time-resin' ? '\n琥珀使用本地存储记录真实活跃运行秒数，每分钟沉积一层；保留最近 240 层及累计时间。暂停、隐藏与关闭期间不计时，调速不改变沉积速度。文件路径或浏览器资料变化会形成不同的记录；存储不可用时继续运行并在设置中提示。变换构图保留时间记录。\n' : ''}${id === 'lunar-tide-clock' ? '\n月面终止线随本地 24 小时周期移动（艺术化时间映射，并非真实月相）；沙面光圈随本地分钟与秒钟扩散。暂停时冻结读数，继续后重新同步系统时间。\n' : ''}\n源代码：scripts/dream-atlas/${id}.js 与 runtime.js；运行 node scripts/dream-atlas/build.cjs 重新生成单文件 HTML。运行 node scripts/verify-dream-atlas.cjs 验证；加 --capture 更新预览和在线馆素材。\n`);
}
module.exports = { works };
console.log('Built eight independent standalone wallpapers.');
