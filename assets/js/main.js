import { mountBrand } from './brand.js';
import { KoiPainter } from './koi-painter.js';
import { initInk } from './hero-ink.js';
import { initJourney } from './journey.js';
import { initLegend } from './legend.js';

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
const critical = ['assets/img/brand/koi-ink.png', 'assets/img/brand/koi-mask.png', 'assets/img/brand/koi-right.png', 'assets/img/brand/pattern.webp'];
let loaded = 0; const counter = { v: 0 };
const bump = () => { loaded++; gsap.to(counter, { v: (loaded / (critical.length + 1)) * 100, duration: .6, onUpdate: () => { loaderNum.textContent = Math.round(counter.v); } }); };
const loads = critical.map((src) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = () => { bump(); r(); }; i.src = src; }));
loads.push((document.fonts ? document.fonts.ready : Promise.resolve()).then(bump));
const minTime = new Promise((r) => setTimeout(r, 1200));

/* ---------------- Abertura: a marca pintada em sumi-ê ---------------- */
const heroKoi = new KoiPainter($('#hero-koi'), { color: '#bc1621' });
initInk($('#hero-ink'), { color: '233,229,222' });
const heroState = { p: 0 };
const heroLetters = $('.hero__logo .lc__word'), heroKanji = $$('.hero__logo .lc__kanji svg');
function paintHero() {
  const tl = gsap.timeline();
  gsap.set(heroLetters, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
  gsap.set(heroKanji, { opacity: 0, filter: 'blur(6px)', scale: 1.15 });
  gsap.set('.hero__logo .lc__casa', { opacity: 0, letterSpacing: '.4em' });
  heroState.p = 0; heroKoi.render(0, true);
  tl.to(heroState, { p: 1, duration: reduced ? .01 : 3.4, ease: 'none', onUpdate: () => heroKoi.render(heroState.p) })
    // o wordmark entra como uma pincelada da esquerda para a direita, letra a letra
    .to(heroLetters, { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power2.inOut' }, reduced ? 0 : 2.5)
    // os kanji assentam como tinta no papel
    .to(heroKanji, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: .7, stagger: .12, ease: 'power2.out' }, reduced ? 0 : 3.1)
    .to('.hero__logo .lc__casa', { opacity: 1, duration: 1, ease: 'power2.out' }, reduced ? 0 : 3.5);
  return tl;
}
$('#hero-replay').addEventListener('click', () => paintHero());
// o símbolo acompanha o cursor, como papel inclinado à luz
if (finePointer) {
  const logo = $('#hero-logo');
  const rx = gsap.quickTo(logo, 'rotationX', { duration: 1.2, ease: 'power3.out' }), ry = gsap.quickTo(logo, 'rotationY', { duration: 1.2, ease: 'power3.out' });
  gsap.set(logo, { transformPerspective: 1200 });
  $('.hero__sticky').addEventListener('pointermove', (e) => { ry((e.clientX / innerWidth - .5) * 8); rx(-(e.clientY / innerHeight - .5) * 6); });
}

Promise.all([...loads, minTime]).then(() => {
  gsap.to(counter, { v: 100, duration: .4, onUpdate: () => { loaderNum.textContent = Math.round(counter.v); } });
  setTimeout(() => {
    $('#loader').classList.add('is-done');
    document.body.classList.remove('is-loading');
    lenis?.start();
    heroKoi.ready.then(() => paintHero());
    gsap.from('.nav, .hero__top, .credit, .hero__bottom', { opacity: 0, y: 20, duration: 1.2, stagger: .08, delay: .3, ease: 'expo.out' });
    ScrollTrigger.refresh();
  }, 450);
});

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

/* ---------------- Abertura no scroll ---------------- */
gsap.to('#hero-logo', { scale: .8, yPercent: -8, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: 'bottom bottom', scrub: true } });
gsap.to('.credit, .hero__bottom, .hero__top', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '35% top', scrub: true } });
$$('.pattern-bg').forEach((el) => gsap.fromTo(el, { backgroundPositionY: '0px' }, { backgroundPositionY: '-260px', ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

/* ---------------- A lenda: manifesto + conceito constroem o logotipo ---------------- */
(function legend() {
  const root = $('#lenda'), L = initLegend(root);
  ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', onUpdate: (st) => L.update(st.progress) });
})();

/* ---------------- Travessia: o cometa do Japão ao Brasil, depois a linha do tempo ---------------- */
(function journey() {
  const sec = $('.journey'), j = initJourney({ mapEl: $('#journey-map'), canvas: $('#journey-trail') });
  const steps = $$('.jstep'), bar = $('#journey-bar');
  const track = $('#tl-track'), items = $$('.tl__item'), line = $('#tl-line');
  let active = -1, tlActive = -1;
  const T0 = .5; // a linha do tempo entra depois do pouso
  function place(i) {
    // centraliza o card ativo
    const it = items[i], vw = innerWidth;
    const x = Math.min(0, vw / 2 - (it.offsetLeft + it.offsetWidth / 2));
    gsap.to(track, { x, duration: .9, ease: 'expo.out' });
  }
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (st) => {
      const p = st.progress; j.setProgress(p);
      bar.style.transform = `scaleX(${Math.min(1, p / .4)})`;
      let i = 0; steps.forEach((s, k) => { if (p >= +s.dataset.at) i = k; });
      if (i !== active) { steps.forEach((s, k) => s.classList.toggle('is-active', k === i)); active = i; }
      sec.classList.toggle('is-timeline', p >= T0);
      const q = Math.max(0, (p - T0) / (1 - T0 - .03));
      line.style.transform = `scaleX(${Math.min(1, q)})`;
      const ti = Math.min(items.length - 1, Math.floor(q * items.length));
      if (p >= T0 && ti !== tlActive) { tlActive = ti; items.forEach((it, k) => { it.classList.toggle('is-active', k === ti); it.classList.toggle('is-past', k < ti); }); place(ti); }
    },
  });
  addEventListener('resize', () => { if (tlActive >= 0) place(tlActive); });
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

/* ---------------- Aplicações: um palco 3D por categoria (carregado perto da tela) ---------------- */
$$('.appcat').forEach((sec) => {
  const canvas = $('canvas[data-stage]', sec), tip = $('.appcat__tip', sec), btns = $$('.aobj', sec);
  ScrollTrigger.create({
    trigger: sec, start: 'top 160%', once: true,
    onEnter: () => import('./studio3d.js').then(async ({ createStage }) => {
      try {
        const st = await createStage(canvas, canvas.dataset.stage.split(','), { tip });
        btns.forEach((b) => b.addEventListener('click', () => {
          btns.forEach((x) => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); });
          st.show(+b.dataset.obj);
        }));
      } catch (err) { console.warn('3D indisponível', err); tip.textContent = 'Visualização 3D indisponível neste navegador'; }
    }),
  });
  gsap.from($$('.aphoto', sec), { y: 80, opacity: 0, stagger: .08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: $('.appcat__photos', sec), start: 'top 85%' } });
  gsap.from($('.appcat__head', sec).children, { y: 50, opacity: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 80%' } });
});

/* ---------------- Tipografia: teste de hierarquia ---------------- */
(function typetester() {
  const input = $('#tt-text'), out = $('#tt-out'), size = $('#tt-size'), spec = $('#tt-spec');
  const styles = {
    display: { size: 72, info: [['Fonte', 'Kalnia Bold'], ['Caixa', 'Alta'], ['Entrelinha', '1,05'], ['Uso', 'Títulos e aberturas']] },
    sub: { size: 28, info: [['Fonte', 'Barlow Bold'], ['Caixa', 'Alta'], ['Espaçamento', '+10%'], ['Uso', 'Subtítulos']] },
    label: { size: 18, info: [['Fonte', 'Barlow Medium'], ['Caixa', 'Alta'], ['Espaçamento', '+32%'], ['Uso', 'Assinaturas e rótulos']] },
    body: { size: 18, info: [['Fonte', 'Barlow Medium'], ['Caixa', 'Mista'], ['Entrelinha', '1,6'], ['Uso', 'Texto corrido']] },
  };
  const render = () => { out.textContent = input.value || ' '; out.style.fontSize = `${size.value}px`; };
  const pick = (k) => {
    out.dataset.tt = k; size.value = styles[k].size;
    spec.innerHTML = styles[k].info.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('') + `<div><dt>Tamanho</dt><dd id="tt-px">${size.value}px</dd></div>`;
    $$('.ttopt').forEach((b) => { const on = b.dataset.tt === k; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
    render();
  };
  $$('.ttopt').forEach((b) => b.addEventListener('click', () => pick(b.dataset.tt)));
  input.addEventListener('input', render);
  size.addEventListener('input', () => { render(); const px = $('#tt-px'); if (px) px.textContent = `${size.value}px`; });
  pick('display');
  gsap.from('.tcardx', { y: 70, opacity: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.typo__grid', start: 'top 85%' } });
})();

/* ---------------- Padronagem ---------------- */
(function patternLab() {
  const stage = $('#pattern-stage'), label = $('#pattern-label'), scale = $('#pattern-scale');
  const apply = (b) => {
    for (const k of ['bg', 'fg', 'ink', 'koi']) stage.style.setProperty(`--p-${k}`, b.dataset[k]);
    label.textContent = b.dataset.name;
    $$('.pswatch').forEach((x) => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); });
  };
  $$('.pswatch').forEach((b) => b.addEventListener('click', () => apply(b)));
  apply($('.pswatch.is-active'));
  const setScale = () => stage.style.setProperty('--p-size', `${scale.value}px`);
  scale.addEventListener('input', setScale); setScale();
  // a correnteza corre devagar; o cursor ilumina o pattern por onde passa
  let t = 0;
  gsap.ticker.add((_, dt) => { t += dt / 1000; stage.style.setProperty('--p-x', `${t * 14}px`); stage.style.setProperty('--p-y', `${Math.sin(t * .3) * 20}px`); });
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); stage.style.setProperty('--lx', `${e.clientX - r.left}px`); stage.style.setProperty('--ly', `${e.clientY - r.top}px`); stage.classList.add('is-lit'); });
  stage.addEventListener('pointerleave', () => stage.classList.remove('is-lit'));
  gsap.from('.patternsec__apps figure', { y: 80, opacity: 0, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.patternsec__apps', start: 'top 88%' } });
})();

/* ---------------- Lightbox: navega entre as imagens da mesma seção ---------------- */
const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lightbox__cap', lb);
let lbList = [], lbIndex = 0;
const showLb = (i) => {
  lbIndex = (i + lbList.length) % lbList.length;
  const f = lbList[lbIndex], img = $('img', f);
  lbImg.src = img.src; lbImg.alt = img.alt;
  lbCap.textContent = `${$('b', f)?.textContent ?? ''} — ${img.alt}  ·  ${lbIndex + 1}/${lbList.length}`;
  gsap.fromTo(lbImg, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out' });
};
const openLb = (f) => {
  lbList = $$('[data-lightbox]', f.closest('section') || document);
  showLb(lbList.indexOf(f));
  lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); lenis?.stop();
};
$$('[data-lightbox]').forEach((f) => {
  f.addEventListener('click', () => openLb(f));
  f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(f); } });
});
const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); };
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lightbox__close')) closeLb(); });
$('.lightbox__nav--prev', lb).addEventListener('click', () => showLb(lbIndex - 1));
$('.lightbox__nav--next', lb).addEventListener('click', () => showLb(lbIndex + 1));
addEventListener('keydown', (e) => {
  if (!lb.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
  if (e.key === 'ArrowRight') showLb(lbIndex + 1);
});

/* ---------------- Outro ---------------- */
const outro = $('.outro');
outro.addEventListener('pointermove', (e) => { const r = outro.getBoundingClientRect(); outro.style.setProperty('--mx', `${(e.clientX - r.left) / r.width * 100}%`); outro.style.setProperty('--my', `${(e.clientY - r.top) / r.height * 100}%`); });
gsap.from('.outro__line span', { yPercent: 100, opacity: 0, stagger: .15, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.outro__line', start: 'top 85%' } });
gsap.from('.outro__seal', { rotateY: -90, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.outro', start: 'top 60%' } });

addEventListener('load', () => ScrollTrigger.refresh());
