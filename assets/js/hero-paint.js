// Hero: o símbolo das carpas surge como uma pintura sumi-ê sendo feita.
// Um pincel de cerdas percorre o círculo do cometa e revela cada carpa (máscara acumulada em canvas 2D);
// depois a pintura permanece e o cometa passa a orbitar ao redor dela.

const N = 1024; // resolução interna da pintura
const DEG = Math.PI / 180;
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };

// cada pincelada percorre um arco (ângulos do canvas: 0 = direita, 90 = baixo)
const STROKES = [
  { from: 262 * DEG, to: 96 * DEG, start: .7, dur: 2.5 },  // a carpa que desce: da cauda (topo) à cabeça (base)
  { from: 278 * DEG, to: 446 * DEG, start: 1.7, dur: 2.5 }, // a carpa que sobe: da cabeça (topo) à cauda (base)
];
const CIRCLE = { start: 0, dur: 1.4 };
const SETTLE = { start: 4.1, dur: .9 };
const COMET = 4.4;

export async function initPaint(canvas) {
  const [mask, ink] = await Promise.all([loadImg('assets/img/brand/koi-mask.png'), loadImg('assets/img/brand/koi-ink.png')]);

  // tinta vermelha com a textura do nanquim original
  const tinted = mk(); const tc = tinted.getContext('2d');
  tc.drawImage(mask, 0, 0, N, N);
  tc.globalCompositeOperation = 'lighter'; tc.drawImage(mask, 0, 0, N, N); // tinta mais densa
  tc.globalCompositeOperation = 'source-in';
  const g = tc.createLinearGradient(0, 0, N, N); g.addColorStop(0, '#ff3b47'); g.addColorStop(.5, '#d11a26'); g.addColorStop(1, '#9a1019');
  tc.fillStyle = g; tc.fillRect(0, 0, N, N);
  tc.globalCompositeOperation = 'multiply'; tc.globalAlpha = .22; tc.drawImage(ink, 0, 0, N, N);
  tc.globalAlpha = 1;

  const brush = mk(); const bc = brush.getContext('2d'); bc.fillStyle = '#000';
  const comp = mk(); const cc = comp.getContext('2d');
  const ctx = canvas.getContext('2d');

  const state = { t: 0, playing: false, last: STROKES.map((s) => s.from), dirty: true, mx: 0, my: 0, tx: 0, ty: 0 };
  let W = 0, PR = 1;
  const resize = () => {
    PR = Math.min(devicePixelRatio, 2); W = canvas.clientWidth;
    canvas.width = canvas.height = Math.round(W * PR);
  };
  new ResizeObserver(resize).observe(canvas); resize();
  addEventListener('pointermove', (e) => { state.tx = e.clientX / innerWidth - .5; state.ty = e.clientY / innerHeight - .5; }, { passive: true });

  // uma "pincelada": cerdas espalhadas ao longo do raio, alongadas na direção do movimento
  function dab(a, dir) {
    const cx = N / 2, cy = N / 2;
    for (let k = 0; k < 64; k++) {
      const r = N * (.06 + Math.random() * .46);
      const aj = a + (Math.random() - .5) * .035;
      const x = cx + Math.cos(aj) * r, y = cy + Math.sin(aj) * r;
      const s = N * (.005 + Math.random() * .013);
      bc.globalAlpha = .45 + Math.random() * .55;
      bc.beginPath(); bc.ellipse(x, y, s * 2.6, s, aj + dir * Math.PI / 2, 0, Math.PI * 2); bc.fill();
    }
  }

  function paintTo(t) {
    STROKES.forEach((s, i) => {
      const p = ease(clamp01((t - s.start) / s.dur));
      const target = s.from + (s.to - s.from) * p;
      const dir = Math.sign(s.to - s.from);
      let a = state.last[i];
      while ((target - a) * dir > 0) { a += dir * .45 * DEG; if ((a - target) * dir > 0) a = target; dab(a, dir); state.dirty = true; }
      state.last[i] = a;
    });
    const f = clamp01((t - SETTLE.start) / SETTLE.dur);
    if (f > 0 && t < SETTLE.start + SETTLE.dur + .3) { bc.globalAlpha = f * .25; bc.fillRect(0, 0, N, N); state.dirty = true; }
  }

  function render() {
    if (state.dirty) {
      cc.globalCompositeOperation = 'copy'; cc.drawImage(brush, 0, 0);
      cc.globalCompositeOperation = 'source-in'; cc.drawImage(tinted, 0, 0);
      state.dirty = false;
    }
    const t = state.t, S = canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S);
    state.mx += (state.tx - state.mx) * .04; state.my += (state.ty - state.my) * .04;
    const breathe = 1 + Math.sin(t * .7) * .006;
    ctx.translate(S / 2 + state.mx * S * .02, S / 2 + state.my * S * .02);
    ctx.scale(breathe, breathe);

    // círculo do cometa sendo traçado
    const R = S * .47;
    const cp = ease(clamp01((t - CIRCLE.start) / CIRCLE.dur));
    if (cp > 0) {
      ctx.strokeStyle = 'rgba(201,164,92,.38)'; ctx.lineWidth = Math.max(1, S * .0016);
      ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + cp * Math.PI * 2); ctx.stroke();
      if (cp < 1) { // ponta do pincel no círculo
        const a = -Math.PI / 2 + cp * Math.PI * 2;
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff4a55'; ctx.shadowBlur = S * .02;
        ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, S * .004, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    // a pintura
    ctx.drawImage(comp, -S / 2, -S / 2, S, S);

    // o cometa orbita a pintura pronta
    const ca = clamp01((t - COMET) / 1.2);
    if (ca > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const base = (t - COMET) * .55 - Math.PI / 2;
      for (let i = 46; i >= 0; i--) {
        const a = base - i * .018, k = 1 - i / 46;
        ctx.fillStyle = `rgba(255,${120 + k * 120},${110 + k * 100},${ca * k * k * .5})`;
        ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, S * (.0015 + k * k * .0055), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${ca})`; ctx.shadowColor = '#ffd9cf'; ctx.shadowBlur = S * .03;
      ctx.beginPath(); ctx.arc(Math.cos(base) * R, Math.sin(base) * R, S * .006, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  let prev = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - prev) / 1000, .05); prev = now;
    if (!visible) return;
    if (state.playing) { state.t += dt; paintTo(state.t); }
    render();
  })(prev);

  return {
    play() { state.playing = true; },
    // sem animação (prefers-reduced-motion): mostra a pintura pronta
    finish() { state.t = SETTLE.start + SETTLE.dur + 1; paintTo(state.t); bc.globalAlpha = 1; bc.fillRect(0, 0, N, N); state.dirty = true; state.playing = true; },
    paintDone: SETTLE.start,
  };
}
