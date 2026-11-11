function createArtwork() {
  const key = 'lumen-dream-atlas-resin-v1';
  let history = { version: 1, seconds: 0, layers: [] }, storageOK = true, dirty = false, sinceSave = 0;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && stored.version === 1 && Number.isFinite(stored.seconds) && stored.seconds >= 0 && stored.seconds < 1e12 && Array.isArray(stored.layers)) {
      history = { version: 1, seconds: stored.seconds, layers: stored.layers.filter(x => Number.isFinite(x.minute) && x.minute > 0 && typeof x.night === 'boolean').slice(-240) };
    }
  } catch { storageOK = false; }
  let bubbles, shards, dust;
  function reset() {
    bubbles = Array.from({ length: 52 }, () => ({ x: (rand() - .5) * 1.4, y: (rand() - .5) * 1.6, r: .004 + rand() ** 3 * .045, phase: rand() * TAU }));
    shards = Array.from({ length: 14 }, () => ({ x: (rand() - .5) * 1.2, y: (rand() - .5) * 1.4, r: .012 + rand() * .025, a: rand() * TAU }));
    dust = Array.from({ length: 600 }, () => ({ x: (rand() - .5) * 1.5, y: (rand() - .5) * 1.8, a: rand() }));
  }
  reset();
  function flush() { if (!dirty) return; try { localStorage.setItem(key, JSON.stringify(history)); dirty = false; storageOK = true; } catch { storageOK = false; } sinceSave = 0; }
  function outline(s) {
    ctx.beginPath(); ctx.moveTo(-s * .51, -s * .91); ctx.bezierCurveTo(-s * .85, -s * .77, -s * .87, s * .12, -s * .64, s * .67);
    ctx.lineTo(-s * .3, s * .89); ctx.bezierCurveTo(s * .1, s * 1.03, s * .63, s * .78, s * .73, s * .46);
    ctx.bezierCurveTo(s * .88, s * .02, s * .73, -s * .63, s * .47, -s * .82); ctx.closePath();
  }
  function fern(x, y, length, angle, level) {
    if (!level) return;
    const xx = x + Math.sin(angle) * length, yy = y - Math.cos(angle) * length;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + length * .08, y - length * .6, xx, yy); stroke('rgba(53,35,20,.65)', Math.max(.65, level * .42));
    for (let i = 1; i <= 5; i++) {
      const f = i / 6;
      if (level > 1) {
        fern(mix(x, xx, f), mix(y, yy, f), length * (.34 - f * .18), angle - .72, level - 1);
        fern(mix(x, xx, f), mix(y, yy, f), length * (.34 - f * .18), angle + .72, level - 1);
      }
    }
  }
  return {
    reset, flush, eventDuration: 18,
    update(dt) {
      const previous = Math.floor(history.seconds / 60); history.seconds += dt; sinceSave += dt; dirty = true;
      const minute = Math.floor(history.seconds / 60), hour = new Date().getHours();
      for (let i = Math.max(previous + 1, minute - 239); i <= minute; i++) history.layers.push({ minute: i, night: hour < 6 || hour >= 19 });
      history.layers = history.layers.slice(-240);
      if (minute !== previous || sinceSave >= 15) flush();
    },
    status: () => `已沉积 ${Math.floor(history.seconds / 60)} 分钟 · 保存最近 ${history.layers.length} 层${storageOK ? ' · 本机记忆' : ' · 本地保存不可用'}`,
    snapshot: () => ({ activeSeconds: history.seconds, layers: history.layers.length, storageOK, particles: dust.length + bubbles.length }),
    draw(time) {
      background('#14110f', '#080b10');
      const cx = w * .53, cy = h * .48, s = Math.min(w * .43, h * .46);
      glow(cx, cy, s * 1.55, 'rgba(133,86,37,.18)');
      ellipse(cx, h * .94, s * .74, s * .08, 'rgba(0,0,0,.45)');
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.13 + Math.sin(time * .021) * .012);
      outline(s);
      const amber = ctx.createLinearGradient(-s * .8, -s, s * .7, s);
      amber.addColorStop(0, '#544522'); amber.addColorStop(.21, '#c0903c'); amber.addColorStop(.44, '#6d431e'); amber.addColorStop(.68, '#b67b2e'); amber.addColorStop(1, '#39291e');
      ctx.fillStyle = amber; ctx.fill();
      ctx.save(); ctx.clip();
      glow(-s * .3, -s * .42, s * .95, 'rgba(255,211,111,.43)');
      glow(s * .49, s * .31, s * .8, 'rgba(244,149,38,.27)');
      // Primordial bands are always present. Earned layers carry their day/night color.
      const earned = history.layers;
      for (let i = 0; i < 68 + earned.length; i++) {
        const real = i >= 68, layer = earned[i - 68];
        const z = i / (68 + earned.length), y = s * (-.98 + z * 1.98);
        ctx.beginPath();
        for (let j = 0; j <= 100; j++) {
          const x = -s + j / 100 * 2 * s;
          const yy = y + field(x / s * 2.4 + z * 2, z * 7 + time * .001) * s * .038;
          j ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        stroke(real ? (layer.night ? 'rgba(75,103,137,.38)' : 'rgba(255,214,126,.43)') : 'rgba(255,208,117,.12)', real ? 1.15 : .6);
      }
      fern(-s * .14, s * .48, s * .91, -.24, 3);
      ctx.save(); ctx.translate(s * .26, -s * .1); ctx.rotate(.65);
      ellipse(0, 0, s * .043, s * .15, 'rgba(68,42,19,.35)');
      ctx.beginPath(); ctx.moveTo(0, s * .15); ctx.lineTo(0, -s * .14); stroke('rgba(49,36,20,.5)', 1); ctx.restore();
      ctx.fillStyle = 'rgba(255,226,163,.34)'; ctx.beginPath();
      for (const p of dust) ctx.rect(p.x * s + Math.sin(time * .025 + p.a * 10) * 1.3, p.y * s, p.a > .9 ? 1.2 : .55, .8);
      ctx.fill();
      for (const b of bubbles) {
        const x = b.x * s, y = b.y * s + Math.sin(time * .035 + b.phase) * s * .002;
        ctx.beginPath(); ctx.arc(x, y, b.r * s, 0, TAU); stroke('rgba(255,225,155,.37)', .7);
        circle(x - b.r * s * .35, y - b.r * s * .4, Math.max(.5, b.r * s * .16), '#ffe6b385');
      }
      const flash = bell(eventPhase(time, 180, 18, 60));
      for (const p of shards) {
        ctx.save(); ctx.translate(p.x * s, p.y * s); ctx.rotate(p.a);
        ctx.beginPath(); ctx.moveTo(0, -p.r * s * 2); ctx.lineTo(p.r * s * .55, 0); ctx.lineTo(0, p.r * s); ctx.lineTo(-p.r * s * .5, 0); ctx.closePath();
        ctx.fillStyle = 'rgba(255,226,161,.14)'; ctx.fill(); stroke('rgba(255,229,174,.53)', .65);
        if (flash) glow(0, -p.r * s, s * .08, `rgba(255,230,160,${flash * .42})`);
        ctx.restore();
      }
      ctx.restore(); outline(s); stroke('rgba(248,220,158,.65)', 1.4);
      ctx.save(); ctx.scale(.974, .974); outline(s); stroke('rgba(255,211,124,.22)', 3); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-s * .51, -s * .89); ctx.bezierCurveTo(-s * .76, -s * .64, -s * .77, -s * .16, -s * .72, s * .12); stroke('rgba(255,238,191,.65)', 2);
      ctx.restore(); vignette(.42);
    },
  };
}
