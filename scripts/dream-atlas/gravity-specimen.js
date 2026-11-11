function createArtwork() {
  let dust, sky, bands;
  function reset() {
    sky = makeStars(210);
    dust = Array.from({ length: 11000 }, (_, i) => {
      const r = .06 + Math.pow(rand(), .68) * .92;
      return { a: rand() < .72 ? r * 7 + (rand() - .5) * .48 : rand() * TAU, r,
        z: (rand() - .5) * .07, arm: i % 3, light: rand(), phase: rand() * TAU };
    });
    bands = [dust.filter(p => p.light < .55), dust.filter(p => p.light >= .55 && p.light < .87), dust.filter(p => p.light >= .87)];
  }
  reset();
  function position(p, time, bloom) {
    const angle = p.a + time * (.026 / (.15 + p.r)) + p.arm * 2.094;
    const r = p.r * (1 + .14 * Math.cos(angle * 3 + p.r * 8 - time * .02));
    const tidal = bloom * .21 * Math.sin(angle * 2 + p.r * 9);
    const x = Math.cos(angle) * (r + tidal);
    const y = Math.sin(angle) * (r + tidal);
    const twist = .34 * Math.sin(p.r * 4 + time * .011);
    return [x * Math.cos(twist) - y * Math.sin(twist), (x * Math.sin(twist) + y * Math.cos(twist)) * .44 + p.z * (1 + bloom * 3)];
  }
  return {
    reset, eventDuration: 32,
    snapshot: () => ({ particles: dust.length, event: eventPhase(t, 210, 32, 70) }),
    draw(time) {
      background('#05090f', '#0a101a'); stars(sky, time, .46);
      const cx = w * .53 + pointer.x * unit * .018, cy = h * .49 + pointer.y * unit * .016;
      const radius = Math.min(w * .43, h * .74), rotation = -.31 + Math.sin(time * .009) * .07;
      const bloom = bell(eventPhase(time, 210, 32, 70));
      glow(cx, cy, radius * .95, 'rgba(51,77,113,.13)');
      // The subtle vessel rim remains distinct from the interior orbital field.
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation);
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.06, radius * .6, 0, 0, TAU); stroke('rgba(153,183,212,.13)', .8);
      ctx.beginPath(); ctx.ellipse(0, -radius * .006, radius * 1.066, radius * .606, 0, Math.PI * 1.03, Math.PI * 1.79); stroke('rgba(202,219,238,.28)', .6);
      ctx.save(); ctx.scale(1, .43); glow(0, 0, radius * .6, 'rgba(205,153,78,.22)'); ctx.restore();
      for (let j = 0; j < 18; j++) {
        ctx.beginPath();
        for (let i = 0; i <= 220; i++) {
          const a = i / 220 * TAU, rr = .2 + j * .042;
          const p = position({ a, r: rr, arm: j % 3, z: 0 }, time, bloom);
          i ? ctx.lineTo(p[0] * radius, p[1] * radius) : ctx.moveTo(p[0] * radius, p[1] * radius);
        }
        stroke(j % 3 ? 'rgba(163,184,214,.055)' : 'rgba(211,174,113,.09)', .65);
      }
      ctx.globalCompositeOperation = 'screen';
      const colors = ['rgba(151,181,220,.56)', 'rgba(229,191,132,.78)', 'rgba(249,245,229,.95)'];
      for (let band = 0; band < bands.length; band++) {
        ctx.beginPath();
        const points = bands[band], skip = quality === 'low' ? 2 : 1;
        for (let i = 0; i < points.length; i += skip) {
          const p = points[i], xy = position(p, time, bloom);
          const size = (band === 2 ? 1.45 : 1.02) * Math.max(.65, unit / 950);
          ctx.rect(xy[0] * radius, xy[1] * radius, size, size);
        }
        ctx.fillStyle = colors[band]; ctx.fill();
      }
      // Analytic exposure streaks avoid accumulating opaque trails on pause/resize.
      ctx.beginPath();
      for (let i = 0; i < 850; i++) {
        const p = dust[i * 11], a = position(p, time, bloom), b = position(p, time - .7, bloom);
        ctx.moveTo(a[0] * radius, a[1] * radius); ctx.lineTo(b[0] * radius, b[1] * radius);
      }
      stroke('rgba(220,208,180,.32)', .75);
      glow(0, 0, radius * .12, 'rgba(240,200,129,.36)');
      circle(0, 0, 1.6, '#fff2c8');
      ctx.restore(); vignette(.52);
    },
  };
}
