// Conceito central: paisagem sumi-ê em camadas de paralaxe, pintada em canvas no carregamento.
// O scroll conduz a câmera: o cometa cruza o céu, a câmera desce até a cachoeira, a carpa sobe contra a
// correnteza e, no alto, o sol vermelho se transforma no símbolo das carpas.
import { makeStroke, drawStroke, sample, taper, rng } from './sumi.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => x * x * (3 - 2 * x);
const INK = '17,17,17';

function layerCanvas(W, WH) {
  const c = document.createElement('canvas'), pr = Math.min(devicePixelRatio || 1, 1.5);
  c.width = W * pr; c.height = WH * pr; c.style.width = W + 'px'; c.style.height = WH + 'px';
  const x = c.getContext('2d'); x.setTransform(pr, 0, 0, pr, 0, 0);
  return [c, x];
}
// silhueta de serra em aguada: tinta concentrada na crista que se dissolve para baixo
function range(x, W, WH, base, amp, seed, alpha, fade) {
  const R = rng(seed), k = [R() * 6, R() * 6, R() * 6];
  const ridge = (t) => base - amp * (.55 * Math.sin(t * 5.1 + k[0]) * .5 + .5 * Math.abs(Math.sin(t * 2.3 + k[1])) + .18 * Math.sin(t * 13 + k[2]));
  x.beginPath(); x.moveTo(0, WH);
  for (let i = 0; i <= 120; i++) { const t = i / 120; x.lineTo(t * W, ridge(t) * WH); }
  x.lineTo(W, WH); x.closePath();
  const g = x.createLinearGradient(0, (base - amp) * WH, 0, (base + fade) * WH);
  g.addColorStop(0, `rgba(${INK},${alpha})`); g.addColorStop(.5, `rgba(${INK},${alpha * .45})`); g.addColorStop(1, `rgba(${INK},0)`);
  x.fillStyle = g; x.fill();
  // crista em pincel seco
  const pts = sample((t) => ({ x: t * W, y: ridge(t) * WH }), (t) => 10 * taper(t, .05, .2), 260);
  drawStroke(x, makeStroke(pts, { bristles: 16, seed, dry: .9, thin: .14 }), 1, `rgba(${INK},${Math.min(1, alpha * 2)})`);
}
function cliff(x, W, WH, side, seed) {
  const R = rng(seed);
  const x0 = side < 0 ? 0 : .5 * W, x1 = side < 0 ? .42 * W : W, top = side < 0 ? .36 : .33;
  // massa da rocha
  x.beginPath();
  x.moveTo(x0, WH);
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, xx = x0 + (x1 - x0) * t;
    const edge = side < 0 ? t : 1 - t; // perto da cachoeira a rocha sobe
    x.lineTo(xx, (top + (1 - edge) * .14 + Math.sin(t * 17 + seed) * .012 + R() * .008) * WH);
  }
  x.lineTo(x1, WH); x.closePath();
  const g = x.createLinearGradient(0, top * WH, 0, WH);
  g.addColorStop(0, `rgba(${INK},.78)`); g.addColorStop(.6, `rgba(${INK},.55)`); g.addColorStop(1, `rgba(${INK},.3)`);
  x.fillStyle = g; x.fill();
  // textura vertical da rocha (cun, o traço de pedra do sumi-ê)
  for (let i = 0; i < 26; i++) {
    const xx = x0 + (x1 - x0) * R(), y0 = (top + .05 + R() * .4) * WH, L = (.08 + R() * .2) * WH;
    const pts = sample((t) => ({ x: xx + Math.sin(t * 3 + i) * 10, y: y0 + t * L }), (t) => 8 * taper(t, .1, .5), 60);
    drawStroke(x, makeStroke(pts, { bristles: 10, seed: seed + i, dry: 1.2, thin: .2 }), 1, `rgba(${INK},.5)`);
  }
  // pinheiros na borda
  for (let i = 0; i < 3; i++) {
    const px = side < 0 ? (.1 + i * .1) * W : (.62 + i * .12) * W, py = (top + (side < 0 ? .1 - i * .03 : .03 + i * .03)) * WH;
    for (let b = 0; b < 4; b++) {
      const y = py - b * 18, w = 70 - b * 14;
      const pts = sample((t) => ({ x: px - w / 2 + t * w, y: y + Math.sin(t * Math.PI) * -6 }), (t) => 9 * taper(t, .2, .4), 30);
      drawStroke(x, makeStroke(pts, { bristles: 10, seed: seed * 7 + i * 4 + b, dry: .8, thin: .25 }), 1, `rgba(${INK},.85)`);
    }
  }
}
function water(x, W, WH, seed) {
  // ondas da poça aos pés da cachoeira
  const R = rng(seed);
  for (let i = 0; i < 9; i++) {
    const y = (.9 + i * .012) * WH, x0 = (.22 + R() * .1) * W, L = (.25 + R() * .3) * W;
    const pts = sample((t) => ({ x: x0 + t * L, y: y + Math.sin(t * 9 + i) * 3 }), (t) => 6 * taper(t, .2, .4), 80);
    drawStroke(x, makeStroke(pts, { bristles: 8, seed: seed + i, dry: .9, thin: .25 }), 1, `rgba(${INK},.45)`);
  }
}
function sun(x, cx, cy, r, seed) {
  x.fillStyle = '#bc1621'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  // borda seca: o papel aparece nas falhas do pincel
  x.globalCompositeOperation = 'destination-out';
  const pts = sample((t) => ({ x: cx + Math.cos(t * Math.PI * 2) * r, y: cy + Math.sin(t * Math.PI * 2) * r }), () => r * .16, 300);
  drawStroke(x, makeStroke(pts, { bristles: 22, seed, dry: 2.4, thin: .08, ink: .6 }), 1, '#000');
  x.globalCompositeOperation = 'source-over';
}

export function initConcept(root) {
  const layers = {};
  const make = (name, depth, z) => { const d = document.createElement('div'); d.className = `cs cs--${name}`; d.style.zIndex = z; root.appendChild(d); layers[name] = { el: d, depth }; return d; };
  ['sky', 'far', 'mid', 'cliffs', 'fall', 'koi', 'emblem', 'comet', 'mist', 'fg'].forEach((n, i) => make(n, { sky: .35, far: .5, mid: .72, cliffs: 1, fall: 1, koi: 1, emblem: .35, comet: .35, mist: 1.1, fg: 1.35 }[n], i));
  layers.fall.el.innerHTML = '<i></i><i></i><i></i>';
  layers.koi.el.innerHTML = '<b></b>';
  layers.emblem.el.innerHTML = '<b></b>';
  layers.comet.el.innerHTML = '<span class="cs__tail"></span><span class="cs__head"></span>';
  layers.mist.el.innerHTML = '<i></i><i></i><i></i>';

  let W = 0, H = 0, WH = 0, sunGeo = null;
  function paint() {
    W = root.clientWidth; H = root.clientHeight; WH = Math.round(H * 1.7);
    const narrow = W < 760;
    for (const n of ['sky', 'far', 'mid', 'cliffs']) { layers[n].el.querySelector('canvas')?.remove(); layers[n].el.style.height = WH + 'px'; }
    const sr = Math.min(W, H) * (narrow ? .2 : .16);
    sunGeo = { x: W * (narrow ? .62 : .68), y: WH * .15, r: sr };
    let [c, x] = layerCanvas(W, WH); sun(x, sunGeo.x, sunGeo.y, sr, 3); layers.sky.el.appendChild(c);
    [c, x] = layerCanvas(W, WH); range(x, W, WH, .4, .16, 11, .16, .3); range(x, W, WH, .47, .1, 17, .22, .25); layers.far.el.appendChild(c);
    [c, x] = layerCanvas(W, WH); range(x, W, WH, .6, .13, 23, .36, .2); layers.mid.el.appendChild(c);
    [c, x] = layerCanvas(W, WH); cliff(x, W, WH, -1, 31); cliff(x, W, WH, 1, 37); water(x, W, WH, 41); layers.cliffs.el.appendChild(c);
    Object.assign(layers.fall.el.style, { left: W * .42 + 'px', width: W * .08 + 'px', top: WH * .36 + 'px', height: WH * .56 + 'px' });
    Object.assign(layers.emblem.el.style, { left: sunGeo.x - sr * 1.06 + 'px', top: sunGeo.y - sr * 1.06 + 'px', width: sr * 2.12 + 'px', height: sr * 2.12 + 'px' });
    layers.koi.el.style.width = Math.min(W * (narrow ? .34 : .2), 280) + 'px';
    update(state.p, true);
  }
  const state = { p: 0, mx: 0, my: 0 };
  function update(p) {
    state.p = p;
    if (!W) return;
    // câmera: céu → base da cachoeira → acompanha a subida → céu
    const down = smooth(clamp01((p - .26) / .16)), up = smooth(clamp01((p - .5) / .34));
    const camY = (WH - H) * (down - up * .92);
    for (const n in layers) {
      const L = layers[n];
      L.el.style.transform = `translate3d(${-state.mx * 18 * L.depth}px, ${-camY * L.depth + (L.depth - 1) * -40}px, 0)`;
    }
    // cometa: cruza o céu no começo
    const cp = clamp01(p / .26);
    const comet = layers.comet.el;
    comet.style.opacity = cp > 0 && cp < 1 ? 1 : 0;
    comet.style.setProperty('--cx', `${-.2 * W + cp * 1.3 * W}px`);
    comet.style.setProperty('--cy', `${WH * .04 + cp * WH * .12}px`);
    // carpa sobe a cachoeira e salta para o sol
    const climb = smooth(clamp01((p - .44) / .38)), leap = smooth(clamp01((p - .82) / .08));
    const ky = WH * (.88 - climb * .5), kx = W * .46;
    const tx = sunGeo.x, ty = sunGeo.y;
    const k = layers.koi.el;
    k.style.left = (kx + (tx - kx) * leap) + 'px'; k.style.top = (ky + (ty - ky) * leap) + 'px';
    k.style.opacity = (p > .4 ? 1 : 0) * (1 - leap);
    k.style.setProperty('--wiggle', `${Math.sin(p * 90) * 6}deg`);
    // o sol vira o símbolo das carpas
    const morph = smooth(clamp01((p - .86) / .08));
    layers.emblem.el.style.opacity = morph;
    layers.sky.el.style.setProperty('--sun', 1 - morph);
    root.dispatchEvent(new CustomEvent('scene', { detail: { line: p < .3 ? 0 : p < .84 ? 1 : 2 } }));
  }
  new ResizeObserver(() => paint()).observe(root);
  root.parentElement.addEventListener('pointermove', (e) => { state.mx = e.clientX / innerWidth - .5; update(state.p); });
  return { setProgress: update };
}
