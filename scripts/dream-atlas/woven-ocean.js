function createArtwork() {
  let phase = rand() * TAU;
  function whale(x, y, time, event) {
    if (event < 0) return 0;
    const cx = -.45 + event * 1.9, cy = .49 + .035 * Math.sin(event * TAU);
    const q = (x - cx) / .21, dy = y - cy;
    // Signed displacement makes the continuous thread wrap around an unseen body.
    // A tapered tail and two flukes are part of the same field, never a painted fish.
    const body = Math.abs(q) < 1 ? .065 * Math.sqrt(1 - q * q) * (.78 + q * .22) : 0;
    const tail = .075 * Math.exp(-(((x - cx + .215) / .027) ** 2));
    const fin = .039 * Math.exp(-(((x - cx + .015) / .034) ** 2));
    const thickness = body + tail + (dy > 0 ? fin : 0);
    const sign = dy >= 0 ? 1 : -1;
    return sign * (Math.sqrt(dy * dy + thickness * thickness) - Math.abs(dy)) * Math.exp(-Math.abs(dy) * 7) * Math.sin(Math.PI * event) ** .5;
  }
  return {
    reset() { phase = rand() * TAU; }, eventDuration: 52,
    snapshot: () => ({ continuousPaths: 1, event: eventPhase(t, 240, 52, 0) }),
    draw(time) {
      background('#040b13', '#071523');
      glow(w * .57, h * .48, unit * .7, 'rgba(21,58,80,.19)');
      const event = eventPhase(time, 240, 52, 0);
      const rows = quality === 'low' ? 74 : 106, cols = quality === 'low' ? 210 : 320;
      const margin = w * .045, width = w - margin * 2;
      ctx.beginPath();
      // One serpentine polyline; alternating row traversal preserves connectivity.
      for (let row = 0; row < rows; row++) {
        const v = row / (rows - 1), yy = .15 + Math.pow(v, 1.18) * .73;
        for (let col = 0; col <= cols; col++) {
          const u = (row % 2 ? cols - col : col) / cols;
          const edge = Math.sin(u * Math.PI) ** .65;
          const waves = Math.sin(u * 11 + yy * 16 - time * .19 + phase) * .013 + Math.sin(u * 23 - yy * 10 + time * .12) * .006;
          const vortex = Math.sin(Math.hypot((u - .7) * 1.6, yy - .58) * 47 - time * .25) * .006;
          const displaced = whale(u, yy, time, event);
          const x = margin + u * width + Math.sin(v * 8 + time * .1) * unit * .009 * edge;
          const y = h * (yy + (waves + vortex) * edge + displaced);
          if (row === 0 && col === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      const silver = ctx.createLinearGradient(0, h * .15, w * .8, h * .88);
      silver.addColorStop(0, '#6394a59c'); silver.addColorStop(.35, '#acd9e6ca'); silver.addColorStop(.68, '#d5e7eede'); silver.addColorStop(1, '#5d8da4a0');
      stroke(silver, Math.max(.55, unit / 1250));
      vignette(.62);
    },
  };
}
