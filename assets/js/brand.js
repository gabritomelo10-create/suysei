// Monta as peças vetoriais da marca (wordmark, assinatura, kanji) nos placeholders do HTML.
import P from './brand-paths.js';

const NS = 'http://www.w3.org/2000/svg';

function svg(viewBox, paths, cls) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  if (cls) el.setAttribute('class', cls);
  for (const d of paths) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'currentColor');
    p.setAttribute('fill-rule', 'evenodd');
    el.appendChild(p);
  }
  return el;
}

// limites horizontais de cada letra de SUYSEI (em unidades do viewBox)
const LETTER_X = [[0, 362], [400, 735], [772, 1160], [1165, 1527], [1566, 1874], [1907, 2001]];

export const wordmark = (split = false) => {
  const { w, h, letters } = P.suysei;
  const el = svg(`0 0 ${w} ${h}`, letters);
  if (split) el.querySelectorAll('path').forEach((p, i) => {
    p.classList.add('letter');
    p.style.transformBox = 'fill-box';
    p.style.transformOrigin = '50% 100%';
    p.dataset.i = i;
  });
  return el;
};
export const wordmarkPart = (part) => {
  const { h, letters } = P.suysei;
  const [a, b] = part === 0 ? [0, 2] : [3, 5];
  const x0 = LETTER_X[a][0], x1 = LETTER_X[b][1];
  return svg(`${x0} 0 ${x1 - x0} ${h}`, letters.slice(a, b + 1));
};
export const casa = () => svg(`0 0 ${P.casa.w} ${P.casa.h}`, [P.casa.d]);
export const kanji = () => svg(`0 0 ${P.kanji.w} ${P.kanji.h}`, [P.kanji.d]);
export const kanjiChar = (i) => { const k = P.kanjiChars[i]; return svg(`0 0 ${k.w} ${k.h}`, [k.d]); };
// assinatura compacta "日本料理店" (caracteres juntos)
export const kanjiTight = () => {
  const g = document.createElementNS(NS, 'svg');
  const gap = 18; let x = 0; const H = 128;
  g.setAttribute('aria-hidden', 'true');
  P.kanjiChars.forEach((k) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', k.d); p.setAttribute('fill', 'currentColor'); p.setAttribute('fill-rule', 'evenodd');
    p.setAttribute('transform', `translate(${x} ${(H - k.h) / 2})`);
    g.appendChild(p); x += k.w + gap;
  });
  g.setAttribute('viewBox', `0 0 ${x - gap} ${H}`);
  return g;
};
export const koiPaths = P.koi;

export function mountBrand(root = document) {
  root.querySelectorAll('[data-wordmark]').forEach((el) => el.appendChild(wordmark(el.hasAttribute('data-split-letters'))));
  root.querySelectorAll('[data-wordmark-part]').forEach((el) => el.appendChild(wordmarkPart(+el.dataset.wordmarkPart)));
  root.querySelectorAll('[data-casa]').forEach((el) => el.appendChild(casa()));
  root.querySelectorAll('[data-kanji-spaced]').forEach((el) => el.appendChild(kanji()));
  root.querySelectorAll('[data-kanji]').forEach((el) => el.appendChild(kanjiTight()));
  root.querySelectorAll('[data-kanji-chars]').forEach((el) => { for (let i = 0; i < 5; i++) el.appendChild(kanjiChar(i)); });
  root.querySelectorAll('[data-kanji-vertical]').forEach((el) => { for (let i = 0; i < 5; i++) el.appendChild(kanjiChar(i)); });
  root.querySelectorAll('.mini-centralizada').forEach((el) => el.appendChild(wordmark()));
}
