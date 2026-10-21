import { mountBrand } from './brand.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (reduced) document.documentElement.classList.add('reduced');

mountBrand();

/* ---------------- Smooth scroll ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: .95 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href')); if (!target) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(target, { duration: 1.8 }) : target.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------------- Split helpers ---------------- */
// "|" no texto força quebra de linha (ex.: Persona|lidade, como no guia)
function splitChars(el) {
  const text = el.textContent; el.textContent = ''; el.setAttribute('aria-label', text.replace(/\|/g, ''));
  text.split('|').forEach((line, li) => {
    if (li) el.appendChild(document.createElement('br'));
    line.split(' ').forEach((word, wi) => {
      if (wi) el.appendChild(document.createTextNode(' '));
      const w = document.createElement('span'); w.className = 'word-nb'; w.setAttribute('aria-hidden', 'true');
      [...word].forEach((ch) => { const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; w.appendChild(s); });
      el.appendChild(w);
    });
  });
  return $$('.char', el);
}
function splitWords(el) {
  const out = [];
  const walk = (node, parent) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { parent.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'word'; s.textContent = w; parent.appendChild(s); out.push(s);
        });
      } else {
        const clone = n.cloneNode(false); parent.appendChild(clone); walk(n, clone);
      }
    });
  };
  const frag = document.createElement('div'); walk(el, frag);
  el.innerHTML = ''; el.append(...frag.childNodes);
  return out;
}

/* ---------------- Loader ---------------- */
const loaderNum = $('#loader-num');
const critical = ['assets/img/brand/koi-ink.png', 'assets/img/brand/koi-mask.png', 'assets/img/brand/koi-left.png', 'assets/img/brand/koi-right.png', 'assets/img/story/tetsuo-hero.webp'];
let loaded = 0; const counter = { v: 0 };
const bump = () => { loaded++; gsap.to(counter, { v: (loaded / (critical.length + 1)) * 100, duration: .6, onUpdate: () => { loaderNum.textContent = Math.round(counter.v); } }); };
const loads = critical.map((src) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = () => { bump(); r(); }; i.src = src; }));
loads.push((document.fonts ? document.fonts.ready : Promise.resolve()).then(bump));
const minTime = new Promise((r) => setTimeout(r, 1400));

// atmosfera (WebGL) e a pintura do símbolo (canvas 2D)
import('./hero-atmosphere.js').then(({ initAtmosphere }) => {
  try { initAtmosphere($('#hero-gl')); } catch (err) { console.warn('WebGL indisponível', err); }
}).catch((e) => console.warn(e));
const paintReady = import('./hero-paint.js').then(({ initPaint }) => initPaint($('#hero-paint'))).catch((e) => { console.warn(e); return null; });

Promise.all([...loads, minTime]).then(() => {
  gsap.to(counter, { v: 100, duration: .4, onUpdate: () => { loaderNum.textContent = Math.round(counter.v); } });
  setTimeout(() => {
    $('#loader').classList.add('is-done');
    document.body.classList.remove('is-loading');
    lenis?.start();
    introHero();
    ScrollTrigger.refresh();
  }, 450);
});

// a marca é pintada primeiro; o wordmark e a assinatura entram quando as carpas estão prontas
function introHero() {
  paintReady.then((p) => { if (!p) return; reduced ? p.finish() : p.play(); });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.nav, .hero__top, .credit, .hero__bottom', { opacity: 0, y: 20, duration: 1.2, stagger: .08, delay: .3 })
    .from('.hero__word .letter', { yPercent: 120, opacity: 0, duration: 1.6, stagger: .08 }, reduced ? 0 : 3.4)
    .from('.hero__casa, .hero__kanji', { opacity: 0, y: 20, duration: 1.2, stagger: .15 }, '-=1.1');
}

/* ---------------- Cursor ---------------- */
if (finePointer) {
  const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, rp = { ...pos };
  addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; dot.style.transform = `translate(${pos.x}px,${pos.y}px)`; }, { passive: true });
  gsap.ticker.add(() => { rp.x += (pos.x - rp.x) * .16; rp.y += (pos.y - rp.y) * .16; ring.style.transform = `translate(${rp.x}px,${rp.y}px)`; });
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const txt = lab?.dataset.cursor;
    cur.classList.toggle('has-label', !!txt); label.textContent = txt || '';
    cur.classList.toggle('is-hover', !txt && !!e.target.closest('a, button, [data-tilt], [data-lightbox], .ucard, [data-fish-trigger]'));
  });
}

/* ---------------- Magnetic ---------------- */
if (finePointer) $$('[data-magnetic]').forEach((el) => {
  const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .35); });
  el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
});

/* ---------------- Tilt 3D ---------------- */
if (finePointer) $$('[data-tilt]').forEach((el) => {
  const amt = el.dataset.tilt === 'soft' ? 5 : 10;
  gsap.set(el, { transformPerspective: 900 });
  const rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3.out' }), ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3.out' });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    ry((x - .5) * amt * 2); rx(-(y - .5) * amt * 2);
    el.style.setProperty('--lx', `${x * 100}%`); el.style.setProperty('--ly', `${y * 100}%`);
  });
  el.addEventListener('pointerleave', () => { rx(0); ry(0); });
});

/* ---------------- Progress + nav ---------------- */
gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
let lastY = 0;
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { const y = s.scroll(); $('#nav').classList.toggle('is-hidden', y > lastY && y > 400); lastY = y; } });
$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href')); if (!sec) return;
  ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => a.classList.toggle('is-active', s.isActive) });
});

/* ---------------- Reveals ---------------- */
$$('[data-split-chars]').forEach((el) => {
  const chars = splitChars(el);
  gsap.from(chars, { yPercent: 110, rotate: 8, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .035, scrollTrigger: { trigger: el, start: 'top 85%' } });
});
if (!reduced) ScrollTrigger.batch('[data-reveal]', {
  start: 'top 88%', once: true,
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: .1 }),
});
$$('[data-word-reveal]').forEach((el) => {
  const words = splitWords(el);
  gsap.to(words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 40%', scrub: true } });
});
$$('[data-parallax]').forEach((el) => {
  const v = +el.dataset.parallax;
  gsap.fromTo(el, { yPercent: -v }, { yPercent: v, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
});

/* ---------------- Hero scroll ---------------- */
gsap.to('.hero__paint', { scale: .82, opacity: .25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '25% top', end: 'bottom bottom', scrub: true } });
gsap.to('.hero__title', { yPercent: -40, opacity: 0, scale: .92, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '45% top', scrub: true } });
gsap.to('.credit, .hero__bottom, .hero__top', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '50% top', scrub: true } });

/* ---------------- Manifesto ---------------- */
gsap.fromTo('[data-rotate-scroll]', { rotate: -40, scale: .85 }, { rotate: 80, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true } });
gsap.from('.quote__light', { scale: .4, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'center center', scrub: true } });

/* ---------------- História horizontal ---------------- */
ScrollTrigger.matchMedia({
  '(min-width: 861px)': () => {
    const track = $('.history__track');
    const dist = () => track.scrollWidth - innerWidth;
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.history', start: 'top top', end: () => `+=${dist() * 1.1}`, pin: '.history__pin', scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
    tl.to(track, { x: () => -dist(), ease: 'none' }, 0)
      .to('.history__line span', { scaleX: 1, ease: 'none' }, 0)
      .fromTo('.history__comet', { left: '0%' }, { left: '100%', ease: 'none' }, 0)
      .to('.history__head', { opacity: 0, x: -80, ease: 'none', duration: .15 }, 0.05);
    $$('.tcard').forEach((c, i) => gsap.from(c.querySelector('.tcard__img img'), { scale: 1.35, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tl, start: 'left right', end: 'right left', scrub: true } }));
  },
  '(max-width: 860px)': () => {
    $$('.tcard').forEach((c) => gsap.from(c, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 85%' } }));
  },
});

/* ---------------- Conceito (paralaxe) ---------------- */
(function concept() {
  const sec = $('.concept'), sticky = $('.concept__sticky');
  const stars = $('#stars'), ctx = stars.getContext('2d');
  let W = 0, H = 0, pts = [];
  const resize = () => {
    const pr = Math.min(devicePixelRatio, 2); W = stars.clientWidth; H = stars.clientHeight;
    stars.width = W * pr; stars.height = H * pr; ctx.setTransform(pr, 0, 0, pr, 0, 0);
    pts = Array.from({ length: Math.round(W * H / 2600) }, () => ({ x: Math.random() * W, y: Math.random() * H * .8, r: Math.random() * 1.4 + .2, p: Math.random() * 6, s: Math.random() < .04 }));
  };
  new ResizeObserver(resize).observe(stars); resize();
  let on = false;
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; } });
  const drawStar = (x, y, r) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .25 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
  gsap.ticker.add((t) => {
    if (!on) return;
    ctx.clearRect(0, 0, W, H);
    for (const s of pts) {
      const a = .35 + .65 * Math.abs(Math.sin(t * .9 + s.p));
      ctx.fillStyle = `rgba(255,${190 + (s.p * 10 | 0)},${180},${a * .8})`;
      if (s.s) drawStar(s.x, s.y, s.r * 7); else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    }
  });
  // camadas de profundidade com o mouse
  const layers = $$('.concept__layer', sticky).map((el) => ({ el, d: +el.dataset.depth, x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }) }));
  sticky.addEventListener('pointermove', (e) => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    layers.forEach((l) => { l.x(-x * 40 * l.d); l.y(-y * 24 * l.d); });
    sticky.style.setProperty('--mx', `${(x + .5) * 100}%`);
  });
  // scroll: cometa cruza o céu, paisagem sobe, foreground desfocado passa
  const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1 } });
  tl.fromTo('.concept__comet', { x: () => -innerWidth * .9, y: () => -innerHeight * .2, rotate: 28 }, { x: () => innerWidth * .55, y: () => innerHeight * .55, ease: 'none', duration: 1 }, 0)
    .fromTo('.concept__sky canvas', { yPercent: 0 }, { yPercent: 12, ease: 'none', duration: 1 }, 0)
    .fromTo('.concept__land', { yPercent: 28, scale: 1.15 }, { yPercent: 0, scale: 1, ease: 'none', duration: 1 }, 0)
    .fromTo('.concept__fg .koi-mask', { yPercent: 40, rotate: -20 }, { yPercent: -60, rotate: 30, ease: 'none', duration: 1 }, 0)
    .fromTo('.concept__frame', { opacity: 0, scale: .85, letterSpacing: '.3em' }, { opacity: 1, scale: 1, ease: 'expo.out', duration: .3 }, .18)
    .from('.concept__line--a', { clipPath: 'inset(0 100% 0 0)', duration: .2, ease: 'none' }, .3)
    .from('.concept__line--b', { clipPath: 'inset(0 0 0 100%)', duration: .2, ease: 'none' }, .42)
    .to('.concept__frame', { opacity: 0, y: -60, duration: .15 }, .88);
})();

/* ---------------- Carpas ---------------- */
(function koi() {
  const sec = $('.koi'), stage = $('.koi__stage');
  const set = (f) => { sec.classList.toggle('focus-sobe', f === 'sobe'); sec.classList.toggle('focus-desce', f === 'desce'); };
  $$('[data-fish-trigger]').forEach((el) => { el.addEventListener('pointerenter', () => set(el.dataset.fishTrigger)); el.addEventListener('pointerleave', () => set(null)); el.addEventListener('click', () => set(el.dataset.fishTrigger)); });
  const rx = gsap.quickTo(stage, 'rotationY', { duration: 1, ease: 'power3.out' }), ry = gsap.quickTo(stage, 'rotationX', { duration: 1, ease: 'power3.out' });
  gsap.set(stage, { transformPerspective: 1000 });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    set(x > .5 ? 'sobe' : 'desce'); rx((x - .5) * 18); ry(-(y - .5) * 18);
  });
  stage.addEventListener('pointerleave', () => { set(null); rx(0); ry(0); });
  gsap.fromTo('.koi__fish--desce', { xPercent: -30, yPercent: 20, rotate: -40, opacity: 0 }, { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 85%', end: 'center center', scrub: 1 } });
  gsap.fromTo('.koi__fish--sobe', { xPercent: 30, yPercent: -20, rotate: -40, opacity: 0 }, { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 85%', end: 'center center', scrub: 1 } });
  gsap.from('.koi__side', { opacity: 0, y: 60, stagger: .2, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 55%' } });
})();

/* ---------------- Construção da marca ---------------- */
(function build() {
  const sec = $('.build'); const items = $$('.build__list li'); const num = $('#build-num');
  gsap.set('.build__word .letter', { yPercent: -90, opacity: 0, filter: 'blur(12px)' });
  gsap.set('.build__kanji svg', { opacity: 0, y: 14 });
  gsap.set('.build__casa', { clipPath: 'inset(0 100% 0 0)' });
  gsap.set(['.build__koi--l', '.build__koi--r'], { '--a': '-30deg' });
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1,
    onUpdate: (s) => {
      const p = s.progress; const step = p < .2 ? 0 : p < .5 ? 1 : p < .72 ? 2 : 3;
      items.forEach((li, i) => li.classList.toggle('is-active', i === step));
      num.textContent = String(step).padStart(2, '0');
      sec.classList.toggle('is-red', p > .93);
    },
  } });
  tl.to('.build__circle circle:first-child', { strokeDashoffset: 0, duration: 1.2 }, 0)
    .fromTo('.build__circle-dot', { rotate: 0 }, { rotate: 360, duration: 1.4 }, 0)
    .to('.build__koi--l', { '--a': '370deg', duration: 1.4 }, 1.1)
    .to('.build__koi--r', { '--a': '370deg', duration: 1.4 }, 1.5)
    .to('.build__circle', { opacity: .25, duration: .4 }, 2.6)
    .to('.build__word .letter', { yPercent: 0, opacity: 1, filter: 'blur(0px)', stagger: .14, duration: .6 }, 3.1)
    .to('.build__kanji svg', { opacity: 1, y: 0, stagger: .14, duration: .4 }, 4.3)
    .to('.build__casa', { clipPath: 'inset(0 0% 0 0)', duration: .7 }, 4.9)
    .fromTo('.build__ink', { opacity: 0, scale: .6 }, { opacity: 1, scale: 1.2, duration: .5 }, 5.6)
    .to('.build__circle', { opacity: 0, duration: .3 }, 5.7)
    .to('.build__stage', { scale: 1.05, duration: .6 }, 5.6);
})();

/* ---------------- Versões ---------------- */
(function versions() {
  const info = {
    selo: ['Selo', 'O símbolo das carpas aparece isolado dentro de um quadrado sólido colorido — como um selo ou emblema — posicionado acima do wordmark, seguido da assinatura bilíngue em uma única linha.', 'Carimbos, etiquetas, selos de qualidade, capas de documentos, embalagens menores e impressos onde o logotipo precisa funcionar como uma unidade única.'],
    centralizada: ['Assinatura centralizada', 'O símbolo das carpas ocupa o centro da composição, sobreposto ao wordmark — as letras atravessam o desenho das carpas, como se fizessem parte do mesmo traço de pincel.', 'Aplicações de destaque e formato quadrado ou vertical: capa de cardápio, perfil de redes sociais, embalagens, cartazes, abertura de vídeos.'],
    estendida: ['Assinatura estendida', 'O símbolo das carpas move-se para a lateral direita, enquanto o wordmark, os caracteres japoneses (dispostos verticalmente) e a assinatura se organizam à esquerda, em bloco.', 'Formatos largos: cabeçalhos, banners, papelaria (papel timbrado, envelopes), rodapés de site, faixas e placas horizontais.'],
    tipografica: ['Assinatura tipográfica', 'Versão sem o símbolo das carpas: apenas o wordmark “Suysei”, acompanhado da assinatura “Casa de Refeição Japonesa” acima e dos caracteres japoneses abaixo.', 'Aplicações muito pequenas, textos corridos, rodapés, cartões de visita, brindes gravados, ou quando o símbolo já aparece em destaque na mesma peça.'],
  };
  const canvas = $('#version-canvas'), title = $('#version-title'), desc = $('#version-desc'), use = $('#version-use');
  const setV = (v) => {
    $$('[data-version]').forEach((b) => b.classList.toggle('is-active', b.dataset.version === v));
    $$('.logo', canvas).forEach((l) => l.classList.toggle('is-active', l.dataset.logo === v));
    const [t, d, u] = info[v];
    gsap.fromTo([title, desc, use], { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: .06, duration: .7, ease: 'expo.out' });
    title.textContent = t; desc.textContent = d; use.textContent = u;
    gsap.fromTo(canvas.querySelector(`[data-logo="${v}"]`), { scale: .92 }, { scale: 1, duration: 1, ease: 'expo.out' });
  };
  $$('[data-version]').forEach((b) => b.addEventListener('click', () => setV(b.dataset.version)));
  $('#mode-toggle').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', on); canvas.classList.toggle('is-neg', on);
  });
  setV('selo');
})();

/* ---------------- Uso (toque) ---------------- */
$$('.ucard').forEach((c) => c.addEventListener('click', () => { if (!finePointer) c.classList.toggle('is-flipped'); }));
gsap.from('.ucard', { y: 80, opacity: 0, rotateY: -30, stagger: .12, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.usage__grid', start: 'top 80%' } });

/* ---------------- Cores ---------------- */
const toast = $('#toast'); let toastT;
$$('.swatch').forEach((s) => s.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(s.dataset.hex); toast.textContent = `${s.dataset.hex} copiado`; } catch { toast.textContent = s.dataset.hex; }
  toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 1800);
}));
gsap.from('.swatch', { yPercent: 40, opacity: 0, stagger: .1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.colors__row', start: 'top 85%' } });
gsap.from('.pillar', { y: 100, opacity: 0, stagger: .12, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.pillars__grid', start: 'top 85%' } });

/* ---------------- Estúdio 3D (lazy) ---------------- */
ScrollTrigger.create({
  trigger: '.studio', start: 'top 150%', once: true,
  onEnter: () => import('./studio3d.js').then(async ({ initStudio }) => {
    try {
      const studio = await initStudio($('#studio-gl'), { tip: $('#studio-tip') });
      $$('[data-object]').forEach((b) => b.addEventListener('click', () => {
        $$('[data-object]').forEach((x) => x.classList.toggle('is-active', x === b));
        studio.show(b.dataset.object);
      }));
    } catch (err) { console.warn('Estúdio 3D indisponível', err); }
  }),
});

/* ---------------- Galeria + lightbox ---------------- */
gsap.utils.toArray('.gitem').forEach((g, i) => gsap.from(g, { y: 100, opacity: 0, duration: 1.3, ease: 'expo.out', delay: (i % 4) * .08, scrollTrigger: { trigger: g, start: 'top 92%' } }));
const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lightbox__cap', lb);
$$('[data-lightbox]').forEach((f) => f.addEventListener('click', () => {
  const img = $('img', f); lbImg.src = img.src; lbImg.alt = img.alt; lbCap.textContent = img.alt;
  lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); lenis?.stop();
}));
const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); };
lb.addEventListener('click', closeLb);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

/* ---------------- Outro ---------------- */
const outro = $('.outro');
outro.addEventListener('pointermove', (e) => { const r = outro.getBoundingClientRect(); outro.style.setProperty('--mx', `${(e.clientX - r.left) / r.width * 100}%`); outro.style.setProperty('--my', `${(e.clientY - r.top) / r.height * 100}%`); });
gsap.from('.outro__line span', { yPercent: 100, opacity: 0, stagger: .15, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.outro__line', start: 'top 85%' } });
gsap.from('.outro__seal', { rotateY: -90, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.outro', start: 'top 60%' } });

addEventListener('load', () => ScrollTrigger.refresh());
