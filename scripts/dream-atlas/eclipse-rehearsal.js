function createArtwork() {
  let swarm, sky;
  function reset() {
    sky = makeStars(230);
    swarm = Array.from({ length: 6800 }, (_, i) => ({ a: rand() * TAU, r: rand(), z: rand(), phase: rand() * TAU, delay: rand() * .12, group: i % 5 }));
  }
  reset();
  function assembly(time) {
    const p = eventPhase(time, 200, 100, 8);
    return { p, strength: p < 0 ? 0 : smooth(.04, .36, p) * (1 - smooth(.7, 1, p)) };
  }
  function point(p, time, strength) {
    const collect = smooth(p.delay, .95, strength);
    const a = p.a + time * (.018 + p.z * .012);
    const roamR = .18 + p.r * .95;
    const roamX = Math.cos(a * (1 + p.group * .04)) * roamR + .12 * Math.sin(time * .08 + p.phase);
    const roamY = Math.sin(a + Math.sin(time * .013 + p.group)) * roamR * .67;
    const ringR = .46 + Math.pow(p.r, 3.7) * .2 + .014 * Math.sin(a * 7 + time * .11 + p.group);
    return [mix(roamX, Math.cos(a) * ringR, collect), mix(roamY, Math.sin(a) * ringR, collect)];
  }
  return {
    reset, eventDuration: 100,
    snapshot: () => ({ particles: swarm.length, ...assembly(t) }),
    draw(time) {
      background('#080e19', '#05080f'); stars(sky, time, .37);
      const { strength } = assembly(time), cx = w * .52, cy = h * .49, scale = Math.min(w * .45, h * .68);
      glow(cx, cy, scale * .97, 'rgba(35,58,88,.16)');
      if (strength > .2) {
        const g = ctx.createRadialGradient(cx, cy, scale * .44, cx, cy, scale * .76);
        g.addColorStop(0, 'transparent'); g.addColorStop(.10, `rgba(235,180,95,${strength * .12})`); g.addColorStop(.38, `rgba(122,147,172,${strength * .07})`); g.addColorStop(1, 'transparent');
        circle(cx, cy, scale * .77, g);
      }
      ctx.globalCompositeOperation = 'screen';
      const colors = ['rgba(205,216,232,.76)', 'rgba(237,199,145,.83)', 'rgba(153,190,232,.64)'];
      for (let band = 0; band < 3; band++) {
        ctx.beginPath();
        for (let i = band; i < swarm.length; i += quality === 'low' ? 6 : 3) {
          const p = swarm[i], xy = point(p, time, strength), sz = (p.z > .94 ? 1.8 : 1.03) * Math.max(.7, unit / 1000);
          ctx.rect(cx + xy[0] * scale, cy + xy[1] * scale, sz, sz);
        }
        ctx.fillStyle = colors[band]; ctx.fill();
      }
      ctx.beginPath();
      for (let i = 0; i < 700; i++) {
        const p = swarm[i * 9], xy = point(p, time, strength), prev = point(p, time - .8, assembly(time - .8).strength);
        ctx.moveTo(cx + xy[0] * scale, cy + xy[1] * scale); ctx.lineTo(cx + prev[0] * scale, cy + prev[1] * scale);
      }
      stroke('rgba(189,204,221,.2)', .65);
      ctx.globalCompositeOperation = 'source-over';
      if (strength > .3) {
        circle(cx, cy, scale * .438, `rgba(4,7,13,${smooth(.3, .95, strength) * .96})`);
        ctx.beginPath(); ctx.arc(cx, cy, scale * .451, 0, TAU); stroke(`rgba(220,190,140,${strength * .24})`, .7);
        const a = time * .023;
        glow(cx + Math.cos(a) * scale * .47, cy + Math.sin(a) * scale * .47, scale * .12, `rgba(243,207,149,${strength * .32})`);
      }
      vignette(.48);
    },
  };
}
