// Abertura: o cursor vira um pincel sumi-ê sobre o papel. O traço afina com a velocidade,
// a tinta seca e some aos poucos; o clique respinga nanquim.
import { rng } from './sumi.js';

export function initInk(canvas, { color = '17,17,17' } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, PR = 1;
  const resize = () => {
    PR = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * PR; canvas.height = H * PR; ctx.setTransform(PR, 0, 0, PR, 0, 0);
  };
  new ResizeObserver(resize).observe(canvas); resize();

  const R = rng(9);
  // pincel: 14 cerdas com deslocamento fixo em relação ao centro
  const bristles = Array.from({ length: 14 }, (_, i) => ({ o: (i / 13 - .5) * (.8 + R() * .4), w: .35 + R() * .8, a: .25 + R() * .5, dry: R() }));
  let last = null, ink = 1, active = false, visible = true, painted = 0;

  function strokeTo(x, y, t) {
    if (!last) { last = { x, y, t, w: 0 }; return; }
    const dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
    if (d < 1.5) return;
    const v = d / Math.max(8, t - last.t);                       // px/ms
    const target = Math.max(3, Math.min(26, 26 - v * 14));         // mais rápido = mais fino
    const w = last.w ? last.w + (target - last.w) * .25 : target * .4;
    const nx = -dy / d, ny = dx / d;
    ink = Math.max(.15, ink - d * .0009);                          // o pincel vai secando
    ctx.lineCap = 'round';
    for (const b of bristles) {
      if (b.dry > ink + .25 && R() < .7) continue;                 // falhas do pincel seco
      ctx.strokeStyle = `rgba(${color},${b.a * (.45 + ink * .55)})`;
      ctx.lineWidth = Math.max(.6, w * .16 * b.w);
      ctx.beginPath();
      ctx.moveTo(last.x + nx * b.o * last.w, last.y + ny * b.o * last.w);
      ctx.lineTo(x + nx * b.o * w, y + ny * b.o * w);
      ctx.stroke();
    }
    last = { x, y, t, w }; painted = performance.now();
  }

  function splash(x, y) {
    const n = 18 + R() * 14;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.pow(R(), 1.8) * 90, r = (1 - d / 100) * (2 + R() * 7);
      ctx.fillStyle = `rgba(${color},${.55 + R() * .4})`;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r, r * (.6 + R() * .4), a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = `rgba(${color},.85)`;
    ctx.beginPath(); ctx.arc(x, y, 9 + R() * 6, 0, Math.PI * 2); ctx.fill();
    ink = 1; painted = performance.now();
  }

  const host = canvas.parentElement;
  host.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    if (!active) { active = true; last = null; ink = 1; }
    strokeTo(e.clientX - r.left, e.clientY - r.top, e.timeStamp);
  });
  host.addEventListener('pointerleave', () => { active = false; last = null; });
  host.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const r = canvas.getBoundingClientRect(); splash(e.clientX - r.left, e.clientY - r.top); last = null;
  });
  // a tinta seca: o papel volta aos poucos
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  let frame = 0;
  (function fade() {
    requestAnimationFrame(fade);
    if (!visible || ++frame % 2) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.035)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    if (!active) ink = Math.min(1, ink + .02);
    // o resto quase invisível some de vez quando ninguém pinta há alguns segundos
    if (painted && performance.now() - painted > 5000) { ctx.clearRect(0, 0, W, H); painted = 0; }
  })();
  return { splash };
}
