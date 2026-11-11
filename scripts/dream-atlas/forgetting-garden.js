function createArtwork() {
  let plants, motes;
  function reset() {
    plants = Array.from({ length: 11 }, (_, i) => ({ x: .10 + i * .08 + (rand() - .5) * .035, height: .21 + rand() * .35, phase: i / 11 * 180, lean: (rand() - .5) * .36, hue: [35, 74, 158, 198][i % 4], petals: 7 + Math.floor(rand() * 7), a: rand() * TAU }));
    motes = Array.from({ length: 145 }, () => ({ x: rand(), y: rand(), a: rand() * TAU, r: .4 + rand() * 1.1 }));
  }
  reset();
  function flower(x, y, r, p, open, fade, time) {
    if (open < .01) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.a + time * .008);
    const radius = r * (.15 + .85 * open);
    for (let layer = 0; layer < 2; layer++) {
      ctx.beginPath();
      for (let i = 0; i <= 260; i++) {
        const a = i / 260 * TAU, lobe = .47 + .53 * Math.pow(.5 + .5 * Math.cos(p.petals * a + layer * Math.PI), .65);
        const rr = radius * lobe * (1 - layer * .29);
        const xx = Math.cos(a) * rr, yy = Math.sin(a) * rr * .78;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.closePath(); ctx.fillStyle = `hsla(${p.hue},30%,62%,${.085 * fade})`; ctx.fill(); stroke(`hsla(${p.hue},36%,80%,${.84 * fade})`, .85);
      ctx.beginPath();
      for (let j = 0; j < p.petals; j++) {
        const a = j / p.petals * TAU + layer * Math.PI / p.petals;
        ctx.moveTo(Math.cos(a) * radius * .15, Math.sin(a) * radius * .12);
        ctx.quadraticCurveTo(Math.cos(a + .1) * radius * .5, Math.sin(a + .1) * radius * .4, Math.cos(a) * radius * (1 - layer * .29), Math.sin(a) * radius * .78 * (1 - layer * .29));
      }
      stroke(`hsla(${p.hue},29%,77%,${.3 * fade})`, .65);
    }
    // Vogel's golden-angle phyllotaxis, with no repeated angular rows.
    ctx.beginPath();
    for (let j = 1; j < 72; j++) {
      const a = j * 2.399963229728653, rr = Math.sqrt(j / 72) * radius * .23;
      ctx.rect(Math.cos(a) * rr, Math.sin(a) * rr * .8, Math.max(.6, radius * .025), Math.max(.6, radius * .025));
    }
    ctx.fillStyle = `rgba(227,211,151,${fade * .75})`; ctx.fill(); ctx.restore();
  }
  function branch(x, y, length, angle, depth, grow, fade, p, time) {
    if (grow <= .01 || depth < 0) return;
    const sway = Math.sin(time * .21 + p.a + depth) * .035;
    const endX = x + Math.sin(angle + sway) * length * grow, endY = y - Math.cos(angle) * length * grow;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(angle - .12) * length * .55 * grow, y - length * .55 * grow, endX, endY);
    stroke(`rgba(154,180,142,${fade * (.32 + depth * .14)})`, .7 + depth * .4);
    for (let j = 1; j <= 3; j++) {
      const f = j / 4, lx = mix(x, endX, f), ly = mix(y, endY, f), sign = j % 2 ? 1 : -1;
      const leaf = length * .19 * grow;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + sign * leaf * .9, ly - leaf * .1, lx + sign * leaf, ly - leaf * .8); ctx.quadraticCurveTo(lx + sign * leaf * .3, ly - leaf * .9, lx, ly);
      ctx.fillStyle = `rgba(123,153,119,${fade * .085})`; ctx.fill(); stroke(`rgba(160,187,143,${fade * .56})`, .7);
    }
    if (depth > 0) {
      branch(endX, endY, length * .62, angle - .46, depth - 1, clamp(grow * 1.8 - .65), fade, p, time);
      branch(endX, endY, length * .64, angle + .52, depth - 1, clamp(grow * 1.8 - .65), fade, p, time);
    } else flower(endX, endY, unit * (.023 + p.height * .045), p, smooth(.55, 1, grow), fade, time);
  }
  return {
    reset, eventDuration: 24,
    snapshot: () => ({ plants: plants.length, motes: motes.length, ages: plants.map(p => mod(t + p.phase, 180) / 180) }),
    draw(time) {
      background('#101c1b', '#070f12');
      glow(w * .48, h * .52, unit * .68, 'rgba(86,112,85,.12)');
      const ground = h * .88;
      ctx.beginPath(); ctx.moveTo(0, ground); ctx.bezierCurveTo(w * .3, ground - 8, w * .7, ground + 4, w, ground - 4); stroke('rgba(144,161,134,.12)', .7);
      for (const p of plants) {
        const age = mod(time + p.phase, 180) / 180;
        const grow = smooth(0, .47, age), fade = 1 - smooth(.72, 1, age);
        const x = p.x * w, y = ground + Math.sin(p.a) * h * .02;
        branch(x, y, p.height * h * .5, p.lean, 2, grow, fade, p, time);
        // The central bloom remains individually legible above its branching stem.
        const tipX = x + Math.sin(p.lean) * p.height * h * grow;
        const tipY = y - p.height * h * grow;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - p.lean * h * .15, y - p.height * h * .6 * grow, tipX, tipY); stroke(`rgba(164,182,139,${fade * .65})`, 1);
        flower(tipX, tipY, unit * (.03 + p.height * .055), p, smooth(.22, .5, age), fade, time);
        if (age > .72) {
          const drift = (age - .72) / .28;
          for (let i = 0; i < 35; i++) {
            const a = i * 2.39996, rr = Math.sqrt(i / 35) * unit * .04;
            const xx = tipX + Math.cos(a) * rr + drift * unit * (.1 + .08 * Math.sin(i));
            const yy = tipY + Math.sin(a) * rr - drift * unit * (.06 + i / 35 * .1);
            circle(xx, yy, .7, `rgba(208,215,169,${Math.sin(drift * Math.PI) * .55})`);
          }
        }
      }
      const rare = bell(eventPhase(time, 260, 24, 75));
      if (rare > 0) {
        const p = { a: -.3, petals: 17, hue: 185, height: .5 };
        const xx = w * .56, yy = h * .3;
        ctx.beginPath(); ctx.moveTo(w * .53, ground); ctx.quadraticCurveTo(w * .49, h * .46, xx, yy); stroke(`rgba(157,208,196,${rare * .4})`, 1);
        glow(xx, yy, unit * .12, `rgba(137,221,205,${rare * .16})`);
        flower(xx, yy, unit * .078, p, rare, rare, time);
      }
      for (const m of motes) {
        const x = mod(m.x + time * .002 + Math.sin(time * .12 + m.a) * .012, 1), y = mod(m.y - time * .003, 1);
        circle(x * w, y * h, m.r, `rgba(178,201,153,${.12 + .16 * Math.sin(time * .2 + m.a) ** 2})`);
      }
      vignette(.52);
    },
  };
}
