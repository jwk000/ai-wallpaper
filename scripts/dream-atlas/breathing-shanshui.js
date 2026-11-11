function createArtwork() {
  let ridges, trees, birds, paper;
  function reset() {
    ridges = Array.from({ length: 7 }, (_, i) => ({ phase: rand() * 30, base: .26 + i * .092, amplitude: .12 + i * .012 }));
    trees = Array.from({ length: 65 }, () => ({ x: rand(), size: .018 + rand() * .035, bend: rand() - .5 }));
    birds = Array.from({ length: 11 }, (_, i) => ({ x: i * .018, y: Math.abs(i - 5) * .008, phase: rand() * TAU }));
  }
  reset();
  function ridgeY(layer, x, time) {
    const r = ridges[layer];
    return h * (r.base - Math.abs(field(x * 5 + r.phase, layer * 2 + time * .006)) * r.amplitude - .006 * Math.sin(time * .055 + x * 8 + layer));
  }
  function pine(x, y, size, bend) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - size * bend, y - size * .5, x + size * bend * .5, y - size);
    stroke('rgba(38,51,48,.7)', Math.max(.8, size * .033));
    for (let j = 1; j <= 5; j++) {
      const yy = y - size * (.2 + j * .13), spread = size * (.38 - j * .043);
      ctx.beginPath(); ctx.moveTo(x - spread, yy + size * .07); ctx.lineTo(x + size * bend * .2, yy - size * .07); ctx.lineTo(x + spread * .8, yy + size * .04);
      stroke('rgba(42,56,49,.7)', Math.max(.8, size * .06));
    }
  }
  return {
    reset, eventDuration: 35,
    resize() {
      paper = document.createElement('canvas'); paper.width = 384; paper.height = 384;
      const pc = paper.getContext('2d'), rr = randomSource(seed + 301);
      for (let i = 0; i < 14000; i++) { pc.fillStyle = rr() > .5 ? 'rgba(63,50,29,.035)' : 'rgba(255,255,240,.12)'; pc.fillRect(rr() * 384, rr() * 384, 1, rr() * 2 + .5); }
    },
    snapshot: () => ({ ridges: ridges.length, birds: birds.length, event: eventPhase(t, 165, 35, 60) }),
    draw(time) {
      background('#e1dfce', '#c9cdbb');
      const sunX = w * .77, sunY = h * .19;
      circle(sunX, sunY, unit * .039, 'rgba(169,99,76,.55)');
      for (let layer = 0; layer < 7; layer++) {
        ctx.beginPath(); ctx.moveTo(-5, h);
        for (let x = -5; x <= w + 9; x += 6) ctx.lineTo(x, ridgeY(layer, x / w, time));
        ctx.lineTo(w + 5, h); ctx.closePath();
        const shade = 148 - layer * 16;
        const g = ctx.createLinearGradient(0, h * ridges[layer].base - h * .15, 0, h * (ridges[layer].base + .3));
        g.addColorStop(0, rgba(shade - 4, shade + 9, shade + 4, .72)); g.addColorStop(1, rgba(shade + 30, shade + 40, shade + 28, .3));
        ctx.fillStyle = g; ctx.fill(); stroke(rgba(shade - 20, shade - 7, shade - 14, .32), .7);
        // Sparse vertical texture follows the actual moving ridge.
        ctx.beginPath();
        for (let j = 0; j < 115; j++) {
          const x = (j / 114) * w, y = ridgeY(layer, j / 114, time);
          ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x - 8, y + 24, x + Math.sin(j) * 10, y + 25 + Math.sin(j * 5 + layer) ** 2 * h * .09);
        }
        stroke(rgba(shade - 25, shade - 9, shade - 15, .11), .65);
        const fog = ctx.createLinearGradient(0, h * (ridges[layer].base - .02), 0, h * (ridges[layer].base + .1));
        fog.addColorStop(0, '#dcdccd00'); fog.addColorStop(.52, '#dcdfcf76'); fog.addColorStop(1, '#dcdccd00');
        ctx.fillStyle = fog; ctx.fillRect(0, h * (ridges[layer].base - .02), w, h * .12);
      }
      // The river widens with perspective and softly migrates in its own bed.
      const left = [], right = [];
      for (let i = 0; i <= 90; i++) {
        const z = i / 90, y = h * (.44 + z * .6), x = w * (.55 + Math.sin(z * 8 + time * .012) * (.018 + z * .1));
        const width = (2 + z ** 2.2 * w * .1);
        left.push([x - width, y]); right.push([x + width, y]);
      }
      ctx.beginPath(); left.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); right.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath();
      ctx.fillStyle = '#d2d6c5'; ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 48; i++) {
        const z = i / 48, y = h * (.48 + z * .52), x = w * (.55 + Math.sin((y / h - .44) / .6 * 8 + time * .012) * (.018 + z * .1));
        const length = (3 + z * z * w * .06) * (.6 + .3 * Math.sin(i * 3 + time * .2));
        ctx.moveTo(x - length, y); ctx.lineTo(x + length, y);
      }
      stroke('rgba(76,100,91,.2)', .6);
      for (const tree of trees) {
        if (tree.x > .42 && tree.x < .69) continue;
        const y = ridgeY(6, tree.x, time) + h * .045;
        pine(tree.x * w, y, tree.size * unit, tree.bend);
      }
      const hx = w * .315, hy = ridgeY(5, .315, time) + h * .035, hs = unit * .024;
      ctx.fillStyle = '#7d8171'; ctx.fillRect(hx, hy - hs * .5, hs * 1.5, hs * .65);
      ctx.beginPath(); ctx.moveTo(hx - hs * .25, hy - hs * .5); ctx.lineTo(hx + hs * .65, hy - hs); ctx.lineTo(hx + hs * 1.8, hy - hs * .5); stroke('#424d47', 2);
      ctx.fillStyle = '#e2bd76'; ctx.fillRect(hx + hs * .45, hy - hs * .32, hs * .18, hs * .2);
      const phase = eventPhase(time, 165, 35, 60);
      if (phase >= 0) for (const b of birds) {
        const x = w * (-.15 + phase * 1.35 + b.x), y = h * (.23 + b.y + .024 * Math.sin(phase * 4));
        const wing = Math.sin(time * 4 + b.phase) * unit * .004;
        ctx.beginPath(); ctx.moveTo(x - unit * .005, y - wing); ctx.quadraticCurveTo(x - 2, y - 2, x, y); ctx.quadraticCurveTo(x + 2, y - 2, x + unit * .005, y - wing); stroke('rgba(45,58,52,.65)', 1);
      }
      ctx.fillStyle = ctx.createPattern(paper, 'repeat'); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(139,63,45,.65)'; ctx.fillRect(w * .942, h * .09, unit * .014, unit * .026);
    },
  };
}
