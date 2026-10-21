# Suysei — Apresentação interativa da marca

Site estático (HTML + CSS + JS) que apresenta a marca Suysei — Casa de Refeição Japonesa, a partir do Guia de Marca 2026.

## Seções
1. **Hero 3D** — símbolo das carpas extrudado em 3D (Three.js), com luzes, bloom, bokeh com profundidade de campo e o cometa em órbita. Arraste para girar; troque o material (Laca, Ouro, Nanquim, Cristal). As carpas chegam de lados opostos e se encaixam no círculo.
2. **Frase / Manifesto / História** — revelação palavra a palavra, paralaxe e linha do tempo horizontal (1974 → hoje).
3. **Conceito** — cena em paralaxe com céu estrelado, cometa cruzando o céu no scroll, paisagem e camada desfocada em primeiro plano.
4. **As duas carpas** — a que sobe e a que desce, com hover interativo.
5. **A marca em construção** — sequência fixada no scroll: círculo do cometa → carpas pintadas em traço sumi-ê → wordmark → assinatura bilíngue.
6. **Versões, uso correto, cores, personalidade, território** — interativos (positivo/negativo, cards que viram, copiar HEX).
7. **Mockups 3D** — caixa presente (tampa abre), sacola, carta de drinks (vira) e bowl (tampa abre).
8. **Galeria** com os mockups originais do Drive + lightbox.

## Rodar localmente
Os módulos ES precisam de um servidor HTTP:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Todas as bibliotecas (three.js 0.160, GSAP 3.12 + ScrollTrigger, Lenis) estão em `assets/vendor/`; só as fontes (Kalnia, Barlow) vêm do Google Fonts.

## Assets
- `assets/js/brand-paths.js` — wordmark, assinatura, kanji e carpas vetorizados a partir do guia.
- `assets/img/brand/` — carpas em nanquim (máscaras com transparência).
- `assets/img/story/`, `assets/img/mockups/` — fotos e mockups do Drive, otimizados em WebP.
