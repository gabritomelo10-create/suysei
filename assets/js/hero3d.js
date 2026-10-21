// Hero: símbolo das carpas extrudado em 3D, com luzes, bokeh (profundidade de campo) e o cometa em órbita.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { koiPaths } from './brand.js';

const RED = new THREE.Color('#bc1621');

function koiGeometry(d) {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${d}"/></svg>`);
  const shapes = [];
  data.paths.forEach((p) => shapes.push(...SVGLoader.createShapes(p)));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 34, bevelEnabled: true, bevelThickness: 9, bevelSize: 4.5, bevelSegments: 3, curveSegments: 6,
  });
  geo.translate(-500, -500, -17);
  geo.computeVertexNormals();
  return geo;
}

function makeMaterials(ink) {
  const common = { bumpMap: ink, bumpScale: 2.2 };
  return {
    laca: new THREE.MeshPhysicalMaterial({ ...common, color: new THREE.Color('#a30e18'), roughness: .32, metalness: .05, clearcoat: 1, clearcoatRoughness: .08, sheen: .12, sheenColor: new THREE.Color('#ff6670') }),
    ouro: new THREE.MeshPhysicalMaterial({ ...common, color: new THREE.Color('#d8b46a'), roughness: .24, metalness: 1, clearcoat: .4 }),
    nanquim: new THREE.MeshPhysicalMaterial({ ...common, color: new THREE.Color('#0b0b0b'), roughness: .78, metalness: 0, clearcoat: .2, clearcoatRoughness: .6, envMapIntensity: .35, sheen: .5, sheenColor: new THREE.Color('#5a1015') }),
    cristal: new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#ffdfe2'), roughness: .06, metalness: 0, transmission: 1, thickness: 1.2, ior: 1.5, attenuationColor: new THREE.Color('#ff3040'), attenuationDistance: 1.4, clearcoat: 1 }),
  };
}

function bokeh(count, spread) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), size = new Float32Array(count), col = new Float32Array(count * 3), ph = new Float32Array(count);
  const palette = [new THREE.Color('#ff2a37'), new THREE.Color('#c9a45c'), new THREE.Color('#ffffff'), new THREE.Color('#bc1621')];
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - .5) * spread;
    pos[i * 3 + 1] = (Math.random() - .5) * spread * .62;
    pos[i * 3 + 2] = -9 + Math.random() * 15;
    size[i] = .4 + Math.random() * 1.6;
    const c = palette[(Math.random() * palette.length) | 0];
    col.set([c.r, c.g, c.b], i * 3);
    ph[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFocus: { value: 7.6 }, uPR: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSize; attribute vec3 aColor; attribute float aPhase;
      uniform float uTime, uFocus, uPR;
      varying vec3 vColor; varying float vBlur; varying float vAlpha;
      void main(){
        vec3 p = position;
        p.y += sin(uTime*.25 + aPhase)*.25; p.x += cos(uTime*.18 + aPhase)*.2;
        vec4 mv = modelViewMatrix * vec4(p,1.);
        float depth = -mv.z;
        float blur = abs(depth - uFocus);
        vBlur = clamp(blur/5., 0., 1.);
        vAlpha = (0.85 - vBlur*.55) * (.6 + .4*sin(uTime*.8 + aPhase*3.));
        vColor = aColor;
        gl_PointSize = aSize * (8. + blur*9.) * uPR * (10. / depth);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vBlur; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - .5);
        float edge = mix(.04, .48, vBlur);
        float a = smoothstep(.5, .5 - edge, d);
        a *= mix(1., .55 + .45*smoothstep(.3,.5,d), vBlur*.7); // anel de bokeh
        gl_FragColor = vec4(vColor, a * vAlpha * .55);
      }`,
  });
  return new THREE.Points(geo, mat);
}

function background() {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: { uMouse: { value: new THREE.Vector2(.5, .5) }, uAspect: { value: 1 }, uTime: { value: 0 }, uHot: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, .9999, 1.); }',
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform vec2 uMouse; uniform float uAspect, uTime, uHot;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main(){
        vec2 a = vec2(uAspect, 1.);
        float dc = distance(vUv*a, vec2(.5)*a);
        float dm = distance(vUv*a, uMouse*a);
        vec3 col = vec3(.035, .025, .028);
        col += vec3(.5, .03, .06) * smoothstep(.8, 0., dc) * (.36 + uHot*.18);
        col += vec3(.75, .12, .1) * smoothstep(.5, 0., dm) * .2;
        col += vec3(.5, .38, .2) * smoothstep(.9, .0, distance(vUv, vec2(.15, 1.1))) * .12;
        col += (hash(vUv*vec2(1920.,1080.) + uTime) - .5) * .025;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

function comet() {
  const N = 90;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), a = new Float32Array(N);
  for (let i = 0; i < N; i++) a[i] = 1 - i / N;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(a, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPR: { value: 1 } },
    vertexShader: 'attribute float aT; uniform float uPR; varying float vT; void main(){ vT=aT; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (2. + pow(aT,3.)*26.) * uPR * (8./-mv.z); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying float vT; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); vec3 c=mix(vec3(1.,.15,.2), vec3(1.,.95,.85), pow(vT,4.)); gl_FragColor=vec4(c, a*pow(vT,1.6)); }',
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, N };
}

export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const PR = Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(PR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, 0, 8);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  const bg = background();
  scene.add(bg);

  // luzes
  scene.add(new THREE.AmbientLight('#ffffff', .15));
  const key = new THREE.DirectionalLight('#fff1e0', 1.7); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#ff4050', 3); rim.position.set(4, -2, -3); scene.add(rim);
  const gold = new THREE.PointLight('#e8cd8f', 18, 12, 2); gold.position.set(-2.5, 2.5, 2.5); scene.add(gold);
  const mouseLight = new THREE.PointLight('#ff3a46', 14, 10, 2); mouseLight.position.set(0, 0, 3); scene.add(mouseLight);

  // símbolo
  const ink = new THREE.TextureLoader().load('assets/img/brand/koi-ink.png');
  ink.wrapS = ink.wrapT = THREE.ClampToEdgeWrapping;
  ink.repeat.set(.001, -.001); ink.offset.set(0, 1);
  const materials = makeMaterials(ink);
  let current = materials.laca;

  const emblem = new THREE.Group();
  const holder = new THREE.Group(); holder.add(emblem); scene.add(holder);
  const S = .0036;
  const left = new THREE.Mesh(koiGeometry(koiPaths['koi-left']), current);
  const right = new THREE.Mesh(koiGeometry(koiPaths['koi-right']), current);
  [left, right].forEach((m) => { m.scale.set(S, -S, S); emblem.add(m); });

  // anel do cometa
  const ringMat = new THREE.MeshBasicMaterial({ color: '#c9a45c', transparent: true, opacity: .35 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, .004, 8, 220), ringMat);
  holder.add(ring);
  const c = comet(); holder.add(c.pts);
  const tmp = new THREE.Vector3();

  const dust = bokeh(window.innerWidth < 700 ? 140 : 260, 20);
  scene.add(dust);

  // pós-processamento
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .38, .6, .86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // estado / interação
  const state = {
    mx: 0, my: 0, tx: 0, ty: 0, spin: 0, vel: .0025, drag: false, lastX: 0,
    progress: 0, hover: 0, hoverT: 0, visible: true, intro: 0,
  };
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    state.tx = x * 2 - 1; state.ty = y * 2 - 1;
    bg.material.uniforms.uMouse.value.set(x, 1 - y);
    if (state.drag) { state.vel += (e.clientX - state.lastX) * .00045; state.lastX = e.clientX; }
    ndc.set(state.tx, -state.ty);
    ray.setFromCamera(ndc, camera);
    state.hoverT = ray.intersectObjects([left, right], false).length ? 1 : 0;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { state.drag = true; state.lastX = e.clientX; });
  window.addEventListener('pointerup', () => { state.drag = false; });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    bloom.setSize(w * PR * .5, h * PR * .5);
    camera.aspect = w / h;
    camera.position.z = w / h < .8 ? 8 / Math.max(.48, (w / h) * 1.15) : 8;
    camera.updateProjectionMatrix();
    bg.material.uniforms.uAspect.value = w / h;
    dust.material.uniforms.uPR.value = PR; c.pts.material.uniforms.uPR.value = PR;
  }
  new ResizeObserver(resize).observe(canvas); resize();
  new IntersectionObserver(([en]) => { state.visible = en.isIntersecting; }, { threshold: 0 }).observe(canvas);

  const clock = new THREE.Clock();
  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!state.visible) return;
    t += dt;
    state.mx += (state.tx - state.mx) * .05; state.my += (state.ty - state.my) * .05;
    state.hover += (state.hoverT - state.hover) * .08;
    state.vel *= state.drag ? .9 : .965; state.vel += .0007 * dt * 60 * (1 - state.progress);
    state.vel = Math.max(-.2, Math.min(.2, state.vel));
    state.spin += state.vel;

    const p = state.progress, iv = 1 - state.intro;
    // construção: as duas carpas chegam de lados opostos e se encaixam no círculo
    left.position.set(-p * 1.6 - iv * 3.2, -p * .4 - iv * 2.2, -iv * 3);
    right.position.set(p * 1.6 + iv * 3.2, p * .4 + iv * 2.2, -iv * 3);
    left.rotation.z = iv * 1.2 + p * .5; right.rotation.z = iv * 1.2 + p * .5;
    emblem.rotation.set(state.my * .35 + Math.sin(t * .6) * .05, state.spin * .25 + state.mx * .55, 0);
    emblem.position.y = Math.sin(t * .8) * .06;
    const sc = 1 + state.hover * .05 - p * .1; holder.scale.setScalar(sc);
    holder.position.z = -p * 2;
    holder.rotation.z = -p * .6;

    ring.rotation.set(Math.PI * .5 - .35 + state.my * .2, state.mx * .3, 0);
    ringMat.opacity = .18 + state.intro * .2 - p * .2;
    // cometa em órbita com cauda contínua
    const arr = c.pts.geometry.attributes.position.array;
    for (let i = 0; i < c.N; i++) {
      const ang = t * .9 - i * .014;
      tmp.set(Math.cos(ang) * 2.25, 0, Math.sin(ang) * 2.25).applyEuler(ring.rotation);
      arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z;
    }
    c.pts.geometry.attributes.position.needsUpdate = true;

    mouseLight.position.set(state.mx * 4, -state.my * 2.5, 2.4);
    mouseLight.intensity = 10 + state.hover * 30;
    gold.position.x = -2.5 + Math.sin(t * .4) * .8;
    bg.material.uniforms.uTime.value = t; bg.material.uniforms.uHot.value = state.hover;
    dust.material.uniforms.uTime.value = t;
    dust.rotation.y = state.mx * .08; dust.rotation.x = state.my * .05;
    camera.position.x += (state.mx * .45 - camera.position.x) * .04;
    camera.position.y += (-state.my * .3 - camera.position.y) * .04;
    camera.lookAt(0, 0, 0);
    composer.render();
  }
  frame();

  return {
    setMaterial(name) {
      const m = materials[name]; if (!m) return;
      current = m; left.material = m; right.material = m;
      bloom.strength = name === 'ouro' ? .5 : name === 'cristal' ? .6 : .38;
      state.vel += .08;
    },
    setProgress(p) { state.progress = p; },
    playIntro() {
      if (window.gsap) window.gsap.to(state, { intro: 1, duration: 2.6, ease: 'expo.out', delay: .15 });
      else state.intro = 1;
    },
  };
}
