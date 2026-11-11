function createArtwork() {
  let buildings, rain, rings, city, mirror;
  function reset() {
    buildings = [];
    for (let layer = 0; layer < 3; layer++) {
      let x = -.04;
      while (x < 1.04) {
        const width = .025 + rand() * .052, height = .09 + rand() * (.23 - layer * .04);
        const windows = Array.from({ length: 6 * 12 }, () => rand());
        buildings.push({ x, width, height, layer, windows, a: rand() * TAU }); x += width + .003;
      }
    }
    rain = Array.from({ length: 190 }, () => ({ x: rand(), y: rand(), speed: .08 + rand() * .12, length: .006 + rand() * .014 }));
    rings = Array.from({ length: 24 }, () => ({ x: rand(), y: .62 + rand() * .36, a: rand() * 4 }));
  }
  reset();
  function drawCity(target, time, trees) {
    const c = target.getContext('2d'), ratio = target.width / w;
    c.setTransform(ratio, 0, 0, ratio, 0, 0); c.clearRect(0, 0, w, h * .58);
    const base = h * .555;
    for (const b of buildings) {
      const x = b.x * w, bw = b.width * w, bh = b.height * h, y = base - bh + b.layer * h * .012;
      c.globalAlpha = 1 - trees * .83;
      c.fillStyle = ['#253045', '#19283a', '#101e2e'][b.layer]; c.fillRect(x, y, bw, bh);
      c.strokeStyle = '#6d829324'; c.lineWidth = .8; c.strokeRect(x, y, bw, bh);
      c.fillStyle = '#9ab8cf20'; c.fillRect(x + bw * .2, y - 4, bw * .55, 4);
      const cols = Math.max(2, Math.floor(bw / 11)), rows = Math.max(3, Math.floor(bh / 13));
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const q = b.windows[(row * 6 + col) % 72];
        const lit = Math.sin(time * .13 + q * 50 + b.a) > .1 + q * .7;
        if (!lit) continue;
        c.fillStyle = q > .6 ? '#d5b08395' : '#8cb9ce75';
        c.fillRect(x + bw * (col + .5) / cols, y + 8 + row * 12, Math.max(1.2, bw / cols * .3), 3.5);
      }
      if (trees > .005) {
        c.globalAlpha = trees;
        c.strokeStyle = '#658b9290'; c.lineWidth = 1.4;
        const tx = x + bw * .5;
        c.beginPath(); c.moveTo(tx, base); c.lineTo(tx, y - bh * .08);
        for (let k = 1; k <= 7; k++) {
          const yy = base - bh * k / 9, dx = bw * (.55 - k * .045);
          c.moveTo(tx, yy + bh * .12); c.lineTo(tx - dx, yy - bh * .04);
          c.moveTo(tx, yy + bh * .08); c.lineTo(tx + dx, yy - bh * .07);
        }
        c.stroke();
        c.fillStyle = '#46747a48';
        for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(tx + Math.sin(k * 2.4) * bw * .22, y + bh * .25 + k * bh * .07, bw * .42, bh * .19, k * .4, 0, TAU); c.fill(); }
      }
      c.globalAlpha = 1;
    }
    // Elevated tram appears nine seconds earlier in the water.
    const tramX = mod(time * .018, 1.3) * w - w * .2, tramY = base - h * .035;
    c.fillStyle = '#213443'; c.fillRect(0, base - 3, w, 3);
    c.fillStyle = '#b8d6dd18'; c.fillRect(0, tramY + 15, w, 1);
    c.fillStyle = '#63828b'; c.fillRect(tramX, tramY, unit * .12, unit * .018);
    c.fillStyle = '#e1c992';
    for (let j = 0; j < 7; j++) c.fillRect(tramX + 4 + j * unit * .015, tramY + 3, unit * .009, unit * .006);
    c.fillStyle = '#c9857c'; c.fillRect(w * .72, h * .42, 4, h * .065);
    c.fillStyle = '#9baebb'; c.font = `${Math.max(9, unit * .012)}px serif`; c.fillText('雨', w * .72 - unit * .004, h * .411);
  }
  return {
    reset, eventDuration: 16,
    resize() { city = document.createElement('canvas'); mirror = document.createElement('canvas'); for (const c of [city, mirror]) { c.width = Math.min(1600, Math.ceil(w)); c.height = Math.ceil(h * .58 * c.width / w); } },
    snapshot: () => ({ buildings: buildings.length, rain: rain.length, reflectionLead: 9 * (1 - bell(eventPhase(t, 150, 16, 55))) }),
    draw(time) {
      background('#111d30', '#091320');
      glow(w * .68, h * .27, unit * .48, 'rgba(107,135,158,.14)');
      const alignment = bell(eventPhase(time, 150, 16, 55));
      const forest = (.5 + .5 * Math.sin(time * TAU / 140 - .8)) * (1 - alignment);
      drawCity(city, time, 0); drawCity(mirror, time + 9 * (1 - alignment), forest);
      ctx.drawImage(city, 0, 0, w, h * .58);
      const horizon = h * .56, scale = mirror.width / w;
      const strip = quality === 'low' ? 6 : 3;
      for (let y = horizon; y < h; y += strip) {
        const depth = (y - horizon) / (h - horizon), sy = (horizon - (y - horizon) * .88) * scale;
        const dx = (Math.sin(y * .037 + time * .9) + Math.sin(y * .09 - time * .6)) * (1 + depth * 5) * (1 - alignment * .75);
        ctx.globalAlpha = .75 - depth * .28;
        ctx.drawImage(mirror, 0, Math.max(0, sy), mirror.width, strip * scale * .88, dx, y, w, strip + .6);
      }
      ctx.globalAlpha = 1;
      const water = ctx.createLinearGradient(0, horizon, 0, h); water.addColorStop(0, '#26415612'); water.addColorStop(1, '#081827aa'); ctx.fillStyle = water; ctx.fillRect(0, horizon, w, h - horizon);
      ctx.fillStyle = '#70889936'; ctx.fillRect(0, horizon, w, 1);
      ctx.beginPath();
      for (const r of rain) {
        const y = mod(r.y + time * r.speed, 1) * h, x = mod(r.x - time * .008, 1) * w;
        ctx.moveTo(x, y); ctx.lineTo(x - r.length * h * .18, y + r.length * h);
      }
      stroke('rgba(150,177,201,.17)', .7);
      for (const r of rings) {
        const age = mod(time * .34 + r.a, 1), radius = unit * (.004 + age * .021);
        ctx.beginPath(); ctx.ellipse(r.x * w, r.y * h, radius, radius * .22, 0, 0, TAU); stroke(`rgba(139,178,200,${(1 - age) * .26})`, .6);
      }
      if (alignment > 0) { ctx.beginPath(); ctx.ellipse(w * .51, h * .76, unit * (.05 + alignment * .7), unit * (.02 + alignment * .12), 0, 0, TAU); stroke(`rgba(186,218,230,${alignment * .16})`, 1); }
      vignette(.48);
    },
  };
}
