// Hero: atmosfera em WebGL atrás da pintura — fundo com luz que segue o mouse e bokeh (profundidade de campo).
import * as THREE from 'three';

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


export function initAtmosphere(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const PR = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(PR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, 0, 8);
  const bg = background();
  scene.add(bg);
  const dust = bokeh(window.innerWidth < 700 ? 140 : 260, 20);
  scene.add(dust);

  const state = { mx: 0, my: 0, tx: 0, ty: 0, visible: true };
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    state.tx = x * 2 - 1; state.ty = y * 2 - 1;
    bg.material.uniforms.uMouse.value.set(x, 1 - y);
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    bg.material.uniforms.uAspect.value = w / h;
    dust.material.uniforms.uPR.value = PR;
  }
  new ResizeObserver(resize).observe(canvas); resize();
  new IntersectionObserver(([en]) => { state.visible = en.isIntersecting; }, { threshold: 0 }).observe(canvas);

  const clock = new THREE.Clock();
  let t = 0;
  (function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!state.visible) return;
    t += dt;
    state.mx += (state.tx - state.mx) * .05; state.my += (state.ty - state.my) * .05;
    bg.material.uniforms.uTime.value = t;
    dust.material.uniforms.uTime.value = t;
    dust.rotation.y = state.mx * .08; dust.rotation.x = state.my * .05;
    camera.position.x += (state.mx * .45 - camera.position.x) * .04;
    camera.position.y += (-state.my * .3 - camera.position.y) * .04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  })();
}
