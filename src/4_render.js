/* ===================== 4. 그리기 ===================== */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const tcv = document.createElement('canvas'), tctx = tcv.getContext('2d'); // 흔적
let DPR = 1, W = 0, H = 0;
function resize() {
  const r = cv.parentElement.getBoundingClientRect(); DPR = window.devicePixelRatio || 1; W = r.width; H = r.height;
  for (const c of [cv, tcv]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  cv.style.width = W + 'px'; cv.style.height = H + 'px'; tctx.setTransform(DPR, 0, 0, DPR, 0, 0); redraw();
}
function viewRect() { const v = D ? D.view : { x: 0, y: 0 }; return { x0: v.x, y0: v.y, x1: v.x + W, y1: v.y + H }; }
const toS = p => ({ x: p.x - D.view.x, y: p.y - D.view.y });
const toW = p => ({ x: p.x + D.view.x, y: p.y + D.view.y });

/* 이름 표기 */
function nm(id) { const o = obj(id); return o ? (o.lab || '?') : '?'; }
function nameSegs(id) {
  const o = obj(id); if (!o) return [{ t: '?' }];
  if ((o.t === 'seg') && !o.sl0) { const a = obj(o.p[0]), b = obj(o.p[1]); if (a && b && a.lab && b.lab) return [{ t: a.lab + b.lab, ol: 1 }]; }
  if ((o.t === 'ray' || o.t === 'line') && o.lab && !o.sl) { const a = obj(o.p[0]), b = obj(o.p[1]); if (a && b && a.lab && b.lab) return [{ t: a.lab + b.lab, ol: o.t === 'ray' ? 3 : 2 }]; }
  if (o.t === 'poly') return [{ t: o.p.map(nm).join('') }];
  if (o.t === 'cint' || o.t === 'sect' || o.t === 'segm') return nameSegs(o.p[0]);
  if (o.g === 'arc' && o.t === 'arcon') { return [{ t: '호 ' }, { t: nm(o.p[1]) + nm(o.p[2]), arc: 1 }]; }
  return [{ t: o.lab || '?' }];
}
function valueSegs(o) {
  const g = G.get(o.id); const d = o.d; const dg = o.dg ?? D.prefs.digits;
  const val = () => fmtVal(g && g.v, g && g.u, dg);
  const S = (t, x) => ({ t, ...x });
  if (o.t === 'param') return [S(o.lab, { it: 1 }), S(' = ' + val())];
  if (o.t === 'calc') { const names = calcNames(o); return [S(o.lab ? o.lab : astStr(d.ast, names)), S(' = ' + val())]; }
  if (o.t === 'func') { const names = calcNames(o); return [S(o.lab + '(x) = ', { it: 0 }), S(astStr(d.ast, names))]; }
  if (o.t === 'deriv') { const src = obj(o.p[0]); const names = calcNames(src); return [S(o.lab + '(x) = '), S(g && g.ast ? astStr(g.ast, names) : g && g.num ? src.lab + '(x)의 도함수 (수치 미분)' : '정의되지 않음')]; }
  if (o.t !== 'meas') return [S('?')];
  const P = o.p;
  switch (d.m) {
    case 'len': return [S('m '), ...nameSegs(P[0]), S(' = ' + val())];
    case 'dist': return obj(P[1]).g === 'pt' ? [S(nm(P[0]) + nm(P[1]) + ' = ' + val())] : [S('거리 ' + nm(P[0]) + ' ↔ '), ...nameSegs(P[1]), S(' = ' + val())];
    case 'perim': return [S('둘레 '), ...nameSegs(P[0]), S(' = ' + val())];
    case 'circum': return [S('원둘레 '), ...nameSegs(P[0]), S(' = ' + val())];
    case 'ang': return [S('m∠' + P.map(nm).join('') + ' = ' + val())];
    case 'area': return [S('넓이 '), ...nameSegs(P[0]), S(' = ' + val())];
    case 'arcang': return [S('중심각 '), ...(P.length === 3 ? [S(nm(P[1]) + nm(P[2]), { arc: 1 })] : nameSegs(P[0])), S(' = ' + val())];
    case 'arclen': return [S('호의 길이 '), ...(P.length === 3 ? [S(nm(P[1]) + nm(P[2]), { arc: 1 })] : nameSegs(P[0])), S(' = ' + val())];
    case 'rad': return [S('반지름 '), ...nameSegs(P[0]), S(' = ' + val())];
    case 'ratio': return P.length === 2 ? [...nameSegs(P[0]), S(' / '), ...nameSegs(P[1]), S(' = ' + val())] : [S(nm(P[0]) + nm(P[2]) + ' / ' + nm(P[0]) + nm(P[1]) + ' = ' + val())];
    case 'pval': return [S(nm(P[0]) + ' 의 위칫값 = ' + val())];
    case 'coord': return [S(nm(P[1]) + ': (' + (g && isFinite(g.v) ? g.v.toFixed(dg) + ', ' + (polarCS(P[0]) ? fmtVal(g.v2, dimA, dg) : g.v2.toFixed(dg)) : '정의되지 않음') + ')')];
    case 'xc': if (polarCS(P[0])) return [S('r', { it: 1 }), S('_' + nm(P[1]), { sub: 1 }), S(' = ' + val())]; return [S('x', { it: 1 }), S('_' + nm(P[1]), { sub: 1 }), S(' = ' + val())];
    case 'yc': if (polarCS(P[0])) return [S('θ', { it: 1 }), S('_' + nm(P[1]), { sub: 1 }), S(' = ' + val())]; return [S('y', { it: 1 }), S('_' + nm(P[1]), { sub: 1 }), S(' = ' + val())];
    case 'cdist': return [S(nm(P[1]) + nm(P[2]) + ' (좌표거리) = ' + val())];
    case 'slope': return [S('기울기 '), ...nameSegs(P[1]), S(' = ' + val())];
    case 'eq': return [...nameSegs(P[1]), S(': ' + equationStr(o))];
  }
  return [S('?')];
}
function equationStr(o) {
  const cs = G.get(o.p[0]), g = G.get(o.p[1]), gt = obj(o.p[1]).g, dg = D.prefs.digits; if (!cs || !g) return '정의되지 않음';
  const f = v => (Math.abs(v) < 0.5 * Math.pow(10, -dg) ? 0 : v).toFixed(dg);
  const sg = (v, first) => { const s = f(Math.abs(v)); return v < 0 ? (first ? '−' : ' − ') + s : (first ? '' : ' + ') + s; };
  if (gt === 'ln') { const a = wToCs(cs, g.a), b = wToCs(cs, g.b); if (Math.abs(b.x - a.x) < 1e-9) return 'x = ' + f(a.x); const m = (b.y - a.y) / (b.x - a.x), c = a.y - m * a.x; const z = v => Math.abs(v) < 0.5 * Math.pow(10, -dg); if (z(m)) return 'y = ' + f(c); return 'y = ' + (m < 0 ? '−' : '') + f(Math.abs(m)) + 'x' + (z(c) ? '' : sg(c)); }
  const c = wToCs(cs, g.c), r = g.r / cs.u;
  return '(x' + sg(-c.x) + ')² + (y' + sg(-c.y) + ')² = ' + f(r) + '²';
}
function calcNames(o) { return { ref: i => valName(o.p[i]), fref: i => nm(o.p[i]) }; }
function valName(id) { const o = obj(id); if (!o) return '?'; if (o.lab) return o.lab; const segs = valueSegs(o); const s = segs.map(x => x.t).join(''); return s.split(' = ')[0]; }

const polarCS = id => G.get(id)?.form === 'polar';
/* 서식 있는 글자 */
const FONT_UI = '"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo",Arial,sans-serif';
const FONT_LBL = 'italic 15px "Times New Roman",Times,serif';
function richW(c, segs, size) { let w = 0; for (const s of segs) { c.font = segFont(s, size); w += c.measureText(s.t.replace(/^_/, '')).width; } return w; }
function segFont(s, size) { return (s.it ? 'italic ' : '') + (s.sub ? Math.round(size * .75) : size) + 'px ' + (s.it ? '"Times New Roman",serif' : FONT_UI); }
function drawRich(c, segs, x, y, size, col) {
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1; c.textBaseline = 'alphabetic';
  for (const s of segs) {
    const t = s.t.replace(/^_/, ''); c.font = segFont(s, size); const w = c.measureText(t).width;
    c.fillText(t, x, y + (s.sub ? 3 : 0));
    if (s.ol || s.arc) { const yy = y - size * .85; c.beginPath(); if (s.arc) { c.moveTo(x + 1, yy + 2); c.quadraticCurveTo(x + w / 2, yy - 4, x + w - 1, yy + 2); } else { c.moveTo(x + 1, yy); c.lineTo(x + w - 1, yy); if (s.ol >= 2) { c.moveTo(x + w - 4, yy - 3); c.lineTo(x + w - 1, yy); c.lineTo(x + w - 4, yy + 3); } if (s.ol === 2) { c.moveTo(x + 4, yy - 3); c.lineTo(x + 1, yy); c.lineTo(x + 4, yy + 3); } } c.stroke(); }
    x += w;
  }
  return x;
}

/* 개체 그리기 */
function setStroke(c, s, extra = 0) { c.strokeStyle = s.c; c.lineWidth = [1, 1, 2, 3][s.w] + extra; c.setLineDash(s.dash === 1 ? [7, 4] : s.dash === 2 ? [2, 3] : []); c.lineCap = 'round'; c.lineJoin = 'round'; }
function clipLine(g) {
  const vw = viewRect(), pad = 50; const d = V.sub(g.b, g.a), L = V.len(d); if (L < 1e-12) return null;
  const u = V.mul(d, 1 / L), R = Math.hypot(W, H) + 2 * pad, cx = (vw.x0 + vw.x1) / 2, cy = (vw.y0 + vw.y1) / 2;
  const t0 = V.dot(V.sub({ x: cx, y: cy }, g.a), u);
  let ta = t0 - R, tb = t0 + R;
  if (g.k === 'seg') { ta = 0; tb = L; } else if (g.k === 'ray') { ta = 0; tb = Math.max(tb, 1); }
  return [V.add(g.a, V.mul(u, ta)), V.add(g.a, V.mul(u, tb))];
}
function pathGeom(c, g, gt) {
  c.beginPath();
  switch (gt) {
    case 'ln': { const P = clipLine(g); if (!P) return false; c.moveTo(P[0].x, P[0].y); c.lineTo(P[1].x, P[1].y); return true; }
    case 'ci': c.arc(g.c.x, g.c.y, g.r, 0, TAU); return true;
    case 'arc': c.arc(g.c.x, g.c.y, g.r, -g.s, -(g.s + g.sw), true); return true;
    case 'loc': case 'plot': for (const s of g.paths) { s.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); } return true;
    case 'poly': g.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); return true;
    case 'cint': c.arc(g.c.x, g.c.y, g.r, 0, TAU); return true;
    case 'sect': c.moveTo(g.c.x, g.c.y); c.arc(g.c.x, g.c.y, g.r, -g.s, -(g.s + g.sw), true); c.closePath(); return true;
    case 'segm': c.arc(g.c.x, g.c.y, g.r, -g.s, -(g.s + g.sw), true); c.closePath(); return true;
    case 'draw': g.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); return true;
  }
  return false;
}
const isFill = gt => gt === 'poly' || gt === 'cint' || gt === 'sect' || gt === 'segm';
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function drawGeom(c, o, g, gt, opt = {}) {
  let s = o.s;
  if (gt === 'img') { drawImg(c, o, g); return; }
  if (gt === 'tpts') { for (const p of g.pts) { c.setLineDash([]); c.beginPath(); c.arc(p.x, p.y, [1.5, 2.5, 3.5, 4.5][s.ps] ?? 3.5, 0, TAU); c.fillStyle = opt.col || s.c; c.fill(); } return; }
  if (s.pc) { const col = paramColor(s.pc); if (col) { s = { ...s, c: col }; } }
  if (gt === 'pt') { const r = [1.5, 2.5, 3.5, 4.5][s.ps] ?? 3.5; c.setLineDash([]); c.beginPath(); c.arc(g.x, g.y, r, 0, TAU); c.fillStyle = opt.col || s.c; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.65)'; c.stroke(); return; }
  if (isFill(gt)) { if (!pathGeom(c, g, gt)) return; c.fillStyle = hexA(opt.col || s.c, opt.alpha ?? s.op); c.fill(); return; }
  if (gt === 'loc' && g.env) { setStroke(c, s); c.strokeStyle = opt.col || s.c; c.globalAlpha = .7; for (const e of g.env) if (e.g) { if (e.gt === 'pt') continue; pathGeom(c, e.g, e.gt); c.lineWidth = 1; c.stroke(); } c.globalAlpha = 1; }
  if (!pathGeom(c, g, gt)) return; setStroke(c, s); if (opt.col) c.strokeStyle = opt.col; c.stroke(); c.setLineDash([]);
  if (gt === 'ln' && o.d && o.d.ticks && g.k === 'seg') drawTicks(c, g, o.d.ticks, s);
}
function drawTicks(c, g, n, s) {
  const m = V.lerp(g.a, g.b, .5), u = V.norm(V.sub(g.b, g.a)), p = V.perp(u); c.beginPath();
  for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 4, q = V.add(m, V.mul(u, off)); c.moveTo(q.x + p.x * 6, q.y + p.y * 6); c.lineTo(q.x - p.x * 6, q.y - p.y * 6); }
  c.lineWidth = 1.5; c.strokeStyle = s.c; c.stroke();
}
function drawAMark(c, o, g) {
  const a1 = ang(g.b, g.a), a2 = ang(g.b, g.c); let sw = n2pi(a2 - a1), s0 = a1; if (sw > PI) { s0 = a2; sw = TAU - sw; }
  const r = o.d.r || 22; c.setLineDash([]); c.strokeStyle = o.s.c; c.lineWidth = 1.2; c.beginPath();
  if (Math.abs(sw - PI / 2) < 1e-3) { const u = V.norm(V.sub(g.a, g.b)), w = V.norm(V.sub(g.c, g.b)), k = r * .6; const p1 = V.add(g.b, V.mul(u, k)), p3 = V.add(g.b, V.mul(w, k)), p2 = V.add(p1, V.mul(w, k)); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); }
  else for (let k = 0; k < (o.d.n || 1); k++) { const rr = r + k * 4; c.moveTo(g.b.x + rr * Math.cos(s0), g.b.y - rr * Math.sin(s0)); c.arc(g.b.x, g.b.y, rr, -s0, -(s0 + sw), true); }
  c.stroke();
}
/* 좌표계: 격자·눈금 (정사각형·직사각형·극좌표) */
function niceStep(px) { let step = 1; if (px < 18) step = Math.pow(10, Math.ceil(Math.log10(18 / px))); else { while (px * step / 10 >= 18) step /= 10; } if (px * step / 5 >= 18) step /= 5; else if (px * step / 2 >= 18) step /= 2; return step; }
function drawCS(c, o, g) {
  const vw = viewRect(); const ux = g.u, uy = g.uy || g.u;
  const stx = niceStep(ux), sty = niceStep(uy);
  const sx = Math.floor(((vw.x0 - g.o.x) / ux) / stx) * stx, ex = (vw.x1 - g.o.x) / ux, sy = Math.floor((-(vw.y1 - g.o.y) / uy) / sty) * sty, ey = -(vw.y0 - g.o.y) / uy;
  if (o.d.grid !== false) {
    c.setLineDash(o.d.dots ? [1, 4] : []); c.strokeStyle = '#d7dce4'; c.lineWidth = 1; c.beginPath();
    if (o.d.form === 'polar') {
      const far = Math.max(...[[vw.x0, vw.y0], [vw.x1, vw.y0], [vw.x0, vw.y1], [vw.x1, vw.y1]].map(([x, y]) => Math.hypot(x - g.o.x, y - g.o.y)));
      for (let r = stx; r * ux <= far; r += stx) { c.moveTo(g.o.x + r * ux, g.o.y); c.arc(g.o.x, g.o.y, r * ux, 0, TAU); }
      for (let k = 0; k < 24; k++) { if (k % 6 === 0) continue; const a = k * PI / 12; c.moveTo(g.o.x, g.o.y); c.lineTo(g.o.x + far * Math.cos(a), g.o.y - far * Math.sin(a)); }
    } else {
      for (let x = sx; x <= ex; x += stx) { const X = Math.round(g.o.x + x * ux) + .5; c.moveTo(X, vw.y0); c.lineTo(X, vw.y1); }
      for (let y = sy; y <= ey; y += sty) { const Y = Math.round(g.o.y - y * uy) + .5; c.moveTo(vw.x0, Y); c.lineTo(vw.x1, Y); }
    }
    c.stroke(); c.setLineDash([]);
  }
  c.fillStyle = '#333'; c.font = '11px ' + FONT_UI; c.strokeStyle = '#222'; c.lineWidth = 1; c.beginPath();
  const lab = v => Math.abs(v) < 1e-9 ? '' : String(+v.toFixed(6));
  const evx = Math.max(1, Math.round(36 / (ux * stx))), evy = Math.max(1, Math.round(24 / (uy * sty)));
  for (let x = sx; x <= ex; x += stx) { const X = g.o.x + x * ux; c.moveTo(X, g.o.y - 3); c.lineTo(X, g.o.y + 3); if (Math.round(x / stx) % evx === 0) { c.textAlign = 'center'; c.fillText(lab(x), X, g.o.y + 14); } }
  for (let y = sy; y <= ey; y += sty) { const Y = g.o.y - y * uy; c.moveTo(g.o.x - 3, Y); c.lineTo(g.o.x + 3, Y); if (Math.round(y / sty) % evy === 0) { c.textAlign = 'right'; c.fillText(lab(y), g.o.x - 6, Y + 4); } }
  c.stroke(); c.textAlign = 'left';
}

/* 상자형 개체(측정값·글·버튼) */
const BOX = new Map(); // id -> {x,y,w,h} 월드
function boxSegs(o) {
  if (o.t === 'text') return null;
  if (o.t === 'btn') return [{ t: o.d.label || '버튼' }];
  return valueSegs(o);
}
function drawBox(c, o) {
  const g = G.get(o.id); const x = o.d.x, y = o.d.y; const size = o.d.fs || 14;
  if (o.t === 'iter') { drawIterTable(c, o, g); return; }
  if (o.t === 'text') {
    const lines = (o.d.text || '').split('\n'); c.font = (o.d.it ? 'italic ' : '') + (o.d.b ? 'bold ' : '') + size + 'px ' + (o.d.ff || FONT_UI); let w = 0; for (const L of lines) w = Math.max(w, c.measureText(L).width);
    const h = lines.length * (size + 5); c.fillStyle = o.s.c; c.textBaseline = 'alphabetic'; lines.forEach((L, i) => c.fillText(L, x + 2, y + size + i * (size + 5)));
    BOX.set(o.id, { x, y, w: w + 4, h: h + 2 }); return;
  }
  if (o.t === 'btn') {
    const segs = [{ t: o.d.label || '버튼' }]; const w = richW(c, segs, 13) + 22, h = 22;
    c.fillStyle = '#f3f3f3'; c.strokeStyle = '#8a8a8a'; c.lineWidth = 1; c.setLineDash([]); c.beginPath(); c.roundRect ? c.roundRect(x + .5, y + .5, w, h, 3) : c.rect(x + .5, y + .5, w, h); c.fill(); c.stroke();
    c.fillStyle = '#444'; c.beginPath(); c.arc(x + 9, y + h / 2 + .5, 3.5, 0, TAU); c.fill();
    drawRich(c, segs, x + 17, y + 15.5, 13, '#111'); BOX.set(o.id, { x, y, w, h }); return;
  }
  if (o.t === 'table') { drawTable(c, o); return; }
  const segs = boxSegs(o); const w = richW(c, segs, size) + 6, h = size + 8;
  if (o.t === 'param') { c.fillStyle = '#fff'; c.strokeStyle = '#999'; c.lineWidth = 1; c.setLineDash([]); c.strokeRect(x + .5, y + .5, w, h); }
  drawRich(c, segs, x + 3, y + size + 2, size, o.s.c);
  BOX.set(o.id, { x, y, w, h });
}
function drawTable(c, o) {
  const x = o.d.x, y = o.d.y, cols = o.p.map(id => obj(id)); const rows = [cols.map(cc => valName(cc.id))];
  const cur = cols.map(cc => { const g = G.get(cc.id); return g ? fmtVal(g.v, null, cc.dg ?? D.prefs.digits) : '—'; });
  for (const r of (o.d.rows || [])) rows.push(r);
  if (!o.d.rows || !o.d.rows.length || o.d.live !== false) rows.push(cur);
  c.font = '13px ' + FONT_UI; const cw = cols.map((_, j) => Math.max(...rows.map(r => c.measureText(String(r[j])).width)) + 16), rh = 20;
  let X = x; c.strokeStyle = '#555'; c.lineWidth = 1; c.setLineDash([]);
  const tw = cw.reduce((a, b) => a + b, 0), th = rows.length * rh;
  c.fillStyle = '#fff'; c.fillRect(x, y, tw, th); c.fillStyle = '#eceef2'; c.fillRect(x, y, tw, rh);
  c.strokeRect(x + .5, y + .5, tw, th);
  rows.forEach((r, i) => { X = x; r.forEach((v, j) => { c.fillStyle = '#111'; c.fillText(String(v), X + 8, y + i * rh + 14); X += cw[j]; if (j < r.length - 1) { c.beginPath(); c.moveTo(X + .5, y); c.lineTo(X + .5, y + th); c.stroke(); } }); if (i) { c.beginPath(); c.moveTo(x, y + i * rh + .5); c.lineTo(x + tw, y + i * rh + .5); c.stroke(); } });
  BOX.set(o.id, { x, y, w: tw, h: th });
}
/* 이름표 */
const LBOX = new Map();
function labelAnchor(o, g) {
  switch (o.g) {
    case 'pt': return g;
    case 'ln': { const P = clipLine(g); if (!P) return null; if (g.k === 'seg') return V.lerp(g.a, g.b, .5); const vw = viewRect(); const m = V.lerp(P[0], P[1], .5); return { x: clamp(m.x, vw.x0 + 20, vw.x1 - 30), y: clamp(m.y, vw.y0 + 20, vw.y1 - 20) }; }
    case 'ci': return onCirc(g.c, g.r, PI / 4);
    case 'arc': return arcAt(g, .5);
    case 'loc': case 'plot': { const s = g.paths[0]; return s ? s[Math.floor(s.length * .7)] : null; }
    case 'poly': return g.pts[0];
  }
  return null;
}
function drawLabel(c, o, g) {
  const a = labelAnchor(o, g); if (!a) return;
  const def = o.g === 'pt' ? { x: 7, y: -7 } : o.g === 'ln' ? { x: 6, y: -8 } : { x: 6, y: -6 };
  const off = o.lo || def; c.font = FONT_LBL; const w = c.measureText(o.lab).width;
  const x = a.x + off.x, y = a.y + off.y;
  c.fillStyle = '#000'; c.textBaseline = 'alphabetic'; c.fillText(o.lab, x, y);
  LBOX.set(o.id, { x, y: y - 13, w, h: 16, ax: a.x, ay: a.y });
}

/* 메인 그리기 */
let hoverId = null, preview = null, needDraw = true;
function redraw() { needDraw = true; }
function draw() {
  if (!D) return;
  evaluate();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(tcv, 0, 0, W, H);
  ctx.save(); ctx.translate(-D.view.x, -D.view.y);
  BOX.clear(); LBOX.clear();
  const selSet = new Set(SEL);
  const vis = ORDER.filter(o => !o.h || SHOWHID);
  const layer = o => o.t === 'cs' ? 0 : o.g === 'img' ? 0.5 : isFill(o.g) ? 1 : o.t === 'iter' ? 2 : (o.g === 'loc' || o.g === 'plot' || o.g === 'draw' || o.t === 'amark') ? 3 : ['ln', 'ci', 'arc'].includes(o.g) ? 4 : o.g === 'pt' ? 5 : 6;
  const sorted = vis.slice().sort((a, b) => (layer(a) - layer(b)) || ((a.z || 0) - (b.z || 0)));
  for (const o of sorted) {
    const g = G.get(o.id); if (!g) continue;
    if (o.h) ctx.globalAlpha = .3;
    if (o.t === 'cs') drawCS(ctx, o, g);
    else if (isBoxObj(o)) { }
    else if (o.t === 'iter') { for (const it of g.items || []) { const so = obj(it.id); if (so) drawGeom(ctx, so, it.g, so.g); } }
    else if (o.t === 'amark') drawAMark(ctx, o, g);
    else if (isBoxObj(o)) { /* 나중에 */ }
    else drawGeom(ctx, o, g, o.g);
    ctx.globalAlpha = 1;
  }
  // 선택·강조
  for (const o of sorted) { const g = G.get(o.id); if (!g) continue; if (selSet.has(o.id)) drawSel(ctx, o, g); else if (o.id === hoverId) drawHover(ctx, o, g); }
  // 이름표
  for (const o of sorted) { if (!o.sl || !o.lab || o.g === 'val' || o.g === 'fn') continue; const g = G.get(o.id); if (g) drawLabel(ctx, o, g); }
  // 상자형
  for (const o of sorted) { if (isBoxObj(o)) { if (o.h) ctx.globalAlpha = .35; drawBox(ctx, o); ctx.globalAlpha = 1; const b = BOX.get(o.id); if (b && (selSet.has(o.id) || o.id === hoverId)) { ctx.setLineDash(selSet.has(o.id) ? [] : [3, 3]); ctx.strokeStyle = selSet.has(o.id) ? '#3060ff' : '#9ab'; ctx.lineWidth = 1; ctx.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3); ctx.setLineDash([]); } } }
  // 변환 지정 표시
  drawMarks(ctx);
  if (preview) drawPreview(ctx, preview);
  ctx.restore();
  if (MARQ) { ctx.setLineDash([4, 3]); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; const r = MARQ; ctx.strokeRect(Math.min(r.x0, r.x1) + .5, Math.min(r.y0, r.y1) + .5, Math.abs(r.x1 - r.x0), Math.abs(r.y1 - r.y0)); ctx.setLineDash([]); }
  drawTraces();
}
function drawSel(c, o, g) {
  c.save(); c.setLineDash([]);
  if (o.g === 'img') { c.strokeStyle = '#3060ff'; c.lineWidth = 1.5; const P = [g.o, V.add(g.o, g.ux), V.add(V.add(g.o, g.ux), g.uy), V.add(g.o, g.uy)]; c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.stroke(); c.restore(); return; }
  if (o.g === 'tpts') { for (const p of g.pts) { c.beginPath(); c.arc(p.x, p.y, 6, 0, TAU); c.strokeStyle = '#1a1a1a'; c.stroke(); } c.restore(); return; }
  const sq = p => { c.fillStyle = '#ffffff'; c.strokeStyle = '#1a1a1a'; c.lineWidth = 1; c.fillRect(p.x - 3, p.y - 3, 6, 6); c.strokeRect(p.x - 3 + .5, p.y - 3 + .5, 5, 5); };
  if (o.g === 'pt') { const r = [1.5, 2.5, 3.5, 4.5][o.s.ps] + 3.5; c.beginPath(); c.arc(g.x, g.y, r, 0, TAU); c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.2; c.stroke(); c.beginPath(); c.arc(g.x, g.y, r + 2, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); }
  else if (o.g === 'ln') { const P = clipLine(g); if (P) { drawGeom(c, o, g, 'ln', { col: '#ffb000' }); c.globalAlpha = .9; const a = g.k === 'seg' ? g.a : P[0], b = g.k === 'seg' ? g.b : P[1]; [.3, .5, .7].forEach(t => sq(V.lerp(a, b, g.k === 'seg' ? t : t))); } }
  else if (o.g === 'ci') { c.globalAlpha = .55; pathGeom(c, g, 'ci'); c.strokeStyle = '#ffb000'; c.lineWidth = 6; c.stroke(); c.globalAlpha = 1; drawGeom(c, o, g, 'ci'); [0, .5, 1, 1.5].forEach(k => sq(onCirc(g.c, g.r, k * PI + PI / 4))); }
  else if (o.g === 'arc') { c.globalAlpha = .55; pathGeom(c, g, 'arc'); c.strokeStyle = '#ffb000'; c.lineWidth = 6; c.stroke(); c.globalAlpha = 1; drawGeom(c, o, g, 'arc'); [.25, .5, .75].forEach(t => sq(arcAt(g, t))); }
  else if (isFill(o.g)) { pathGeom(c, g, o.g); c.fillStyle = 'rgba(255,176,0,.12)'; c.fill(); c.save(); c.clip(); c.strokeStyle = 'rgba(80,80,80,.55)'; c.lineWidth = 1; const vw = viewRect(); c.beginPath(); for (let k = vw.x0 - H; k < vw.x1 + H; k += 7) { c.moveTo(k, vw.y0); c.lineTo(k + (vw.y1 - vw.y0), vw.y1); } c.stroke(); c.restore(); }
  else if (o.g === 'loc' || o.g === 'plot' || o.g === 'draw') { c.globalAlpha = .55; pathGeom(c, g, o.g); c.strokeStyle = '#ffb000'; c.lineWidth = 6; c.stroke(); c.globalAlpha = 1; drawGeom(c, o, g, o.g); }
  else if (o.t === 'amark') { c.globalAlpha = .6; c.beginPath(); c.arc(g.b.x, g.b.y, (o.d.r || 22), 0, TAU); c.strokeStyle = '#ffb000'; c.lineWidth = 3; c.stroke(); }
  c.restore();
}
function drawHover(c, o, g) {
  c.save(); c.setLineDash([]); c.globalAlpha = .45;
  if (o.g === 'pt') { c.beginPath(); c.arc(g.x, g.y, 8, 0, TAU); c.fillStyle = '#4a90e2'; c.fill(); }
  else if (isFill(o.g)) { pathGeom(c, g, o.g); c.fillStyle = 'rgba(74,144,226,.25)'; c.fill(); }
  else if (['ln', 'ci', 'arc', 'loc', 'plot', 'draw'].includes(o.g)) { pathGeom(c, g, o.g); c.strokeStyle = '#4a90e2'; c.lineWidth = 6; c.stroke(); }
  c.restore();
}
function drawMarks(c) {
  const m = D.marks; c.save(); c.setLineDash([]);
  if (m.center) { const g = G.get(m.center.ids[0]); if (g) { c.strokeStyle = '#d00'; c.lineWidth = 1; c.beginPath(); c.arc(g.x, g.y, 9, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(g.x - 13, g.y); c.lineTo(g.x + 13, g.y); c.moveTo(g.x, g.y - 13); c.lineTo(g.x, g.y + 13); c.stroke(); } }
  c.restore();
}
function drawPreview(c, pv) {
  c.save(); c.globalAlpha = .55; c.setLineDash([5, 4]); c.strokeStyle = '#333'; c.lineWidth = 1.5;
  for (const it of pv.items || []) {
    const gt = it.gt, g = it.g; if (!g) continue;
    if (gt === 'pt') { c.setLineDash([]); c.beginPath(); c.arc(g.x, g.y, 3.5, 0, TAU); c.fillStyle = '#e0201b'; c.fill(); c.setLineDash([5, 4]); continue; }
    if (pathGeom(c, g, gt)) { if (isFill(gt)) { c.fillStyle = 'rgba(242,184,48,.3)'; c.fill(); } else c.stroke(); }
  }
  if (pv.ghost) { for (const it of pv.ghost) { const so = obj(it.id); if (so && it.g) drawGeom(c, so, it.g, so.g, { col: '#888' }); } }
  c.restore();
}
/* 흔적 */
let SHOWHID = false;
const lastTrace = new Map();
function drawTraces() {
  let any = false;
  for (const o of D.objs) {
    if (!o.tr || o.h) continue; const g = G.get(o.id); if (!g) continue; any = true;
    const key = JSON.stringify(g); if (lastTrace.get(o.id) === key) continue; lastTrace.set(o.id, key);
    tctx.save(); tctx.translate(-D.view.x, -D.view.y);
    if (o.g === 'pt') { tctx.beginPath(); tctx.arc(g.x, g.y, [1, 1.5, 2, 2.5][o.s.ps], 0, TAU); tctx.fillStyle = o.s.c; tctx.globalAlpha = .9; tctx.fill(); }
    else if (['ln', 'ci', 'arc', 'loc', 'poly', 'cint', 'sect', 'segm'].includes(o.g)) { if (pathGeom(tctx, g, o.g)) { if (isFill(o.g)) { tctx.fillStyle = hexA(o.s.c, .12); tctx.fill(); } else { tctx.strokeStyle = o.s.c; tctx.globalAlpha = .55; tctx.lineWidth = 1; tctx.stroke(); } } }
    tctx.restore();
  }
}
function eraseTraces() { tctx.clearRect(0, 0, W, H); lastTrace.clear(); redraw(); }
