// A carpa que sobe, viva: a ilustração oficial (koi-right.png) é desenrolada ao longo da espinha e desenhada
// como uma malha WebGL. A espinha pode nadar em círculos, ondular contra a correnteza ou se contorcer até a
// pose exata do logotipo — no arco, a malha reproduz a imagem original pixel a pixel.
const DEG = Math.PI / 180;
// a carpa ocupa o anel entre os raios R_IN e R_OUT (px da imagem 1200), da cauda (A0) à cabeça (A1)
const IMG = 1200, A0 = 84 * DEG, A1 = -114 * DEG, R_IN = 84, R_OUT = 588, RM = (R_IN + R_OUT) / 2;
export const BODY = RM * Math.abs(A1 - A0); // comprimento da espinha, em px da imagem
const M = 140; // segmentos ao longo do corpo

const VS = `attribute vec2 p; attribute vec2 uv; uniform vec2 res; varying vec2 v;
void main(){ v = uv; gl_Position = vec4(p.x / res.x * 2. - 1., 1. - p.y / res.y * 2., 0., 1.); }`;
const FS = `precision mediump float; varying vec2 v; uniform sampler2D tex; uniform vec3 col; uniform float alpha;
void main(){ float a = texture2D(tex, v).a * alpha; gl_FragColor = vec4(col * a, a); }`;

export class KoiSwim {
  constructor(canvas, color = [1, .165, .216]) {
    this.canvas = canvas; this.color = color;
    const gl = this.gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) return;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = this.prog = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    // texcoords fixos: cada coluna da malha é um raio da ilustração
    const uv = new Float32Array((M + 1) * 4);
    for (let i = 0; i <= M; i++) {
      const a = A0 + (A1 - A0) * i / M, c = Math.cos(a), s = Math.sin(a);
      uv.set([(IMG / 2 + c * R_IN) / IMG, (IMG / 2 + s * R_IN) / IMG, (IMG / 2 + c * R_OUT) / IMG, (IMG / 2 + s * R_OUT) / IMG], i * 4);
    }
    const ub = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const lu = gl.getAttribLocation(pr, 'uv'); gl.enableVertexAttribArray(lu); gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 0, 0);
    this.pos = new Float32Array((M + 1) * 4);
    this.pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.pb); gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
    const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    this.u = { res: gl.getUniformLocation(pr, 'res'), col: gl.getUniformLocation(pr, 'col'), alpha: gl.getUniformLocation(pr, 'alpha') };
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.ready = new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.tex = t; res();
      };
      img.src = 'assets/img/brand/koi-right.png';
    });
    // poses reutilizáveis: espinha (x, y) e normal (nx, ny) por coluna
    this.mk = () => ({ x: new Float32Array(M + 1), y: new Float32Array(M + 1), nx: new Float32Array(M + 1), ny: new Float32Array(M + 1), k: 1 });
    this.A = this.mk(); this.B = this.mk(); this.out = this.mk();
  }
  resize(W, H) {
    const pr = Math.min(devicePixelRatio || 1, 2);
    this.W = W; this.H = H; this.canvas.width = W * pr; this.canvas.height = H * pr;
  }
  // normais a partir da espinha (perpendicular à direção cauda → cabeça)
  static normals(P) {
    for (let i = 0; i <= M; i++) {
      const a = Math.max(0, i - 1), b = Math.min(M, i + 1);
      const tx = P.x[b] - P.x[a], ty = P.y[b] - P.y[a], l = Math.hypot(tx, ty) || 1;
      P.nx[i] = -ty / l; P.ny[i] = tx / l;
    }
    return P;
  }
  // espinha que segue um caminho f(u) para trás a partir da cabeça (comprimento do corpo = BODY * k)
  follow(P, f, uh, k, du = .002) {
    const L = BODY * k, step = L / M;
    let u = uh, q = f(u), acc = 0, i = M;
    P.x[M] = q.x; P.y[M] = q.y;
    for (let it = 0; it < 20000 && i > 0; it++) {
      const n = f(u - du), d = Math.hypot(n.x - q.x, n.y - q.y);
      if (acc + d >= step) { const r = (step - acc) / d; i--; P.x[i] = q.x + (n.x - q.x) * r; P.y[i] = q.y + (n.y - q.y) * r; q = { x: P.x[i], y: P.y[i] }; acc = 0; continue; }
      acc += d; u -= du; q = n;
    }
    P.k = k; return Carp.normals(P);
  }
  // espinha reta, cabeça em (hx, hy) apontando para o ângulo dir
  line(P, hx, hy, dir, k) {
    const L = BODY * k, dx = Math.cos(dir), dy = Math.sin(dir);
    for (let i = 0; i <= M; i++) { const d = (1 - i / M) * L; P.x[i] = hx - dx * d; P.y[i] = hy - dy * d; }
    P.k = k; return Carp.normals(P);
  }
  // ondulação de natação: onda que corre da cabeça à cauda, mais ampla na cauda
  wave(P, t, amp, freq = 1.4, speed = 7) {
    const L = BODY * P.k;
    for (let i = 0; i <= M; i++) {
      const s = i / M, w = amp * L * (.12 + .88 * Math.pow(1 - s, 1.6)) * Math.sin(s * freq * 6.283 + t * speed);
      P.x[i] += P.nx[i] * w; P.y[i] += P.ny[i] * w;
    }
    return Carp.normals(P);
  }
  // a pose do logotipo: centro do símbolo (cx, cy), escala k (px de tela por px da imagem)
  logo(P, cx, cy, k) {
    for (let i = 0; i <= M; i++) {
      const a = A0 + (A1 - A0) * i / M, c = Math.cos(a), s = Math.sin(a);
      P.x[i] = cx + c * RM * k; P.y[i] = cy + s * RM * k; P.nx[i] = c; P.ny[i] = s;
    }
    P.k = k; return P;
  }
  // mistura duas poses; e(s) permite que a cabeça chegue antes da cauda
  mix(A, B, e) {
    const O = this.out;
    for (let i = 0; i <= M; i++) {
      const t = typeof e === 'function' ? e(i / M) : e;
      O.x[i] = A.x[i] + (B.x[i] - A.x[i]) * t; O.y[i] = A.y[i] + (B.y[i] - A.y[i]) * t;
      const nx = A.nx[i] + (B.nx[i] - A.nx[i]) * t, ny = A.ny[i] + (B.ny[i] - A.ny[i]) * t, l = Math.hypot(nx, ny) || 1;
      O.nx[i] = nx / l; O.ny[i] = ny / l;
    }
    const t = typeof e === 'function' ? e(.5) : e;
    O.k = A.k + (B.k - A.k) * t; return O;
  }
  draw(P, alpha = 1) {
    const gl = this.gl; if (!gl || !this.tex) return;
    const pos = this.pos, k = P.k;
    for (let i = 0; i <= M; i++) {
      const ni = (R_IN - RM) * k, no = (R_OUT - RM) * k;
      pos[i * 4] = P.x[i] + P.nx[i] * ni; pos[i * 4 + 1] = P.y[i] + P.ny[i] * ni;
      pos[i * 4 + 2] = P.x[i] + P.nx[i] * no; pos[i * 4 + 3] = P.y[i] + P.ny[i] * no;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (alpha <= 0) return;
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    gl.uniform2f(this.u.res, this.W, this.H); gl.uniform3fv(this.u.col, this.color); gl.uniform1f(this.u.alpha, alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (M + 1) * 2);
  }
  clear() { const gl = this.gl; if (gl) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } }
}
const Carp = KoiSwim;
