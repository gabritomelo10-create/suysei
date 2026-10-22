// Palcos 3D por categoria de aplicação. Cada palco recebe uma lista de objetos (fábricas abaixo),
// gira com o mouse/toque e cada objeto reage ao clique (abrir, virar, balançar...).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import P from './brand-paths.js';

const RED = '#bc1621';
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

let assetsP = null;
const assets = () => (assetsP ||= Promise.all([
  'assets/img/brand/koi-mask.png', 'assets/img/brand/koi-left.png', 'assets/img/brand/koi-right.png', 'assets/img/brand/pattern.webp', 'assets/img/mockups/tampa.webp',
].map(loadImg)).then(([koi, koiL, koiR, pattern, tampa]) => ({
  koi, koiL, koiR, pattern, tampa,
  koiRed: tinted(koi, RED), koiWhite: tinted(koi, '#fff'),
})));

function tinted(img, color) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function drawPath(ctx, d, vbw, x, y, w, color) {
  const s = w / vbw; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.fill(new Path2D(d), 'evenodd'); ctx.restore();
}
function drawWord(ctx, x, y, w, color) { P.suysei.letters.forEach((d) => drawPath(ctx, d, P.suysei.w, x, y, w, color)); }
// assinatura centralizada com as proporções do guia (largura = largura do wordmark)
function drawCentral(A, ctx, cx, cy, W, ink = '#fff', koi = A.koiRed) {
  const H = W * 531 / 579, x0 = cx - W / 2, y0 = cy - H / 2;
  const kw = W * .832 / .961; // a ilustração ocupa 96% da imagem
  ctx.drawImage(koi, x0 + W * .0842 - kw * .0192, y0 - H * .0279 - kw * .0308, kw, kw);
  drawWord(ctx, x0, y0 + H * .2655, W, ink);
  drawPath(ctx, P.kanji.d, P.kanji.w, x0 + W * .1883, y0 + H * .7928, W * .6252, ink);
  drawPath(ctx, P.casa.d, P.casa.w, x0 + W * .1416, y0 + H * .9623, W * .7168, ink);
}
// pattern oficial em tom sobre tom
function drawPattern(A, ctx, w, h, color, scale = 1, alpha = 1) {
  const t = tinted(A.pattern, color), tw = 900 * scale, th = tw * A.pattern.height / A.pattern.width;
  ctx.save(); ctx.globalAlpha = alpha;
  for (let y = 0; y < h; y += th) for (let x = 0; x < w; x += tw) ctx.drawImage(t, x, y, tw, th);
  ctx.restore();
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const black = (r = .55) => new THREE.MeshPhysicalMaterial({ color: '#111', roughness: r, clearcoat: .25, clearcoatRoughness: .5 });
const texMat = (map, r = .5, extra = {}) => new THREE.MeshPhysicalMaterial({ map, roughness: r, clearcoat: .2, clearcoatRoughness: .4, ...extra });

/* ===================== OBJETOS ===================== */
export const OBJECTS = {
  // ---------- Embalagens: caixa presente de 2 andares ----------
  caixa(A) {
    const g = new THREE.Group();
    const W = 3, D = 2.1, H = .62;
    const side = canvasTex(1536, 318, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#1d1d1d', .5); x.fillStyle = '#8a6e52'; x.beginPath(); x.arc(w / 2, h / 2, 24, 0, 7); x.fill(); });
    const end = canvasTex(1076, 318, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.drawImage(A.koiRed, w * .5, -h * .9, h * 2.4, h * 2.4); });
    const inside = canvasTex(1536, 1076, (x, w, h) => {
      const gr = x.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * .7); gr.addColorStop(0, '#d32330'); gr.addColorStop(1, '#7d0d15');
      x.fillStyle = gr; x.fillRect(0, 0, w, h); x.drawImage(A.koiWhite, w / 2 - h * .4, h * .1, h * .8, h * .8);
    });
    const drawer = (y, top) => { const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [texMat(end), texMat(end), top ? texMat(inside, .7) : black(), black(), texMat(side), texMat(side)]); m.position.y = y; return m; };
    g.add(drawer(H / 2, false), drawer(H * 1.5 + .01, true));
    const lid = new THREE.Group();
    const tt = new THREE.CanvasTexture(A.tampa); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 8;
    lid.add(new THREE.Mesh(new THREE.BoxGeometry(W + .06, .3, D + .06), [black(), black(), texMat(tt, .62), black(), black(), black()]));
    lid.position.y = H * 2 + .16; g.add(lid);
    g.userData = { name: 'Caixa presente', tip: 'Clique para abrir a tampa', target: .8, open: false,
      action() { this.open = !this.open; gsap.to(lid.position, { y: this.open ? H * 2 + 1.25 : H * 2 + .16, z: this.open ? -.9 : 0, duration: 1.1, ease: 'expo.inOut' }); gsap.to(lid.rotation, { x: this.open ? -.85 : 0, duration: 1.1, ease: 'expo.inOut' }); } };
    return g;
  },

  // ---------- Embalagens: sacola preta take away (como no mockup) ----------
  sacola(A) {
    const g = new THREE.Group();
    const W = 2.5, H = 2.1, D = 1.2;
    const paper = (map) => new THREE.MeshPhysicalMaterial({ map, roughness: .82, sheen: .35, sheenColor: new THREE.Color('#3a3a3a') });
    const front = canvasTex(1250, 1050, (x, w, h) => {
      x.fillStyle = '#121212'; x.fillRect(0, 0, w, h);
      drawPattern(A, x, w, h, '#232323', .7);
      // área de proteção da assinatura
      const rg = x.createRadialGradient(w / 2, h * .52, 10, w / 2, h * .52, w * .42); rg.addColorStop(0, 'rgba(18,18,18,1)'); rg.addColorStop(.7, 'rgba(18,18,18,.95)'); rg.addColorStop(1, 'rgba(18,18,18,0)');
      x.fillStyle = rg; x.fillRect(0, 0, w, h);
      drawCentral(A, x, w / 2, h * .53, w * .56, '#f1ede6');
    });
    const sideT = canvasTex(600, 1050, (x, w, h) => { x.fillStyle = '#121212'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#232323', .7); x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 5; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke(); });
    const inside = new THREE.MeshStandardMaterial({ color: '#070707', roughness: 1, side: THREE.BackSide });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [paper(sideT), paper(sideT), new THREE.MeshBasicMaterial({ visible: false }), black(.8), paper(front), paper(front)]);
    body.position.y = H / 2; g.add(body);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(W - .02, H - .02, D - .02), inside); inner.position.y = H / 2; g.add(inner);
    // alça de papel torcido, preta
    const rope = new THREE.MeshStandardMaterial({ color: '#141414', roughness: .7 });
    [D / 2 - .03, -D / 2 + .03].forEach((z) => {
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-.55, H - .2, z), new THREE.Vector3(-.5, H + .5, z), new THREE.Vector3(0, H + .82, z), new THREE.Vector3(.5, H + .5, z), new THREE.Vector3(.55, H - .2, z)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, .045, 10), rope));
    });
    g.userData = { name: 'Sacola take away', tip: 'Clique para balançar a sacola', target: 1.3,
      action() { gsap.fromTo(g.rotation, { z: 0 }, { keyframes: [{ z: .1 }, { z: -.08 }, { z: .04 }, { z: 0 }], duration: 1.6, ease: 'sine.inOut' }); } };
    return g;
  },

  // ---------- Embalagens: bowl yakisoba / poke ----------
  bowl(A) {
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(.55 + Math.sin(t * Math.PI / 2) * .85, t * .95)); }
    const outer = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), new THREE.MeshPhysicalMaterial({ color: '#0f0f0f', roughness: .3, clearcoat: 1, clearcoatRoughness: .1 }));
    const innerM = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.x - .04, p.y + .02)), 96), new THREE.MeshPhysicalMaterial({ color: RED, roughness: .25, clearcoat: 1, side: THREE.BackSide }));
    const band = canvasTex(2048, 220, (x, w, h) => {
      x.fillStyle = '#111'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#262626', .35);
      for (let k = 0; k < 3; k++) drawCentral(A, x, k * w / 3 + w / 6, h / 2, h * .95, '#f1ede6');
    });
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.33, 1.06, .34, 96, 1, true), new THREE.MeshStandardMaterial({ map: band, roughness: .8, side: THREE.DoubleSide }));
    sleeve.position.y = .42;
    const rice = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: .95 }));
    rice.rotation.x = -Math.PI / 2; rice.position.y = .78;
    const food = new THREE.Group();
    const salmon = new THREE.MeshPhysicalMaterial({ color: '#f07a4c', roughness: .35, clearcoat: .6, sheen: .5 }), green = new THREE.MeshStandardMaterial({ color: '#4b7b2f', roughness: .6 });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(.24, .17, .2, 3, .05), i % 5 === 0 ? green : salmon);
      const a = (i / 16) * Math.PI * 2, r = .35 + (i % 3) * .26;
      m.position.set(Math.cos(a) * r, .86 + (i % 4) * .01, Math.sin(a) * r); m.rotation.set(i * .7, i * 1.3, i * .4); food.add(m);
    }
    const lidG = new THREE.Group();
    const lid = new THREE.Mesh(new THREE.SphereGeometry(1.42, 64, 24, 0, Math.PI * 2, 0, Math.PI * .32), new THREE.MeshPhysicalMaterial({ color: '#fff', transmission: 1, roughness: .04, thickness: .2, ior: 1.4, transparent: true }));
    lid.position.y = -.35; lid.scale.y = .85; lidG.add(lid); lidG.position.y = .55;
    g.add(outer, innerM, sleeve, rice, food, lidG);
    g.userData = { name: 'Bowl delivery', tip: 'Clique para abrir a tampa', target: .6, open: false,
      action() { this.open = !this.open; gsap.to(lidG.position, { y: this.open ? 1.9 : .55, x: this.open ? -1 : 0, duration: 1, ease: 'expo.inOut' }); gsap.to(lidG.rotation, { z: this.open ? .6 : 0, duration: 1, ease: 'expo.inOut' }); } };
    return g;
  },

  // ---------- Mesa: carta de drinks (frente e verso) ----------
  carta(A) {
    const g = new THREE.Group();
    const tl = new THREE.TextureLoader();
    const f = tl.load('assets/img/mockups/drinks-1.webp'), b = tl.load('assets/img/mockups/drinks-2.webp');
    [f, b].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
    const W = 1.36, H = W * 2637 / 1191, edge = new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: .6 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(W, H, .025), [edge, edge, edge, edge, texMat(f, .35), texMat(b, .35)]);
    card.position.y = H / 2 + .25; card.rotation.x = -.06;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .14, 48), new THREE.MeshPhysicalMaterial({ color: '#2a1a12', roughness: .4, clearcoat: .6 }));
    stand.position.y = .07; g.add(card, stand);
    g.userData = { name: 'Carta de drinks', tip: 'Clique para virar a carta', target: 1.6, action() { gsap.to(card.rotation, { y: card.rotation.y + Math.PI, duration: 1.2, ease: 'expo.inOut' }); } };
    return g;
  },

  // ---------- Mesa: porta-copos claro e escuro ----------
  portacopos(A) {
    const g = new THREE.Group();
    const face = (bg, pat, ink) => canvasTex(1024, 1024, (x, w, h) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, pat, .55);
      const rg = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * .4); rg.addColorStop(0, bg); rg.addColorStop(.75, bg); rg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = rg; x.fillRect(0, 0, w, h); drawCentral(A, x, w / 2, h / 2, w * .62, ink);
    });
    const disc = (bg, pat, ink, edgeC) => {
      const top = texMat(face(bg, pat, ink), .85);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .06, 96), [new THREE.MeshStandardMaterial({ color: edgeC, roughness: .9 }), top, top]);
      return m;
    };
    const light = disc('#ebe7df', '#d6d0c5', '#141414', '#d8d2c7'), dark = disc('#141414', '#262626', '#f1ede6', '#0c0c0c');
    light.position.set(-1.15, .03, 0); dark.position.set(1.15, .03, .2); dark.rotation.y = .4;
    // copo sobre o porta-copos escuro
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.55, .5, 1.1, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: '#fff', transmission: 1, roughness: .05, thickness: .3, ior: 1.5, side: THREE.DoubleSide }));
    const whisky = new THREE.Mesh(new THREE.CylinderGeometry(.5, .47, .55, 64), new THREE.MeshPhysicalMaterial({ color: '#c47a23', transmission: .6, roughness: .1, thickness: 1, ior: 1.33 }));
    glass.position.set(1.15, .62, .2); whisky.position.set(1.15, .35, .2);
    g.add(light, dark, glass, whisky);
    g.userData = { name: 'Porta-copos', tip: 'Clique para girar os porta-copos', target: .4, cam: [0, 3.6, 4.4],
      action() { gsap.to(light.rotation, { x: light.rotation.x + Math.PI * 2, duration: 1.2, ease: 'expo.inOut' }); gsap.to(light.position, { keyframes: [{ y: 1.2 }, { y: .03 }], duration: 1.2, ease: 'power2.inOut' }); } };
    return g;
  },

  // ---------- Ambiente: noren (cortina da entrada) com vento ----------
  noren(A) {
    const g = new THREE.Group();
    const PW = 1.15, PH = 2.9, gap = .04;
    const art = document.createElement('canvas'); art.width = 1800; art.height = 1500;
    { const x = art.getContext('2d'), w = art.width, h = art.height;
      x.fillStyle = '#ebe6dc'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#d9d2c6', .9);
      x.drawImage(tinted(A.koiL, '#141414'), -w * .05, -h * .02, h * 1.0, h * 1.0);
      x.drawImage(tinted(A.koiR, RED), w * .38, h * .02, h * .95, h * .95);
      drawCentral(A, x, w * .86, h * .86, w * .16, '#141414'); }
    const panels = [];
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('canvas'); c.width = 600; c.height = 1500;
      c.getContext('2d').drawImage(art, i * 600, 0, 600, 1500, 0, 0, 600, 1500);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const geo = new THREE.PlaneGeometry(PW, PH, 18, 30);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: .95, side: THREE.DoubleSide }));
      const pivot = new THREE.Group(); pivot.position.set((i - 1) * (PW + gap), 3.4, 0); m.position.y = -PH / 2; pivot.add(m); g.add(pivot);
      m.userData.base = Float32Array.from(geo.attributes.position.array); panels.push({ m, pivot, i });
    }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 4.1, 24), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: .6 }));
    rod.rotation.z = Math.PI / 2; rod.position.y = 3.45; g.add(rod);
    let wind = .35, t = 0;
    g.userData = { name: 'Noren', tip: 'Passe o mouse para ventar · clique para atravessar', target: 1.9, cam: [0, 2.2, 7.2], open: false,
      tick(dt, hover) {
        t += dt; wind += ((hover ? 1.2 : .35) - wind) * .04;
        for (const p of panels) {
          const pos = p.m.geometry.attributes.position, b = p.m.userData.base;
          for (let k = 0; k < pos.count; k++) {
            const x = b[k * 3], y = b[k * 3 + 1], d = (PH / 2 - y) / PH;
            pos.array[k * 3 + 2] = Math.sin(t * 1.8 + x * 2 + p.i * 1.3 + y * 1.5) * .12 * wind * d * d + Math.sin(t * 3.1 + y * 4) * .03 * wind * d;
          }
          pos.needsUpdate = true; p.m.geometry.computeVertexNormals();
        }
      },
      action() { this.open = !this.open; panels.forEach((p) => { if (p.i === 1) return; gsap.to(p.pivot.rotation, { y: this.open ? (p.i - 1) * -1.1 : 0, duration: 1.2, ease: 'expo.inOut' }); }); gsap.to(panels[1].pivot.rotation, { x: this.open ? -.9 : 0, duration: 1.2, ease: 'expo.inOut' }); },
    };
    return g;
  },

  // ---------- Uniformes: avental preto no cabide ----------
  avental(A) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-.55, 2.6); s.lineTo(.55, 2.6); s.quadraticCurveTo(.62, 1.85, 1.2, 1.55); s.lineTo(1.25, -.9); s.quadraticCurveTo(0, -1.02, -1.25, -.9); s.lineTo(-1.2, 1.55); s.quadraticCurveTo(-.62, 1.85, -.55, 2.6);
    const geo = new THREE.ShapeGeometry(s, 48);
    // UV a partir do retângulo envolvente
    geo.computeBoundingBox(); const bb = geo.boundingBox, uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
    const tex = canvasTex(1000, 1400, (x, w, h) => {
      x.fillStyle = '#151515'; x.fillRect(0, 0, w, h);
      // barra com o pattern, como no mockup
      x.save(); x.beginPath(); x.rect(0, h * .78, w, h * .22); x.clip(); drawPattern(A, x, w, h, '#4a4a4a', .45); x.restore();
      // assinatura tipográfica no peito
      const cw = w * .34, cx = w / 2, y = h * .12;
      drawPath(x, P.casa.d, P.casa.w, cx - cw / 2, y, cw, '#cfcac2');
      drawWord(x, cx - cw * .52, y + cw * .07, cw * 1.04, '#e9e5de');
      drawPath(x, P.kanji.d, P.kanji.w, cx - cw * .47, y + cw * .36, cw * .94, '#cfcac2');
      x.drawImage(A.koiRed, w * .6, h * .5, w * .2, w * .2);
    });
    const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .95, side: THREE.DoubleSide }));
    const base = Float32Array.from(pos.array);
    cloth.position.y = .4; g.add(cloth);
    const strap = new THREE.MeshStandardMaterial({ color: '#151515', roughness: .9 });
    const neck = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.52, 3, 0), new THREE.Vector3(-.3, 3.55, -.05), new THREE.Vector3(.3, 3.55, -.05), new THREE.Vector3(.52, 3, 0)]), 40, .035, 8), strap);
    const ties = [-1, 1].map((sg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sg * 1.2, 1.95, 0), new THREE.Vector3(sg * 1.45, 1.4, .1), new THREE.Vector3(sg * 1.38, .7, .05)]), 30, .03, 8), strap));
    const hanger = new THREE.Mesh(new THREE.TorusGeometry(.7, .04, 12, 60, Math.PI), new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: .5 }));
    hanger.position.y = 3.55; hanger.scale.y = .35;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.12, .015, 8, 30, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: '#999', metalness: 1, roughness: .3 }));
    hook.position.y = 3.85;
    g.add(neck, ...ties, hanger, hook);
    let t = 0, swing = 0;
    g.userData = { name: 'Avental', tip: 'Clique para balançar o avental', target: 1.6, cam: [0, 2.2, 7.6],
      tick(dt) {
        t += dt;
        for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1], x = base[i * 3], d = Math.max(0, (2.6 - y) / 3.5); pos.array[i * 3 + 2] = Math.sin(t * 1.6 + x * 1.8 + y) * .05 * d + Math.sin(swing) * .25 * d * d; }
        pos.needsUpdate = true; geo.computeVertexNormals();
      },
      action() { const st = { v: 0 }; gsap.to(st, { v: 1, duration: 1.8, ease: 'none', onUpdate: () => { swing = Math.sin(st.v * Math.PI * 3) * (1 - st.v) * 1.4; } }); },
    };
    return g;
  },

  // ---------- Papelaria: envelope preto + vale-presente ----------
  envelope(A) {
    const g = new THREE.Group();
    const W = 3, H = 1.9;
    const envT = canvasTex(1500, 950, (x, w, h) => { x.fillStyle = '#121212'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#1d1d1d', .6); });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, .04), [black(), black(), black(), black(), texMat(envT, .8), texMat(envT, .8)]);
    body.position.y = H / 2;
    const flapShape = new THREE.Shape(); flapShape.moveTo(-W / 2, 0); flapShape.lineTo(W / 2, 0); flapShape.lineTo(0, -H * .62); flapShape.closePath();
    const flapT = canvasTex(1500, 600, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#1c1c1c', .6); x.drawImage(A.koiRed, w / 2 - h * .23, h * .32, h * .46, h * .46); });
    const fg = new THREE.ShapeGeometry(flapShape); fg.computeBoundingBox();
    { const bb = fg.boundingBox, uv = fg.attributes.uv, p = fg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y)); }
    const flap = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ map: flapT, roughness: .8, side: THREE.DoubleSide }));
    const flapPivot = new THREE.Group(); flapPivot.position.set(0, H, .025); flapPivot.add(flap);
    const cardFront = canvasTex(1400, 840, (x, w, h) => { x.fillStyle = '#ece8e1'; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#ddd7cc', .6); const rg = x.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .45, w * .32); rg.addColorStop(0, '#ece8e1'); rg.addColorStop(.7, '#ece8e1'); rg.addColorStop(1, 'rgba(236,232,225,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h); drawCentral(A, x, w / 2, h * .44, w * .36, '#141414'); x.fillStyle = '#141414'; x.font = '600 34px Barlow, sans-serif'; x.textAlign = 'center'; x.letterSpacing = '10px'; x.fillText('VALE-PRESENTE', w / 2, h * .9); });
    const cardBack = canvasTex(1400, 840, (x, w, h) => { x.fillStyle = RED; x.fillRect(0, 0, w, h); drawPattern(A, x, w, h, '#a3121c', .6); x.drawImage(A.koiWhite, w / 2 - h * .3, h * .2, h * .6, h * .6); });
    const card = new THREE.Mesh(new THREE.BoxGeometry(W - .2, (W - .2) * .6, .02), [black(), black(), black(), black(), texMat(cardFront, .7), texMat(cardBack, .7)]);
    card.position.set(0, H * .5, -.006);
    g.add(body, card, flapPivot);
    g.rotation.x = -.15;
    g.userData = { name: 'Envelope e vale-presente', tip: 'Clique para abrir o envelope', target: 1.2, cam: [0, 2.2, 6.2], open: false,
      action() {
        this.open = !this.open;
        const tl = gsap.timeline();
        if (this.open) tl.to(flapPivot.rotation, { x: -Math.PI * .95, duration: .8, ease: 'expo.inOut' }).to(card.position, { y: H * 1.25, z: .05, duration: 1, ease: 'expo.out' }).to(card.rotation, { y: Math.PI * 2, duration: 1.4, ease: 'expo.inOut' }, '-=.4');
        else tl.to(card.rotation, { y: 0, duration: .6 }).to(card.position, { y: H * .5, z: -.006, duration: .8, ease: 'expo.inOut' }).to(flapPivot.rotation, { x: 0, duration: .7, ease: 'expo.inOut' });
      } };
    return g;
  },
};

/* ===================== PALCO ===================== */
export async function createStage(canvas, names, ui = {}) {
  const A = await assets();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), .04).texture;
  scene.environmentIntensity = .7;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, enableZoom: false, enablePan: false, autoRotate: true, autoRotateSpeed: .7, minPolarAngle: .35, maxPolarAngle: 1.5 });
  const key = new THREE.DirectionalLight('#fff3e6', 1.8); key.position.set(3, 7, 4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0005;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: 1, far: 24 });
  scene.add(key);
  const rim = new THREE.PointLight('#ff2a37', 26, 14, 2); rim.position.set(-3.5, 2.5, -3); scene.add(rim);
  const fill = new THREE.PointLight('#e8cd8f', 10, 12, 2); fill.position.set(3, 1.5, 3.5); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.ShadowMaterial({ opacity: .45 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const objs = names.map((n) => { const o = OBJECTS[n](A); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); o.visible = false; scene.add(o); return o; });
  let active = null;
  function show(i, instant = false) {
    const next = objs[i]; if (!next || next === active) return;
    const prev = active; active = next;
    if (prev) gsap.to(prev.scale, { x: .001, y: .001, z: .001, duration: .45, ease: 'expo.in', onComplete: () => { prev.visible = false; prev.scale.set(1, 1, 1); } });
    next.visible = true;
    if (!instant) { next.scale.set(.001, .001, .001); next.rotation.y = -1; gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: 1.1, delay: prev ? .4 : 0, ease: 'elastic.out(1,.75)' }); gsap.to(next.rotation, { y: 0, duration: 1.4, delay: prev ? .4 : 0, ease: 'expo.out' }); }
    const c = next.userData.cam || [4.6, 3.2, 6.4];
    gsap.to(camera.position, { x: c[0], y: c[1], z: c[2], duration: instant ? 0 : 1.2, ease: 'expo.inOut' });
    gsap.to(controls.target, { x: 0, y: next.userData.target ?? .8, z: 0, duration: instant ? 0 : 1.2, ease: 'expo.inOut' });
    if (ui.tip) ui.tip.textContent = next.userData.tip;
  }
  const c0 = objs[0].userData.cam || [4.6, 3.2, 6.4]; camera.position.set(...c0); controls.target.set(0, objs[0].userData.target ?? .8, 0);
  show(0, true);

  // clique no objeto = ação; passar o mouse = "hover" (vento no noren)
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(); let downAt = 0, downX = 0, hover = false;
  const hit = (e) => { const r = canvas.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); return ray.intersectObject(active, true).length > 0; };
  canvas.addEventListener('pointerdown', (e) => { downAt = performance.now(); downX = e.clientX; });
  canvas.addEventListener('pointerup', (e) => { if (performance.now() - downAt < 300 && Math.abs(e.clientX - downX) < 6 && hit(e)) active.userData.action?.(); });
  canvas.addEventListener('pointermove', (e) => { hover = hit(e); canvas.style.cursor = hover ? 'pointer' : ''; });
  canvas.addEventListener('pointerleave', () => { hover = false; });
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  controls.addEventListener('end', () => { setTimeout(() => { controls.autoRotate = true; }, 2500); });

  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 46 : 32; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();
  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  const clock = new THREE.Clock();
  (function loop() { requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), .05); if (!visible) return; active.userData.tick?.(dt, hover); controls.update(); renderer.render(scene, camera); })();
  return { show };
}
