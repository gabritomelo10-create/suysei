// Pincel sumi-ê: cada pincelada é um feixe de cerdas que percorre uma linha central.
// As cerdas perdem tinta ao longo do caminho e falham (pincel seco), como no nanquim de verdade.
// makeStroke() calcula a pincelada uma vez; drawStroke() desenha até qualquer ponto (0–1),
// o que permite animar pelo tempo ou pelo scroll, para frente e para trás.

// gerador pseudoaleatório com semente, para a mesma pincelada sair igual sempre
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// pts: [{x, y, w}] linha central já amostrada (w = largura do pincel naquele ponto)
export function makeStroke(pts, { bristles = 34, seed = 7, dry = .5, ink = 1, thin = .09 } = {}) {
  const R = rng(seed);
  const n = pts.length;
  // normais da linha central
  const nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    nx[i] = -dy / l; ny[i] = dx / l;
  }
  const out = [];
  for (let k = 0; k < bristles; k++) {
    const o = (k / (bristles - 1) - .5) * (.9 + R() * .2);       // posição da cerda no pincel
    const edge = Math.abs(o) * 2;                                  // cerdas da borda secam antes
    const lw = .5 + R() * 1.2;                                     // espessura relativa
    let inkLeft = ink * (.75 + R() * .25);
    const dep = (.15 + edge * .9) * dry / n * (1 + R());           // quanto a cerda gasta por passo
    const xy = new Float32Array(n * 2); const on = new Uint8Array(n);
    let wob = 0;
    for (let i = 0; i < n; i++) {
      wob += (R() - .5) * .04; wob *= .96;
      const p = pts[i], off = (o + wob) * p.w;
      xy[i * 2] = p.x + nx[i] * off; xy[i * 2 + 1] = p.y + ny[i] * off;
      inkLeft -= dep * (.5 + R());
      // pincel seco: quando a tinta acaba, a cerda começa a falhar
      on[i] = inkLeft > .18 || R() < inkLeft * 2.2 ? 1 : 0;
    }
    out.push({ xy, on, lw, alpha: .55 + R() * .45, o });
  }
  return { bristles: out, n, pts, thin };
}

// desenha a pincelada até a fração p (0–1)
export function drawStroke(ctx, s, p = 1, color = '#111', scale = 1) {
  const last = Math.min(s.n - 1, Math.floor(p * (s.n - 1)));
  if (last < 1) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of s.bristles) {
    ctx.globalAlpha = b.alpha;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= last; i++) {
      const w = s.pts[i].w;
      if (!b.on[i]) { pen = false; continue; }
      const x = b.xy[i * 2] * scale, y = b.xy[i * 2 + 1] * scale;
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      if (i % 24 === 23) { // espessura acompanha a largura do pincel naquele trecho
        ctx.lineWidth = Math.max(.6, w * s.thin * b.lw * scale); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
      }
    }
    ctx.lineWidth = Math.max(.6, s.pts[last].w * s.thin * b.lw * scale);
    ctx.stroke();
  }
  ctx.restore();
}

// ponta do pincel em p (para desenhar a cabeça do cometa ou a ponta molhada)
export function tipAt(s, p) {
  const i = Math.min(s.n - 1, Math.max(0, Math.floor(p * (s.n - 1))));
  return s.pts[i];
}

// amostra uma curva paramétrica f(t) -> {x, y} com largura width(t)
export function sample(f, width, steps = 400) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps; const q = f(t); pts.push({ x: q.x, y: q.y, w: width(t) }); }
  return pts;
}

// perfil de pincelada: entra rápido, engrossa, afina no final (cauda seca)
export const taper = (t, a = .08, b = .35) => Math.min(1, t / a) * (t > 1 - b ? Math.pow((1 - t) / b, .7) : 1);
