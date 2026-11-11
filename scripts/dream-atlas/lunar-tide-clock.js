function createArtwork() {
  let sky, craters, moon, cachedMinute = -1;
  function reset() { sky = makeStars(150); craters = Array.from({ length: 45 }, () => ({ x: (rand() - .5) * 1.7, y: (rand() - .5) * 1.7, r: .013 + rand() ** 2 * .15 })); cachedMinute = -1; }
  reset();
  function lunarTexture(date) {
    const minute = date.getHours() * 60 + date.getMinutes();
    if (minute === cachedMinute && moon) return;
    cachedMinute = minute;
    moon = document.createElement('canvas'); moon.width = moon.height = 400;
    const mc = moon.getContext('2d'), data = mc.createImageData(400, 400);
    const angle = minute / 1440 * TAU - Math.PI / 2;
    for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
      const nx = (x - 199.5) / 199, ny = (y - 199.5) / 199, r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;
      const nz = Math.sqrt(1 - r2), light = Math.max(0, nx * Math.cos(angle) * .94 - ny * .22 + nz * Math.sin(angle) * .94);
      const surface = .84 + field(nx * 8 + seed % 33, ny * 8) * .12;
      const value = (32 + Math.pow(light, .6) * 191) * surface;
      const i = (y * 400 + x) * 4;
      data.data[i] = value * 1.03; data.data[i + 1] = value * 1.02; data.data[i + 2] = value; data.data[i + 3] = clamp((1 - r2) * 200) * 255;
    }
    mc.putImageData(data, 0, 0); mc.save(); mc.beginPath(); mc.arc(200, 200, 198, 0, TAU); mc.clip();
    for (const c of craters) {
      const x = 200 + c.x * 200, y = 200 + c.y * 200, rr = c.r * 200;
      mc.beginPath(); mc.ellipse(x, y, rr, rr * .79, .2, 0, TAU); mc.fillStyle = 'rgba(8,10,14,.13)'; mc.fill();
      mc.beginPath(); mc.ellipse(x, y + .8, rr, rr * .79, .2, .1, Math.PI); mc.strokeStyle = 'rgba(236,228,205,.11)'; mc.lineWidth = 1; mc.stroke();
    }
    mc.restore();
  }
  return {
    reset, eventDuration: 14,
    snapshot: () => ({ hour: clockDate.getHours(), minute: clockDate.getMinutes(), second: clockDate.getSeconds(), sandRings: quality === 'low' ? 95 : 155 }),
    draw(time) {
      background('#0a0e16', '#22262a'); stars(sky, time, .4);
      const mx = w * .51, my = h * .29, radius = unit * .174;
      glow(mx, my, radius * 1.9, 'rgba(161,169,175,.08)'); lunarTexture(clockDate);
      ctx.drawImage(moon, mx - radius, my - radius, radius * 2, radius * 2);
      // Long low dunes form a quiet horizon beneath the moon.
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, h * (.58 + .018 * field(x / w * 5 + 3)));
      ctx.lineTo(w, h); ctx.closePath();
      const sand = ctx.createLinearGradient(0, h * .56, 0, h); sand.addColorStop(0, '#5d5d56'); sand.addColorStop(.22, '#77766a'); sand.addColorStop(1, '#343b3e'); ctx.fillStyle = sand; ctx.fill();
      const cx = w * .51, cy = h * .78, spread = Math.max(w * .6, h * .42), count = quality === 'low' ? 95 : 155;
      ctx.save(); ctx.beginPath(); ctx.rect(0, h * .605, w, h); ctx.clip();
      for (let i = 0; i < count; i++) {
        const r = .03 + i / count * 1.48;
        ctx.beginPath();
        for (let j = 0; j <= 210; j++) {
          const a = j / 210 * TAU;
          const ripple = .0035 * Math.sin(a * 9 + r * 23 - time * .09) + .002 * Math.sin(a * 17 - time * .07);
          const rr = r + ripple;
          const x = cx + Math.cos(a) * rr * spread;
          const y = cy + Math.sin(a) * rr * unit * .22;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        stroke(i % 3 ? 'rgba(214,209,184,.19)' : 'rgba(26,34,38,.37)', i % 3 ? .7 : 1);
      }
      const minute = (clockDate.getMinutes() + clockDate.getSeconds() / 60) / 60;
      ctx.beginPath(); ctx.ellipse(cx, cy, spread * (.09 + minute * .88), unit * .22 * (.09 + minute * .88), 0, 0, TAU); stroke('rgba(230,226,201,.53)', 1.1);
      const hour = clockDate.getHours() + clockDate.getMinutes() / 60;
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU - Math.PI / 2;
        circle(cx + Math.cos(a) * spread * .69, cy + Math.sin(a) * unit * .152, i % 6 ? 1 : 1.8, '#ded8b95c');
      }
      const a = hour / 24 * TAU - Math.PI / 2;
      const hx = cx + Math.cos(a) * spread * .69, hy = cy + Math.sin(a) * unit * .152;
      glow(hx, hy, unit * .022, 'rgba(239,225,177,.34)'); circle(hx, hy, 2, '#e4dbb9');
      ctx.restore();
      const p = eventPhase(time, 240, 14, 70);
      if (p >= 0) {
        const xx = w * (.17 + p * .58), yy = h * (.13 + p * .27), fade = bell(p);
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - w * .11, yy - h * .052); stroke(`rgba(210,218,220,${fade * .48})`, .8);
        glow(xx, yy, unit * .015, `rgba(231,224,200,${fade * .48})`);
      }
      vignette(.44);
    },
  };
}
