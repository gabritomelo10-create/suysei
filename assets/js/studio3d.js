// Estúdio 3D: mockups da marca recriados como objetos interativos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import P from './brand-paths.js';

const RED = '#bc1621';
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function tinted(img, color) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function drawPath(ctx, d, vbw, x, y, w, color) {
  const s = w / vbw; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.fill(new Path2D(d), 'evenodd'); ctx.restore();
}
function drawWord(ctx, x, y, w, color) {
  P.suysei.letters.forEach((d) => drawPath(ctx, d, P.suysei.w, x, y, w, color));
  return P.suysei.h * (w / P.suysei.w);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// assinatura centralizada (koi vermelho + wordmark + kanji + casa)
function drawCentral(ctx, cx, cy, size, koiRed, color = '#fff') {
  ctx.drawImage(koiRed, cx - size * .5, cy - size * .58, size, size);
  const ww = size * 1.05;
  const wh = drawWord(ctx, cx - ww / 2, cy - size * .13, ww, color);
  const kw = size * .62;
  drawPath(ctx, P.kanji.d, P.kanji.w, cx - kw / 2, cy - size * .13 + wh + size * .14, kw, color);
  const cw = size * .56;
  drawPath(ctx, P.casa.d, P.casa.w, cx - cw / 2, cy - size * .13 + wh + size * .29, cw, color);
}

export async function initStudio(canvas, ui) {
  const [koiMask, tampaImg] = await Promise.all([loadImg('assets/img/brand/koi-mask.png'), loadImg('assets/img/mockups/tampa.webp')]);
  const koiRed = tinted(koiMask, RED), koiWhite = tinted(koiMask, '#ffffff'), koiDark = tinted(koiMask, '#1b1b1b');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const PR = Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(PR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
  scene.environmentIntensity = .7;

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(4.6, 3.2, 6.4);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false;
  controls.autoRotate = true; controls.autoRotateSpeed = .8;
  controls.minPolarAngle = .35; controls.maxPolarAngle = 1.45;
  controls.target.set(0, .8, 0);

  const key = new THREE.DirectionalLight('#fff3e6', 1.8); key.position.set(3, 7, 4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0005;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  scene.add(key);
  const redRim = new THREE.PointLight('#ff2a37', 26, 14, 2); redRim.position.set(-3.5, 2, -3); scene.add(redRim);
  const goldFill = new THREE.PointLight('#e8cd8f', 10, 12, 2); goldFill.position.set(3, 1, 3.5); scene.add(goldFill);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.ShadowMaterial({ opacity: .5 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const black = (r = .55) => new THREE.MeshPhysicalMaterial({ color: '#111', roughness: r, metalness: 0, clearcoat: .25, clearcoatRoughness: .5 });
  const texMat = (map, r = .5) => new THREE.MeshPhysicalMaterial({ map, roughness: r, clearcoat: .2, clearcoatRoughness: .4 });
  const shadowAll = (g) => g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- CAIXA PRESENTE (2 andares) ----------
  const caixa = new THREE.Group();
  {
    const W = 3, D = 2.1, H = .62;
    const sideTex = canvasTex(1536, 318, (x, w, h) => {
      x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
      drawWord(x, w * .1, h * .12, w * .8, '#1c1c1c');
      x.fillStyle = '#8a6e52'; x.beginPath(); x.ellipse(w / 2, h * .5, 26, 26, 0, 0, Math.PI * 2); x.fill();
    });
    const endTex = canvasTex(1076, 318, (x, w, h) => {
      x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
      x.drawImage(koiRed, w * .5, -h * .9, h * 2.4, h * 2.4);
    });
    const inside = canvasTex(1536, 1076, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * .7); g.addColorStop(0, '#d32330'); g.addColorStop(1, '#7d0d15');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.globalAlpha = .9; x.drawImage(koiWhite, w / 2 - h * .4, h * .1, h * .8, h * .8);
    });
    const drawer = (y, top) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
        texMat(endTex), texMat(endTex), top ? texMat(inside, .7) : black(), black(), texMat(sideTex), texMat(sideTex),
      ]);
      m.position.y = y; return m;
    };
    caixa.add(drawer(H / 2, false), drawer(H * 1.5 + .01, true));
    const lid = new THREE.Group();
    const tTex = new THREE.CanvasTexture(tampaImg); tTex.colorSpace = THREE.SRGBColorSpace; tTex.anisotropy = 8;
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(W + .06, .3, D + .06), [black(), black(), texMat(tTex, .62), black(), black(), black()]);
    lid.add(lidMesh); lid.position.y = H * 2 + .16;
    caixa.add(lid);
    caixa.userData = {
      tip: 'Clique na caixa para abrir a tampa', open: false,
      action() {
        this.open = !this.open;
        gsap.to(lid.position, { y: this.open ? H * 2 + 1.25 : H * 2 + .16, z: this.open ? -.9 : 0, duration: 1.1, ease: 'expo.inOut' });
        gsap.to(lid.rotation, { x: this.open ? -.85 : 0, duration: 1.1, ease: 'expo.inOut' });
      },
    };
  }

  // ---------- SACOLA ----------
  const sacola = new THREE.Group();
  {
    const W = 2.1, H = 2.7, D = 1;
    const front = canvasTex(1050, 1350, (x, w, h) => {
      x.fillStyle = '#121212'; x.fillRect(0, 0, w, h);
      x.globalAlpha = .07; x.drawImage(koiWhite, -w * .3, h * .45, w * 1.1, w * 1.1); x.globalAlpha = 1;
      drawCentral(x, w / 2, h * .45, w * .6, koiRed);
    });
    const side = canvasTex(500, 1350, (x, w, h) => {
      x.fillStyle = '#121212'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke();
      for (let i = 0; i < 5; i++) drawPath(x, P.kanjiChars[i].d, P.kanjiChars[i].w, w / 2 - 22, h * .3 + i * 90, 44, '#bc1621');
    });
    const paper = (map) => new THREE.MeshPhysicalMaterial({ map, roughness: .78, sheen: .3, sheenColor: new THREE.Color('#333') });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [paper(side), paper(side), new THREE.MeshStandardMaterial({ color: '#050505', roughness: 1 }), black(.8), paper(front), paper(front)]);
    body.position.y = H / 2; sacola.add(body);
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: .65 });
    [D / 2 - .02, -D / 2 + .02].forEach((z) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.42, H - .15, z), new THREE.Vector3(-.4, H + .45, z), new THREE.Vector3(0, H + .78, z),
        new THREE.Vector3(.4, H + .45, z), new THREE.Vector3(.42, H - .15, z),
      ]);
      sacola.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .03, 10), ropeMat));
    });
    sacola.userData = {
      tip: 'Clique para balançar a sacola',
      action() {
        gsap.fromTo(sacola.rotation, { z: 0 }, { keyframes: [{ z: .12 }, { z: -.09 }, { z: .05 }, { z: 0 }], duration: 1.6, ease: 'sine.inOut' });
      },
    };
  }

  // ---------- CARTA DE DRINKS ----------
  const carta = new THREE.Group();
  {
    const tl = new THREE.TextureLoader();
    const f = tl.load('assets/img/mockups/drinks-1.webp'), b = tl.load('assets/img/mockups/drinks-2.webp');
    [f, b].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
    const W = 1.36, H = W * 2637 / 1191;
    const edge = new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: .6 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(W, H, .025), [edge, edge, edge, edge, texMat(f, .35), texMat(b, .35)]);
    card.position.y = H / 2 + .25; card.rotation.x = -.06;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .14, 48), new THREE.MeshPhysicalMaterial({ color: '#2a1a12', roughness: .4, clearcoat: .6 }));
    stand.position.y = .07;
    carta.add(card, stand);
    carta.userData = {
      tip: 'Clique para virar a carta',
      action() { gsap.to(card.rotation, { y: card.rotation.y + Math.PI, duration: 1.2, ease: 'expo.inOut' }); },
    };
  }

  // ---------- BOWL ----------
  const bowl = new THREE.Group();
  {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(.55 + Math.sin(t * Math.PI / 2) * .85, t * .95)); }
    const outer = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), new THREE.MeshPhysicalMaterial({ color: '#0f0f0f', roughness: .3, clearcoat: 1, clearcoatRoughness: .1, side: THREE.FrontSide }));
    const inner = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.x - .04, p.y + .02)), 96), new THREE.MeshPhysicalMaterial({ color: RED, roughness: .25, clearcoat: 1, side: THREE.BackSide }));
    const band = canvasTex(2048, 220, (x, w, h) => {
      x.fillStyle = '#e9e9e9'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 3; k++) {
        const ox = k * w / 3 + 60;
        x.drawImage(koiRed, ox, 10, 200, 200);
        drawWord(x, ox + 230, 52, 300, '#111');
        drawPath(x, P.casa.d, P.casa.w, ox + 232, 150, 300, '#111');
      }
    });
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.33, 1.06, .34, 96, 1, true), new THREE.MeshStandardMaterial({ map: band, roughness: .8, side: THREE.DoubleSide }));
    sleeve.position.y = .42;
    const rice = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: .95 }));
    rice.rotation.x = -Math.PI / 2; rice.position.y = .78;
    const food = new THREE.Group();
    const salmon = new THREE.MeshPhysicalMaterial({ color: '#f07a4c', roughness: .35, clearcoat: .6, sheen: .5 });
    const green = new THREE.MeshStandardMaterial({ color: '#4b7b2f', roughness: .6 });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(.24, .17, .2, 3, .05), i % 5 === 0 ? green : salmon);
      const a = (i / 16) * Math.PI * 2, r = .35 + (i % 3) * .26;
      m.position.set(Math.cos(a) * r, .86 + Math.random() * .04, Math.sin(a) * r); m.rotation.set(Math.random(), Math.random() * 3, Math.random());
      food.add(m);
    }
    const lid = new THREE.Mesh(new THREE.SphereGeometry(1.42, 64, 24, 0, Math.PI * 2, 0, Math.PI * .32), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, roughness: .04, thickness: .2, ior: 1.4, transparent: true }));
    lid.position.y = -.35; lid.scale.y = .85;
    const lidG = new THREE.Group(); lidG.add(lid); lidG.position.y = .55;
    bowl.add(outer, inner, sleeve, rice, food, lidG);
    bowl.userData = {
      tip: 'Clique para abrir a tampa', open: false,
      action() {
        this.open = !this.open;
        gsap.to(lidG.position, { y: this.open ? 1.9 : .55, x: this.open ? -1 : 0, duration: 1, ease: 'expo.inOut' });
        gsap.to(lidG.rotation, { z: this.open ? .6 : 0, duration: 1, ease: 'expo.inOut' });
      },
    };
  }

  const objects = { caixa, sacola, carta, bowl };
  Object.values(objects).forEach((g) => { shadowAll(g); g.visible = false; scene.add(g); });
  let active = caixa; caixa.visible = true;

  function show(name) {
    const next = objects[name]; if (!next || next === active) return;
    const prev = active; active = next;
    gsap.to(prev.scale, { x: .001, y: .001, z: .001, duration: .5, ease: 'expo.in', onComplete: () => { prev.visible = false; prev.scale.set(1, 1, 1); } });
    next.visible = true; next.scale.set(.001, .001, .001); next.rotation.y = -1.2;
    gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: 1.1, delay: .45, ease: 'elastic.out(1, .75)' });
    gsap.to(next.rotation, { y: 0, duration: 1.4, delay: .45, ease: 'expo.out' });
    controls.target.set(0, name === 'carta' ? 1.6 : name === 'sacola' ? 1.5 : name === 'bowl' ? .6 : .8, 0);
    if (ui.tip) ui.tip.textContent = next.userData.tip;
  }

  // clique no objeto
  const ray = new THREE.Raycaster(); const v2 = new THREE.Vector2(); let downAt = 0, downX = 0;
  canvas.addEventListener('pointerdown', (e) => { downAt = performance.now(); downX = e.clientX; });
  canvas.addEventListener('pointerup', (e) => {
    if (performance.now() - downAt > 300 || Math.abs(e.clientX - downX) > 6) return;
    const r = canvas.getBoundingClientRect();
    v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    if (ray.intersectObject(active, true).length) active.userData.action();
  });
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  controls.addEventListener('end', () => { setTimeout(() => { controls.autoRotate = true; }, 2500); });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1 ? 46 : 32; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  })();

  return { show };
}
