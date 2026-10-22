// A lenda da carpa: paisagem noturna em sumi-ê, em camadas de paralaxe, pintada em canvas no carregamento.
// O scroll conduz a carpa vermelha: ela nada no lago, sobe a cachoeira contra a correnteza e, no alto,
// salta e se contorce até virar a carpa do logotipo; a segunda carpa completa o símbolo e o cometa o circunda.
import { makeStroke, drawStroke, sample, taper, rng } from './sumi.js';
import { KoiSwim } from './koi-swim.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
const SPAN = 2.4; // altura extra do mundo, em telas, para a camada de profundidade 1

// capítulos: início de cada um (fração do scroll)
export const CHAPTERS = [0, .2, .44, .64, .8];

function layer(root, name, depth, z) {
  const el = document.createElement('div');
  el.className = `ls ls--${name}`; el.style.zIndex = z;
  root.appendChild(el);
  return { el, depth, canvas: null };
}
function paintCanvas(L, W, H) {
  const Lh = Math.round(H * (1 + SPAN * L.depth));
  L.el.style.height = Lh + 'px';
  L.canvas?.remove();
  const c = document.createElement('canvas'), pr = Math.min(devicePixelRatio || 1, 1.25);
  c.width = W * pr; c.height = Lh * pr; c.style.width = W + 'px'; c.style.height = Lh + 'px';
  L.el.prepend(c); L.canvas = c; L.Lh = Lh;
  const x = c.getContext('2d'); x.setTransform(pr, 0, 0, pr, 0, 0);
  return [x, Lh];
}
// serra em aguada clara sobre o escuro (névoa iluminada pela lua)
function ridge(x, W, y0, amp, seed, col, a, fadeH) {
  const R = rng(seed), k = [R() * 6, R() * 6, R() * 6];
  const f = (t) => y0 - amp * (.5 * Math.abs(Math.sin(t * 2.6 + k[0])) + .35 * Math.sin(t * 5.3 + k[1]) * .5 + .5 * .35 + .12 * Math.sin(t * 14 + k[2]));
  x.beginPath(); x.moveTo(0, y0 + fadeH);
  for (let i = 0; i <= 140; i++) { const t = i / 140; x.lineTo(t * W, f(t)); }
  x.lineTo(W, y0 + fadeH); x.closePath();
  const g = x.createLinearGradient(0, y0 - amp, 0, y0 + fadeH);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(.45, `rgba(${col},${a * .5})`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g; x.fill();
  const pts = sample((t) => ({ x: t * W, y: f(t) }), (t) => 9 * taper(t, .04, .15), 280);
  drawStroke(x, makeStroke(pts, { bristles: 16, seed, dry: .9, thin: .14 }), 1, `rgba(${col},${Math.min(1, a * 2.2)})`);
}
// pinheiro em pinceladas horizontais
function pine(x, px, py, s, seed, col) {
  const R = rng(seed);
  drawStroke(x, makeStroke(sample((t) => ({ x: px + Math.sin(t * 3) * 4 * s, y: py + t * 90 * s }), (t) => 6 * s * taper(t, .1, .2), 30), { bristles: 8, seed, dry: .6, thin: .3 }), 1, col);
  for (let b = 0; b < 5; b++) {
    const y = py + b * 16 * s, w = (34 + b * 16 + R() * 10) * s;
    drawStroke(x, makeStroke(sample((t) => ({ x: px - w / 2 + t * w, y: y + Math.sin(t * Math.PI) * -7 * s }), (t) => 10 * s * taper(t, .2, .35), 30), { bristles: 10, seed: seed + b, dry: .7, thin: .26 }), 1, col);
  }
}
// rocha: massa escura de contorno orgânico; a borda voltada para a água recebe um brilho difuso
function rock(x, edge, side, y0, y1, W, seed) {
  const N = 60, P = [];
  for (let i = 0; i <= N; i++) { const y = y0 + (y1 - y0) * i / N; P.push({ x: edge(y), y }); }
  const outer = side < 0 ? -40 : W + 40;
  const path = () => {
    x.beginPath(); x.moveTo(outer, y0 - 60); x.lineTo(P[0].x, P[0].y);
    for (let i = 1; i < P.length - 1; i++) { const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2; x.quadraticCurveTo(P[i].x, P[i].y, mx, my); }
    x.lineTo(P[P.length - 1].x, P[P.length - 1].y); x.lineTo(outer, y1 + 40); x.closePath();
  };
  path();
  const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#111115'); g.addColorStop(1, '#060607');
  x.fillStyle = g; x.fill();
  x.save(); path(); x.clip();
  // brilho da água na borda
  x.filter = 'blur(18px)'; x.lineWidth = 46; x.strokeStyle = 'rgba(205,212,228,.13)';
  x.beginPath(); P.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.stroke();
  x.filter = 'none';
  // textura de pedra (cun): pinceladas verticais curtas e discretas
  const R = rng(seed);
  for (let i = 0; i < 26; i++) {
    const yy = y0 + R() * (y1 - y0), ex = edge(yy), cx = ex + side * (20 + R() * W * .18), L = 50 + R() * 140;
    drawStroke(x, makeStroke(sample((t) => ({ x: cx + Math.sin(t * 2 + i) * 6, y: yy + t * L }), (t) => 6 * taper(t, .1, .5), 40), { bristles: 8, seed: seed + i, dry: 1.3, thin: .22 }), 1, 'rgba(170,175,190,.07)');
  }
  x.restore();
}

export function initLegendScene(root) {
  const scene = root.querySelector('.lscene');
  const L = {
    sky: layer(scene, 'sky', .18, 1),
    far: layer(scene, 'far', .32, 2),
    mid: layer(scene, 'mid', .55, 3),
    main: layer(scene, 'main', 1, 5),
    mist: layer(scene, 'mist', 1.15, 6),
    fg: layer(scene, 'fg', 1.6, 8),
  };
  // elementos animados presos às camadas
  L.main.el.insertAdjacentHTML('beforeend', '<div class="ls__fall"></div><div class="ls__foam"></div><div class="ls__pool"><i></i><i></i><i></i><i></i></div><div class="ls__ripples"><b></b><b></b><b></b></div>');
  L.mist.el.insertAdjacentHTML('beforeend', '<i></i><i></i><i></i><i></i>');
  const fx = document.createElement('div'); fx.className = 'ls__fx'; scene.appendChild(fx);
  fx.innerHTML = '<span class="ls__comet"><i></i></span><div class="ls__symbol"><span class="ls__halo"></span><span class="ls__left"></span><canvas class="ls__orbit"></canvas></div><canvas class="ls__fish"></canvas>';
  const fish = new KoiSwim(fx.querySelector('.ls__fish'));
  const comet = fx.querySelector('.ls__comet'), symbol = fx.querySelector('.ls__symbol'), orbit = fx.querySelector('.ls__orbit');
  const fall = L.main.el.querySelector('.ls__fall'), foam = L.main.el.querySelector('.ls__foam'), pool = L.main.el.querySelector('.ls__pool'), ripples = L.main.el.querySelector('.ls__ripples');

  let W = 0, H = 0, geo = {}, orbitStroke = null, octx = orbit.getContext('2d');
  function paint() {
    W = scene.clientWidth; H = scene.clientHeight; if (!W || !H) return;
    const narrow = W < 760;
    const fx0 = narrow ? .6 : .64; // centro da cachoeira (fração da largura)
    // --- céu ---
    let [x, Lh] = paintCanvas(L.sky, W, H);
    let g = x.createLinearGradient(0, 0, 0, Lh); g.addColorStop(0, '#060609'); g.addColorStop(.55, '#0d0a0c'); g.addColorStop(1, '#170a0d');
    x.fillStyle = g; x.fillRect(0, 0, W, Lh);
    const R = rng(4);
    for (let i = 0; i < W * Lh / 2600; i++) { x.fillStyle = `rgba(255,${225 + R() * 30 | 0},${215 + R() * 40 | 0},${.15 + R() * .55})`; x.beginPath(); x.arc(R() * W, R() * Lh * .7, R() * 1.3 + .2, 0, 7); x.fill(); }
    const moon = { x: W * (narrow ? .58 : fx0 + .02), y: H * (narrow ? .2 : .26), r: Math.min(W, H) * (narrow ? .2 : .17) };
    const mg = x.createRadialGradient(moon.x, moon.y, moon.r * .8, moon.x, moon.y, moon.r * 3.2); mg.addColorStop(0, 'rgba(188,22,33,.32)'); mg.addColorStop(1, 'rgba(188,22,33,0)');
    x.fillStyle = mg; x.fillRect(0, 0, W, Lh);
    x.fillStyle = '#b3141f'; x.beginPath(); x.arc(moon.x, moon.y, moon.r, 0, 7); x.fill();
    x.globalCompositeOperation = 'destination-out';
    drawStroke(x, makeStroke(sample((t) => ({ x: moon.x + Math.cos(t * 6.283) * moon.r, y: moon.y + Math.sin(t * 6.283) * moon.r }), () => moon.r * .14, 300), { bristles: 22, seed: 3, dry: 2.4, thin: .08, ink: .6 }), 1, '#000');
    x.globalCompositeOperation = 'source-over';
    geo.moon = moon;
    // --- serras distantes ---
    [x, Lh] = paintCanvas(L.far, W, H);
    ridge(x, W, H * .82, H * .2, 11, '150,160,180', .13, H * .5);
    ridge(x, W, H * .9, H * .14, 17, '150,160,180', .17, H * .4);
    // --- serras médias com pinheiros ---
    [x, Lh] = paintCanvas(L.mid, W, H);
    ridge(x, W, H * 1.05, H * .2, 23, '120,125,140', .22, H * .5);
    for (let i = 0; i < 7; i++) pine(x, W * (.06 + i * .14 + (i % 2) * .03), H * (.86 + (i % 3) * .05), .5 + (i % 2) * .2, 50 + i, 'rgba(10,10,12,.85)');
    // --- mundo principal: penhascos, cachoeira e lago ---
    [x, Lh] = paintCanvas(L.main, W, H);
    const top = H * .66, poolY = Lh - H * .3, gapL = W * (fx0 - .1), gapR = W * (fx0 + .1);
    const nz = (y, k) => Math.sin(y * .006 + k) * W * .022 + Math.sin(y * .017 + k * 2) * W * .01 + Math.sin(y * .041 + k) * W * .004;
    // parede de pedra atrás da água (esconde as camadas do fundo no vão)
    const bw = x.createLinearGradient(0, top, 0, poolY); bw.addColorStop(0, '#0c0c0f'); bw.addColorStop(1, '#08080a');
    x.fillStyle = bw; x.fillRect(gapL - W * .05, top - H * .03, gapR - gapL + W * .1, poolY - top + H * .1);
    rock(x, (y) => gapL - W * .01 + nz(y, 1.3), -1, top - H * .06, Lh + 20, W, 31);
    rock(x, (y) => gapR + W * .01 + nz(y, 4.1), 1, top - H * .09, Lh + 20, W, 37);
    // topo do penhasco: pinheiros na borda
    pine(x, gapL - W * .12, top - H * .2, 1, 61, 'rgba(6,6,8,.95)');
    pine(x, gapR + W * .1, top - H * .22, 1.2, 67, 'rgba(6,6,8,.95)');
    if (!narrow) pine(x, W * .1, top - H * .1, .8, 71, 'rgba(6,6,8,.95)');
    // lago: água escura com reflexo vermelho
    const pg = x.createLinearGradient(0, poolY, 0, Lh); pg.addColorStop(0, '#0e0c0e'); pg.addColorStop(1, '#060506');
    x.fillStyle = pg; x.fillRect(0, poolY - 6, W, Lh - poolY + 6);
    const RR = rng(77);
    for (let i = 0; i < 14; i++) {
      const y = poolY + 20 + i * (H * .02), x0 = W * (.1 + RR() * .4), Lw = W * (.2 + RR() * .4);
      drawStroke(x, makeStroke(sample((t) => ({ x: x0 + t * Lw, y: y + Math.sin(t * 8 + i) * 3 }), (t) => 5 * taper(t, .2, .4), 80), { bristles: 8, seed: 200 + i, dry: .9, thin: .25 }), 1, 'rgba(233,233,233,.14)');
    }
    // cachoeira: tile de pinceladas verticais claras, animado por CSS
    const tile = document.createElement('canvas'); tile.width = 240; tile.height = 720;
    { const tx = tile.getContext('2d'), RT = rng(12);
      for (let i = 0; i < 48; i++) {
        const xx = 10 + RT() * 220, y0 = RT() * 720, Ls = 200 + RT() * 400, w = 4 + RT() * 12, col = `rgba(235,238,245,${.06 + RT() * .22})`;
        for (const dy of [0, -720]) drawStroke(tx, makeStroke(sample((t) => ({ x: xx + Math.sin(t * 2 + i) * 3, y: y0 + dy + t * Ls }), (t) => w * taper(t, .15, .4), 60), { bristles: 7, seed: i, dry: .8, thin: .28 }), 1, col);
      } }
    fall.style.backgroundImage = `url(${tile.toDataURL()})`;
    Object.assign(fall.style, { left: gapL - W * .01 + 'px', width: gapR - gapL + W * .02 + 'px', top: top - H * .02 + 'px', height: poolY - top + H * .04 + 'px' });
    Object.assign(foam.style, { left: gapL - W * .06 + 'px', width: gapR - gapL + W * .12 + 'px', top: poolY - H * .08 + 'px', height: H * .18 + 'px' });
    Object.assign(pool.style, { left: W * (fx0 - .2) + 'px', top: poolY + H * .02 + 'px', width: W * .4 + 'px', height: H * .26 + 'px' });
    Object.assign(ripples.style, { left: W * fx0 + 'px', top: poolY + H * .03 + 'px' });
    geo.main = { Lh, top, poolY, cx: W * fx0 };
    // --- primeiro plano: folhas de bambu desfocadas nas bordas ---
    [x, Lh] = paintCanvas(L.fg, W, H);
    const RF = rng(9);
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, bx = side < 0 ? RF() * W * .14 : W - RF() * W * .14, by = RF() * Lh, a = (side < 0 ? -.6 : -2.5) + (RF() - .5) * .9, Lw = 120 + RF() * 160;
      drawStroke(x, makeStroke(sample((t) => ({ x: bx + Math.cos(a) * t * Lw, y: by + Math.sin(a) * t * Lw + Math.sin(t * 3) * 10 }), (t) => 26 * taper(t, .25, .6), 40), { bristles: 14, seed: 300 + i, dry: .4, thin: .25 }), 1, 'rgba(4,4,5,.92)');
    }
    // órbita do cometa ao redor do símbolo
    fish.resize(W, H);
    const os = symbol.offsetWidth || moon.r * 2.6, pr = Math.min(devicePixelRatio || 1, 2);
    orbit.width = orbit.height = os * pr; octx.setTransform(pr, 0, 0, pr, 0, 0);
    orbitStroke = makeStroke(sample((t) => { const a = (-90 + t * 360) * Math.PI / 180; return { x: os / 2 + Math.cos(a) * os * .46, y: os / 2 + Math.sin(a) * os * .46 }; }, (t) => os * .012 * (.4 + .6 * taper(t, .02, .1)), 360), { bristles: 12, seed: 5, dry: .5, thin: .18 });
    update(state.p, true);
  }

  const state = { p: 0, mx: 0, my: 0 };
  let last = -1;
  function update(p, force) {
    state.p = p;
    if (!W || !geo.main || (!force && Math.abs(p - last) < .0003)) return; last = p;
    const { Lh, top, poolY, cx } = geo.main;
    // carpa: nada em círculo no lago, sobe a cachoeira, chega ao topo
    const climb = smooth(seg(p, .2, .64));
    const koiY = lerp(poolY + H * .1, top - H * .02, climb);
    // câmera acompanha a carpa (ela fica um pouco abaixo do centro da tela)
    let c = 1 - (koiY - H * .58) / (Lh - H);
    c = clamp01(lerp(c, 1, seg(p, .62, .72)));
    for (const k in L) {
      const ly = L[k];
      const off = -((ly.Lh || H) - H) * (1 - c);
      ly.el.style.transform = `translate3d(${-state.mx * 26 * ly.depth}px, ${off - state.my * 14 * ly.depth}px, 0)`;
    }
    const mainOff = -(Lh - H) * (1 - c);
    const t = performance.now() / 1000, px = -state.mx * 26, py = -state.my * 14;
    const k0 = Math.min(Math.max(W * .15, 130), 230) / 1200;
    // 1. nadando em círculos no lago
    const A = fish.A, B = fish.B;
    const pcx = cx + px, pcy = poolY + H * .1 + mainOff + py, Rx = W * (W < 760 ? .2 : .11), Ry = H * .045;
    const swim = 1 - smooth(seg(p, .12, .22));
    if (swim > 0) fish.wave(fish.follow(A, (u) => ({ x: pcx + Math.cos(u) * Rx, y: pcy + Math.sin(u) * Ry }), t * .75, k0), t, .05, 1.2, 6);
    // 2. subindo a cachoeira: a cauda bate forte, a correnteza a empurra de volta
    const fight = Math.sin(t * 2.7) * .5 + Math.sin(t * 4.3) * .3;
    const hx = cx + px + Math.sin(t * 1.3) * W * .01, hy = koiY + mainOff + py + fight * H * .012 * (climb > 0 && climb < 1 ? 1 : .4);
    fish.wave(fish.line(B, hx, hy, -Math.PI / 2 + Math.sin(t * 1.9) * .08, k0), t, climb > 0 && climb < 1 ? .085 : .06, 1.25, 11);
    let pose = swim >= 1 ? A : swim > 0 ? fish.mix(B, A, swim) : B;
    // 3. no alto, salta e se contorce até a pose exata do logotipo (a cabeça chega primeiro)
    const m = geo.moon, skyOff = (L.sky.Lh - H) * -(1 - c);
    const sx = m.x + px * .18, sy = m.y + py * .18 + skyOff, ss = symbol.offsetWidth;
    Object.assign(symbol.style, { left: sx + 'px', top: sy + 'px' });
    const q = seg(p, .72, .86);
    if (q > 0) {
      const Lg = fish.logo(fish.C ||= fish.mk(), sx, sy, ss * .88 / 1200);
      const O = fish.mix(pose, Lg, (s) => smooth(clamp01(q * 1.6 - (1 - s) * .6)));
      const lift = Math.sin(smooth(q) * Math.PI) * H * .14;
      if (q < 1) for (let i = 0; i < O.y.length; i++) O.y[i] -= lift * (.4 + .6 * i / (O.y.length - 1));
      pose = O;
    }
    fish.draw(pose, 1);
    fx.style.setProperty('--glow', .5 + q * .5);
    // cometa cruza o céu
    const cp = seg(p, .6, .78);
    comet.style.opacity = cp > 0 && cp < 1 ? 1 : 0;
    comet.style.transform = `translate(${lerp(-W * .15, W * 1.1, cp)}px, ${lerp(H * .02, H * .34, cp)}px) rotate(14deg)`;
    // a carpa que desce surge, pintada de cima para baixo, e completa o símbolo
    const sym = seg(p, .84, .92);
    symbol.style.opacity = 1;
    symbol.style.setProperty('--sym', sym);
    L.sky.el.style.setProperty('--moon', 1 - seg(p, .7, .86) * .85);
    const ob = seg(p, .88, .98);
    const os = orbit.clientWidth; octx.clearRect(0, 0, os, os);
    if (ob > 0 && orbitStroke) drawStroke(octx, orbitStroke, ob, 'rgba(233,233,233,.55)');
    root.dispatchEvent(new CustomEvent('chapter', { detail: CHAPTERS.reduce((a, b, i) => (p >= b ? i : a), 0) }));
  }
  // a carpa está sempre viva enquanto a cena está na tela
  let onScreen = false;
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }).observe(root);
  (function idle() { requestAnimationFrame(idle); if (onScreen && state.p < .86 && W) { last = -1; update(state.p); } })();
  new ResizeObserver(() => paint()).observe(scene);
  root.addEventListener('pointermove', (e) => { state.mx = e.clientX / innerWidth - .5; state.my = e.clientY / innerHeight - .5; last = -1; update(state.p); });
  return { update };
}
