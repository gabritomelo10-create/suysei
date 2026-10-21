"""Gera a versão de publicação (Artifact do claude.ai) a partir do index.html.

O Artifact embrulha a página no próprio <html>/<head>/<body> e só aceita scripts
externos de CDNs permitidas, então: remove o esqueleto, troca as libs locais de
assets/vendor por versões fixadas na CDN e marca o body como carregando via script.
Uso: python3 tools/build-artifact.py <saida.html>
"""
import re, sys

src = open('index.html', encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)</body>', src, re.S).group(1)

head = re.sub(r'\s*<meta charset[^>]*>|\s*<meta name="viewport"[^>]*>', '', head)
head = head.replace('<title>Suysei — Apresentação da Marca</title>', '<title>Marca Suysei</title>')
head = head.replace('"./assets/vendor/three.module.min.js"', '"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js"')
head = head.replace('"./assets/vendor/jsm/"', '"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"')

cdn = {
    'assets/vendor/gsap.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
    'assets/vendor/ScrollTrigger.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
    'assets/vendor/lenis.min.js': 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js',
}
for a, b in cdn.items():
    assert a in body, a
    body = body.replace(a, b)

out = head.strip() + '\n<script>document.body.classList.add("is-loading")</script>\n' + body.strip() + '\n'
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('ok', len(out))
