// História: o cometa sai do Japão e chega ao Brasil. O mapa é SVG; a trajetória é uma pincelada sumi-ê
// em canvas, desenhada conforme o scroll. Depois do pouso, a câmera se aproxima do Brasil para a linha do tempo.
import M from './map-data.js';
import { makeStroke, drawStroke, sample } from './sumi.js';

const NS = 'http://www.w3.org/2000/svg';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

// trajetória: arco sobre o Pacífico, de Tóquio a São Paulo (coordenadas do mapa)
const [tx, ty] = M.tokyo, [sx, sy] = M.sp;
const bez = (t) => {
  const p0 = [tx, ty], p1 = [520, -60], p2 = [1180, 120], p3 = [sx, sy], u = 1 - t;
  const f = (i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
  return { x: f(0), y: f(1) };
};

export function initJourney({ mapEl, canvas }) {
  // ---------- mapa ----------
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${M.w} ${M.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.innerHTML = `
    <defs>
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4"/>
        <feDisplacementMap in="SourceGraphic" scale="5"/>
      </filter>
      <radialGradient id="glowJ"><stop offset="0" stop-color="#ff3b47" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b47" stop-opacity="0"/></radialGradient>
    </defs>
    <g id="cam">
      <g class="jm__grid">
        ${[-23.44, 0, 23.44].map((lat, i) => `<line x1="0" x2="${M.w}" y1="${M.equator + (i - 1) * M.tropic}" y2="${M.equator + (i - 1) * M.tropic}"/>`).join('')}
      </g>
      <path class="jm__land" d="${M.land}" filter="url(#rough)"/>
      <path class="jm__jp" d="${M.japan}" filter="url(#rough)"/>
      <path class="jm__br" d="${M.brazil}" filter="url(#rough)"/>
      <circle class="jm__glow jm__glow--jp" cx="${tx}" cy="${ty}" r="90" fill="url(#glowJ)"/>
      <circle class="jm__glow jm__glow--br" cx="${sx}" cy="${sy}" r="110" fill="url(#glowJ)"/>
      <g class="jm__label" transform="translate(${tx + 18} ${ty - 26})"><text class="jm__city">Tóquio</text><text class="jm__coord" y="18">35°41′N · 139°41′E</text></g>
      <g class="jm__label jm__label--br" transform="translate(${sx + 22} ${sy + 4})"><text class="jm__city">São Paulo</text><text class="jm__coord" y="18">23°33′S · 46°38′O</text></g>
      <text class="jm__ocean" x="760" y="470">Oceano Pacífico</text>
    </g>`;
  mapEl.appendChild(svg);
  const cam = svg.querySelector('#cam');
  const glowJ = svg.querySelector('.jm__glow--jp'), glowB = svg.querySelector('.jm__glow--br'), brPath = svg.querySelector('.jm__br'), brLabel = svg.querySelector('.jm__label--br');

  // ---------- trajetória ----------
  const ctx = canvas.getContext('2d');
  const route = makeStroke(sample(bez, (t) => 2.2 + Math.sin(t * Math.PI) * 2.6, 500), { bristles: 9, seed: 21, dry: .7, thin: .22 });
  let W = 0, H = 0, PR = 1;
  const resize = () => { PR = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * PR; canvas.height = H * PR; draw(state.p, true); };
  const state = { p: 0, t: 0 };
  // câmera: escala/posição aplicadas igual no SVG (preserveAspectRatio slice) e no canvas
  function camera(p) {
    const base = Math.max(W / M.w, H / M.h);
    const narrow = W < 860;
    // começa perto do Japão, abre para o Pacífico durante o voo e se aproxima do Brasil no pouso
    const out = smooth(clamp01((p - .05) / .16)), z = smooth(clamp01((p - .44) / .12));
    const jz = narrow ? 1.6 : 2.1, bz = narrow ? 1.25 : 1.55;
    const zoom = lerp(lerp(jz, 1, out), bz, z);
    const jx = tx + (narrow ? 0 : W * .12 / (base * jz)), jy = ty + H * .06 / (base * jz);
    const fx = lerp(lerp(jx, M.w / 2, out), sx - (narrow ? 0 : 220), z), fy = lerp(lerp(jy, M.h / 2 - 40, out), sy - (narrow ? 120 : 40), z);
    const s = base * zoom;
    return { s, x: W / 2 - fx * s, y: H / 2 - fy * s, base };
  }
  function draw(p, force) {
    if (!W) return;
    const c = camera(p);
    // SVG: o viewBox já aplica a escala base; o grupo recebe só o zoom relativo
    const rel = c.s / c.base, ox = (c.x - (W / 2 - M.w / 2 * c.base)) / c.base, oy = (c.y - (H / 2 - M.h / 2 * c.base)) / c.base;
    cam.setAttribute('transform', `translate(${ox} ${oy}) scale(${rel})`);
    const fly = clamp01((p - .06) / (.4 - .06));
    glowJ.style.opacity = 1 - fly * .6;
    const landed = clamp01((p - .38) / .06);
    glowB.style.opacity = landed; brPath.style.opacity = .25 + landed * .75; brLabel.style.opacity = landed;
    ctx.setTransform(PR, 0, 0, PR, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.s, c.s);
    // rota já percorrida, em pincel seco vermelho
    if (fly > 0) drawStroke(ctx, route, fly, 'rgba(255,59,71,.85)', 1);
    // cometa: cabeça brilhante + cauda curta
    const head = bez(fly);
    if (fly > 0 && fly < 1) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 30; i >= 0; i--) {
        const q = bez(Math.max(0, fly - i * .006)), k = 1 - i / 30;
        ctx.fillStyle = `rgba(255,${120 + k * 120},${110 + k * 110},${k * k * .55})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, (1.5 + k * 9) / Math.sqrt(c.s / c.base), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const dot = fly >= 1 ? { x: sx, y: sy } : fly > 0 ? head : { x: tx, y: ty };
    const r = 7 / Math.sqrt(c.s / c.base);
    ctx.shadowColor = '#ff3b47'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // pouso: ondas de luz em São Paulo
    if (landed > 0) {
      for (let k = 0; k < 3; k++) {
        const ph = ((state.t * .45 + k / 3) % 1);
        ctx.strokeStyle = `rgba(255,59,71,${(1 - ph) * .6 * landed})`; ctx.lineWidth = 1.4 / (c.s / c.base);
        ctx.beginPath(); ctx.arc(sx, sy, 8 + ph * 60, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
  new ResizeObserver(resize).observe(canvas);
  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  let prev = performance.now();
  (function loop(now) { requestAnimationFrame(loop); const dt = (now - prev) / 1000; prev = now; if (!visible) return; state.t += dt; draw(state.p); })(prev);
  resize();
  return { setProgress(p) { state.p = p; } };
}
