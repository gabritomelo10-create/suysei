// Pinta o símbolo das carpas com um pincel sumi-ê de cerdas largas.
// Cada carpa recebe uma pincelada que percorre o corpo dela, da cauda à cabeça, seguindo o círculo do cometa;
// o pincel funciona como máscara sobre a ilustração original, então o resultado final é sempre o símbolo oficial.
// render(p) é determinístico (0–1): serve para animar por tempo (abertura) ou por scroll (construção da marca).
import { makeStroke, drawStroke, sample } from './sumi.js';

const N = 1024;
const DEG = Math.PI / 180;
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - x, 2.2);
const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };

let assets = null;
const loadAssets = () => (assets ||= Promise.all(['koi-mask', 'koi-ink'].map((n) => loadImg(`assets/img/brand/${n}.png`))));

// corpo de cada carpa no anel entre 12% e 47% do raio (medido na ilustração)
function arc(a0, a1, r, w, wob, seed) {
  return makeStroke(sample((t) => {
    const a = (a0 + (a1 - a0) * t) * DEG, rr = (r + Math.sin(t * Math.PI * 2 + seed) * wob) * N;
    return { x: N / 2 + Math.cos(a) * rr, y: N / 2 + Math.sin(a) * rr };
  }, (t) => w * N * (.55 + .45 * Math.min(1, t / .12)), 420), { bristles: 54, seed, dry: .55, thin: .05 });
}

export class KoiPainter {
  // color: cor da tinta; ink: quanto da textura do nanquim original aparece (0–1)
  constructor(canvas, { color = '#bc1621', ink = .12 } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.color = color; this.inkAmt = ink; this.p = -1;
    this.mask = mk(); this.mctx = this.mask.getContext('2d');
    this.strokes = [
      // a carpa que desce: da cauda (topo) até a cabeça (base), pelo lado esquerdo
      { s: arc(262, 66, .30, .40, .02, 3), from: 0, to: .5 },
      { s: arc(255, 75, .25, .22, .015, 5), from: .12, to: .58 },
      // a carpa que sobe: da cauda (base) até a cabeça (topo), pelo lado direito
      { s: arc(84, -112, .30, .40, .02, 7), from: .3, to: .82 },
      { s: arc(78, -104, .35, .22, .015, 11), from: .4, to: .88 },
    ];
    this.ready = loadAssets().then(([mask, inkImg]) => { this.tinted = this.tint(mask, inkImg); this.resize(); this.render(this.p < 0 ? 0 : this.p, true); });
    new ResizeObserver(() => { this.resize(); this.render(this.p, true); }).observe(canvas);
  }
  tint(mask, inkImg) {
    const c = mk(), x = c.getContext('2d');
    x.drawImage(mask, 0, 0, N, N);
    x.globalCompositeOperation = 'lighter'; x.drawImage(mask, 0, 0, N, N); // tinta mais densa, como no original
    x.globalCompositeOperation = 'source-in'; x.fillStyle = this.color; x.fillRect(0, 0, N, N);
    if (this.inkAmt) { x.globalCompositeOperation = 'multiply'; x.globalAlpha = this.inkAmt; x.drawImage(inkImg, 0, 0, N, N); x.globalAlpha = 1; }
    x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0, N, N);
    return c;
  }
  setColor(color) { this.color = color; this.ready.then(() => loadAssets()).then(([m, i]) => { this.tinted = this.tint(m, i); this.render(this.p, true); }); }
  resize() {
    const pr = Math.min(devicePixelRatio || 1, 2), w = Math.round(this.canvas.clientWidth * pr);
    if (w && this.canvas.width !== w) { this.canvas.width = this.canvas.height = w; }
  }
  render(p, force = false) {
    p = clamp01(p);
    if (!this.tinted || (!force && Math.abs(p - this.p) < .0005)) { this.p = p; return; }
    this.p = p;
    const m = this.mctx;
    m.clearRect(0, 0, N, N);
    for (const st of this.strokes) {
      const k = ease(clamp01((p - st.from) / (st.to - st.from)));
      if (k > 0) drawStroke(m, st.s, k, '#000');
    }
    // no fim a tinta assenta e o símbolo fica completo, exatamente como o original
    const fill = clamp01((p - .84) / .16);
    if (fill > 0) { m.globalAlpha = fill * fill; m.fillRect(0, 0, N, N); m.globalAlpha = 1; }
    const c = this.ctx, S = this.canvas.width;
    c.globalCompositeOperation = 'copy'; c.drawImage(this.mask, 0, 0, S, S);
    c.globalCompositeOperation = 'source-in'; c.drawImage(this.tinted, 0, 0, S, S);
    c.globalCompositeOperation = 'source-over';
  }
  // ponta do pincel em p (para efeitos de respingo/brilho), em fração 0–1 do quadro
  tip(p) {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const st = this.strokes[i], k = (p - st.from) / (st.to - st.from);
      if (k > 0 && k < 1) { const q = st.s.pts[Math.floor(ease(k) * (st.s.n - 1))]; return { x: q.x / N, y: q.y / N }; }
    }
    return null;
  }
}
