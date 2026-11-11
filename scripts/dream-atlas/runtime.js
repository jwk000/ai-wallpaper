(() => {
  'use strict';
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const params = new URLSearchParams(location.search);
  const TAU = Math.PI * 2;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const mix = (a, b, x) => a + (b - a) * x;
  const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a)); return v * v * (3 - 2 * v); };
  const mod = (x, n) => ((x % n) + n) % n;
  function numberParam(key, fallback, lo, hi) {
    const v = params.has(key) ? Number(params.get(key)) : NaN;
    return Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
  }
  let seed = numberParam('seed', 20261111, 1, 4294967295) >>> 0;
  function randomSource(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let v = Math.imul(s ^ s >>> 15, 1 | s); v ^= v + Math.imul(v ^ v >>> 7, 61 | v); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
  let rand = randomSource(seed);
  // Smooth, bounded harmonic field: no texture or network input.
  const field = (x, y = 0) => Math.sin(x * 1.73 + y * .73) * .5 + Math.sin(x * 3.17 - y * 1.37) * .27 + Math.sin(x * 7.13 + y * 2.71) * .13 + Math.cos(x * 13.31 - y) * .1;
  const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${clamp(a)})`;
  let w = 1, h = 1, unit = 1, dpr = 1;
  let t = numberParam('t', 24, 0, 1e8), speed = 1, frames = 0, raf = 0, last = null;
  let quality = params.get('quality') === 'low' ? 'low' : 'high';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = params.has('still') ? params.get('still') !== '0' : media.matches;
  let manualMotion = params.has('still');
  let specialStart = -1e9, drawMs = 0, clockDate = new Date();
  const pointer = { x: 0, y: 0, active: false };
  const panel = document.getElementById('panel');
  const status = document.getElementById('status');
  function circle(x, y, r, color) { if (r <= 0) return; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ellipse(x, y, rx, ry, color, rotation = 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rotation, 0, TAU); ctx.fill(); }
  function glow(x, y, r, color) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(.1, r)); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); circle(x, y, r, g); }
  function background(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  function stroke(color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  function eventPhase(time, period, duration, offset = 0) {
    const manual = time - specialStart;
    if (manual >= 0 && manual <= duration) return manual / duration;
    const cycle = mod(time + offset, period);
    return cycle < duration ? cycle / duration : -1;
  }
  const bell = p => p < 0 ? 0 : Math.sin(clamp(p) * Math.PI) ** 2;
  function stars(list, time, alpha = .6) {
    for (const p of list) circle(p.x * w, p.y * h, p.r, rgba(174, 191, 214, alpha * (.65 + .35 * Math.sin(time * .25 + p.a))));
  }
  function makeStars(count) { return Array.from({ length: count }, () => ({ x: rand(), y: rand(), r: .3 + rand() * 1.1, a: rand() * TAU })); }
  function vignette(alpha = .35) { const g = ctx.createRadialGradient(w / 2, h * .46, unit * .2, w / 2, h / 2, Math.hypot(w, h) * .55); g.addColorStop(0, 'transparent'); g.addColorStop(1, `rgba(0,0,0,${alpha})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }

  /* ARTWORK_SOURCE */

  const art = createArtwork();
  function draw() {
    const begin = performance.now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    art.draw(t);
    drawMs = performance.now() - begin;
    frames++;
  }
  function resize() {
    w = Math.max(1, innerWidth); h = Math.max(1, innerHeight); unit = Math.min(w, h);
    const budget = quality === 'low' ? 1200000 : 2600000;
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(budget / (w * h)));
    canvas.width = Math.max(1, Math.floor(w * dpr)); canvas.height = Math.max(1, Math.floor(h * dpr));
    art.resize?.(); draw();
  }
  function syncPanel() {
    document.getElementById('pause').textContent = paused ? '继续' : '暂停';
    document.getElementById('pause').setAttribute('aria-pressed', String(paused));
    document.getElementById('settings').setAttribute('aria-expanded', String(!panel.hidden));
    status.textContent = art.status?.() || (paused ? '画面已暂停' : '离线绘制 · 30 FPS');
  }
  function loop(now) {
    raf = 0;
    if (paused || document.hidden) { last = null; return; }
    if (last === null) last = now;
    if (now - last >= 1000 / 30 - .5) {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      t += dt * speed; clockDate = new Date(); art.update?.(dt, t); draw();
      if (!panel.hidden) syncPanel();
    }
    raf = requestAnimationFrame(loop);
  }
  function schedule() { if (!raf && !paused && !document.hidden) { last = null; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = null; }
  function togglePause() { paused = !paused; manualMotion = true; if (paused) { stop(); art.flush?.(); } else { clockDate = new Date(); schedule(); } syncPanel(); }
  function trigger() { specialStart = t - (paused ? (art.eventDuration || 20) * .5 : 0); draw(); syncPanel(); }
  function reseed() { seed = (seed + 2654435761) >>> 0; rand = randomSource(seed); art.reset?.(); art.resize?.(); draw(); }
  function togglePanel() { document.body.classList.remove('clean'); panel.hidden = !panel.hidden; syncPanel(); }
  document.getElementById('settings').addEventListener('click', togglePanel);
  document.getElementById('pause').addEventListener('click', togglePause);
  document.getElementById('event').addEventListener('click', trigger);
  document.getElementById('reseed').addEventListener('click', reseed);
  document.getElementById('speed').addEventListener('change', e => { speed = Number(e.target.value); });
  document.getElementById('quality').value = quality;
  document.getElementById('quality').addEventListener('change', e => { quality = e.target.value; resize(); });
  addEventListener('keydown', e => {
    if (e.repeat || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
    else if (e.key.toLowerCase() === 'h') togglePanel();
    else if (e.key.toLowerCase() === 'e') trigger();
    else if (e.key.toLowerCase() === 'r') reseed();
  });
  canvas.addEventListener('pointermove', e => { pointer.x = (e.clientX / w - .5) * 2; pointer.y = (e.clientY / h - .5) * 2; pointer.active = true; });
  canvas.addEventListener('pointerleave', () => { pointer.active = false; pointer.x = pointer.y = 0; });
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); art.flush?.(); } else { clockDate = new Date(); if (!paused) draw(); schedule(); } });
  addEventListener('pagehide', () => { stop(); art.flush?.(); });
  media.addEventListener('change', e => { if (!manualMotion) { paused = e.matches; if (paused) stop(); else schedule(); syncPanel(); } });
  if (params.get('hud') === '0') document.body.classList.add('clean');
  setTimeout(() => document.body.classList.remove('intro'), 4500);
  // Small diagnostics surface for deterministic captures and long-duration checks.
  window.__dreamAtlas = {
    snapshot: () => ({ id: '__ART_ID__', seed, t, paused, frames, w, h, dpr, quality, speed, drawMs, scheduled: !!raf, specialStart, ...art.snapshot?.() }),
    seek(time) { if (!Number.isFinite(time) || time < 0) throw new Error('Invalid time'); t = time; draw(); },
    render: draw,
    trigger,
    // Advance active time only for persistence verification; normal playback uses RAF.
    advance(seconds) { if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400) throw new Error('Invalid duration'); t += seconds * speed; art.update?.(seconds, t); draw(); },
    flush() { art.flush?.(); },
  };
  resize(); syncPanel(); schedule();
})();
