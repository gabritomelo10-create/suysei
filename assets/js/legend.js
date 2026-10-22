// Manifesto + conceito central numa única narrativa: a lenda da carpa que sobe a cachoeira
// constrói o logotipo, capítulo a capítulo, conforme o scroll.
import { KoiPainter } from './koi-painter.js';
import { makeStroke, drawStroke, sample, taper, rng } from './sumi.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);

// limites de cada capítulo (frações do scroll da seção)
export const CHAPTERS = [0, .1, .19, .31, .5, .6, .72, .82, .91];

export function initLegend(root) {
  const $ = (s) => root.querySelector(s);
  const koi = new KoiPainter($('#legend-koi'), { color: '#bc1621' });
  const orbit = $('#legend-orbit'), octx = orbit.getContext('2d');
  const fall = $('#legend-fall'), climber = $('#legend-climber'), photo = $('#legend-photo'), comet = $('#legend-comet');
  const word = $('.legend__logo .lc__word'), kanji = [...root.querySelectorAll('.legend__logo .lc__kanji svg')], casa = $('.legend__logo .lc__casa');
  const chapters = [...root.querySelectorAll('.lchap')], dots = [...root.querySelectorAll('.legend__nav button')];

  let last = -1;
  // trajetória do cometa: um traço de pincel fino que fecha o círculo onde as carpas vão nadar
  let O = 0, orbitStroke = null;
  const R = .3;
  function orbitResize() {
    const pr = Math.min(devicePixelRatio || 1, 2); O = orbit.clientWidth; orbit.width = orbit.height = O * pr; octx.setTransform(pr, 0, 0, pr, 0, 0);
    orbitStroke = makeStroke(sample((t) => { const a = (-90 + t * 360) * Math.PI / 180; return { x: O / 2 + Math.cos(a) * O * R, y: O / 2 + Math.sin(a) * O * R }; }, (t) => O * .012 * (.4 + .6 * taper(t, .02, .1)), 420), { bristles: 12, seed: 5, dry: .5, thin: .18 });
    last = -1;
  }
  new ResizeObserver(orbitResize).observe(orbit); orbitResize();

  // cachoeira: traços verticais de pincel seco em branco, desenhados uma vez
  (function paintFall() {
    const c = fall.querySelector('canvas'), x = c.getContext('2d'); c.width = 360; c.height = 1200;
    const Rr = rng(31);
    for (let i = 0; i < 46; i++) {
      const cx = 30 + Rr() * 300, y0 = Rr() * 1200, L = 160 + Rr() * 420, w = 4 + Rr() * 10;
      const pts = sample((t) => ({ x: cx + Math.sin(t * 3 + i) * 4, y: y0 + t * L }), (t) => w * taper(t, .1, .4), 70);
      drawStroke(x, makeStroke(pts, { bristles: 8, seed: i, dry: 1, thin: .25 }), 1, `rgba(233,233,233,${.08 + Rr() * .18})`);
      // repete embaixo/encima para o loop vertical não ter emenda
      x.save(); x.translate(0, -1200); drawStroke(x, makeStroke(pts, { bristles: 8, seed: i, dry: 1, thin: .25 }), 1, 'rgba(233,233,233,.12)'); x.restore();
    }
  })();

  function update(p) {
    if (Math.abs(p - last) < .0004) return; last = p;
    // capítulo ativo
    let ch = 0; CHAPTERS.forEach((b, i) => { if (p >= b) ch = i; });
    chapters.forEach((c, i) => c.classList.toggle('is-active', i === ch));
    dots.forEach((d, i) => { d.classList.toggle('is-active', i === ch); d.classList.toggle('is-done', i < ch); });
    root.style.setProperty('--lp', p);

    // 1–2 · retrato do Tetsuo
    const ph = 1 - seg(p, .17, .23);
    photo.style.opacity = ph; photo.style.transform = `translate(-50%, -50%) scale(${.92 + seg(p, 0, .1) * .08 - (1 - ph) * .1}) rotate(${-2 + (1 - ph) * 4}deg)`;

    // 3 · o cometa traça o círculo
    const orb = seg(p, .2, .3), orbFade = 1 - seg(p, .44, .52) * .75 - seg(p, .74, .8) * .25;
    octx.clearRect(0, 0, O, O);
    if (orb > 0) drawStroke(octx, orbitStroke, orb, `rgba(233,233,233,${.5 * orbFade})`);
    const ca = (-90 + orb * 360) * Math.PI / 180;
    comet.style.opacity = orb > 0 && orb < 1 ? 1 : 0;
    comet.style.transform = `translate(${O / 2 + Math.cos(ca) * O * R}px, ${O / 2 + Math.sin(ca) * O * R}px) rotate(${orb * 360}deg)`;

    // 4 · a cachoeira e a carpa que sobe contra a correnteza
    const fallIn = seg(p, .3, .36) * (1 - seg(p, .5, .56));
    fall.style.opacity = fallIn;
    const climb = smooth(seg(p, .33, .5));
    const arrive = seg(p, .48, .56);
    climber.style.opacity = seg(p, .31, .34) * (1 - arrive);
    climber.style.transform = `translateY(${(1 - climb) * 78}%) rotate(${Math.sin(p * 160) * 4 * (1 - climb)}deg) scale(${.82 + climb * .18})`;
    // 5–7 · a carpa vira o símbolo; depois a que desce; juntas fecham o cometa
    const right = seg(p, .48, .6), left = seg(p, .6, .72), fill = seg(p, .74, .82);
    koi.paint(left, right, fill);
    root.classList.toggle('is-whole', p > .78);
    // 8–9 · wordmark e assinatura
    word.style.clipPath = `inset(0 ${100 - seg(p, .82, .89) * 100}% 0 0)`;
    kanji.forEach((k, i) => { const v = seg(p, .91 + i * .012, .93 + i * .012); k.style.opacity = v; k.style.filter = `blur(${(1 - v) * 6}px)`; });
    casa.style.opacity = seg(p, .96, .99);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = root.getBoundingClientRect(), top = r.top + scrollY, len = r.height - innerHeight;
    const y = top + len * (CHAPTERS[i] + .02);
    window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: 'smooth' });
  }));
  koi.ready.then(() => { last = -1; update(0); });
  return { update };
}
