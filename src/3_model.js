/* ===================== 3. 문서 모델 · 의존 그래프 · 계산 ===================== */
/* 객체: {id,t,g,p:[부모 id],d:{정의},s:{색,굵기,점선,점크기},h:숨김,lab,sl:이름보임,lo:이름위치,tr:흔적} */
const PREFS0 = { lenUnit: 'cm', angUnit: 'deg', digits: 2, autoLabelPts: true, autoLabelOther: false, snap: false };
let D = null; // 현재 문서
function newDoc() {
  return { objs: [], next: 1, prefs: { ...PREFS0 }, marks: {}, tools: [], view: { x: 0, y: 0 }, lc: { pt: 0, ln: 0, ci: 0, pa: 0, fn: 0 }, name: '제목없음1' };
}
const byId = new Map();
let ORDER = [], KIDS = new Map(), G = new Map(), structDirty = true;
function obj(id) { if (structDirty) rebuildIndex(); return byId.get(id); }
function rebuildIndex() {
  byId.clear(); for (const o of D.objs) byId.set(o.id, o);
  KIDS = new Map(); for (const o of D.objs) for (const p of o.p) { if (!KIDS.has(p)) KIDS.set(p, []); KIDS.get(p).push(o.id); }
  // 위상 정렬
  const seen = new Set(), out = [];
  const visit = (o, stack) => { if (seen.has(o.id)) return; if (stack.has(o.id)) return; stack.add(o.id); for (const p of o.p) { const q = byId.get(p); if (q) visit(q, stack); } stack.delete(o.id); seen.add(o.id); out.push(o); };
  for (const o of D.objs) visit(o, new Set());
  ORDER = out; structDirty = false;
}
function descendants(ids, inclusive = true) {
  const out = new Set(inclusive ? ids : []), st = [...ids];
  while (st.length) { const k = KIDS.get(st.pop()) || []; for (const c of k) if (!out.has(c)) { out.add(c); st.push(c); } }
  if (!inclusive) for (const i of ids) out.delete(i);
  return out;
}
function ancestors(ids, inclusive = true) {
  const out = new Set(inclusive ? ids : []), st = [...ids];
  while (st.length) { const o = byId.get(st.pop()); if (!o) continue; for (const p of o.p) if (!out.has(p)) { out.add(p); st.push(p); } }
  return out;
}
/* --- 단위 --- */
function lenK() { return D.prefs.lenUnit === 'cm' ? 1 / 37.7952755906 : D.prefs.lenUnit === 'inch' ? 1 / 96 : 1; }
function lenName() { return D.prefs.lenUnit === 'cm' ? 'cm' : D.prefs.lenUnit === 'inch' ? 'in' : 'px'; }
function angK() { return D.prefs.angUnit === 'deg' ? 180 / PI : 1; }
const dimL = (k = 1) => ({ L: k, A: 0 }), dimA = { L: 0, A: 1 };
function unitStr(u) {
  if (!u) return '';
  if (u.A === 1 && !u.L) return D.prefs.angUnit === 'deg' ? '°' : ' 라디안';
  if (u.L && !u.A) { const s = lenName(); return u.L === 1 ? ' ' + s : u.L === 2 ? ' ' + s + '²' : u.L === 3 ? ' ' + s + '³' : ' ' + s + '^' + u.L; }
  return '';
}
function fmtVal(v, u, digits) { const d = digits ?? D.prefs.digits; if (v == null || !isFinite(v)) return '정의되지 않음'; return v.toFixed(d) + unitStr(u); }
/* 길이값(측정·매개변수)을 화면 px로 */
function valToPx(g) { if (!g) return null; return (g.u && g.u.L === 1) ? g.v / lenK() : g.v / lenK(); }
function valToRad(g) { if (!g) return null; if (g.u && g.u.A === 1) return g.v / angK(); return g.v * PI / 180; }

/* --- 변환 --- */
function makeT(tf, P) {
  switch (tf.k) {
    case 'tr': {
      let dx, dy;
      if (tf.m === 'vec') { const a = P[tf.a], b = P[tf.b]; if (!a || !b) return null; dx = b.x - a.x; dy = b.y - a.y; }
      else if (tf.m === 'rect') { dx = tf.dx / lenK(); dy = -tf.dy / lenK(); }
      else if (tf.m === 'polar') { const r = tf.dv != null ? valToPx(P[tf.dv]) : tf.r / lenK(); const th = tf.av != null ? valToRad(P[tf.av]) : tf.deg * PI / 180; if (r == null || th == null) return null; dx = r * Math.cos(th); dy = -r * Math.sin(th); }
      return p => ({ x: p.x + dx, y: p.y + dy });
    }
    case 'rot': {
      const c = P[tf.c]; if (!c) return null; let th;
      if (tf.am === 'fix') th = tf.deg * PI / 180;
      else if (tf.am === 'val') { th = valToRad(P[tf.a]); }
      else if (tf.am === 'pts') { const A = P[tf.a], Bp = P[tf.b], Cp = P[tf.cc]; if (!A || !Bp || !Cp) return null; th = n2pi(ang(Bp, Cp) - ang(Bp, A)); if (th > PI) th -= TAU; }
      if (th == null || !isFinite(th)) return null;
      const cs = Math.cos(th), sn = Math.sin(th);
      return p => { const dx = p.x - c.x, dy = -(p.y - c.y); return { x: c.x + dx * cs - dy * sn, y: c.y - (dx * sn + dy * cs) }; };
    }
    case 'dil': {
      const c = P[tf.c]; if (!c) return null; let k;
      if (tf.rm === 'fix') k = tf.num / tf.den;
      else if (tf.rm === 'val') k = P[tf.a] ? P[tf.a].v : null;
      else if (tf.rm === 'segs') { const a = P[tf.a], b = P[tf.b]; if (!a || !b) return null; const la = V.dist(a.a, a.b), lb = V.dist(b.a, b.b); k = la / lb; }
      else if (tf.rm === 'pts3') { const A = P[tf.a], Bp = P[tf.b], Cp = P[tf.cc]; if (!A || !Bp || !Cp) return null; const d1 = V.sub(Bp, A), d2 = V.sub(Cp, A); k = V.dot(d2, d1) / V.dot(d1, d1); }
      if (k == null || !isFinite(k)) return null;
      return p => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k });
    }
    case 'ref': {
      const m = P[tf.m]; if (!m) return null; const d = V.norm(V.sub(m.b, m.a));
      return p => { const w = V.sub(p, m.a), proj = V.add(m.a, V.mul(d, V.dot(w, d))); return V.sub(V.mul(proj, 2), p); };
    }
  }
  return null;
}
function xfGeom(g, gt, T) {
  if (!g || !T) return null;
  switch (gt) {
    case 'pt': return T(g);
    case 'ln': return { k: g.k, a: T(g.a), b: T(g.b) };
    case 'ci': case 'cint': { const c = T(g.c), q = T({ x: g.c.x + g.r, y: g.c.y }); return { c, r: V.dist(c, q) }; }
    case 'arc': case 'sect': case 'segm': { const P = arc3pts(g).map(T); const a = arcFrom3(P[0], P[1], P[2]); return a; }
    case 'poly': return { pts: g.pts.map(T) };
    case 'loc': return { paths: g.paths.map(s => s.map(T)), env: g.env ? g.env.map(e => ({ gt: e.gt, g: xfGeom(e.g, e.gt, T) })) : null };
    case 'draw': return { pts: g.pts.map(T) };
    case 'img': { const o2 = T(g.o), a = T(V.add(g.o, g.ux)), b = T(V.add(g.o, g.uy)); return { o: o2, ux: V.sub(a, o2), uy: V.sub(b, o2), clip: g.clip ? g.clip.map(T) : null }; }
    case 'tpts': return { pts: g.pts.map(T) };
  }
  return null;
}

/* --- 개체 정의별 계산 --- */
const CS = () => { const m = D.marks && D.marks.cs; if (m) { const o = D.objs.find(x => x.id === m.ids[0] && x.t === 'cs'); if (o) return o; } return D.objs.find(o => o.t === 'cs'); };
const axisOf = (cs, w) => cs && D.objs.find(o => o.t === 'axis' && o.p[0] === cs.id && o.d.w === w);
function compute(o, Gf) {
  const P = o.p.map(id => Gf(id));
  const need = n => { for (let i = 0; i < n; i++) if (!P[i]) return false; return true; };
  const d = o.d;
  switch (o.t) {
    case 'free': return { x: d.x, y: d.y };
    case 'on': { if (!P[0]) return null; return pathPoint(P[0], obj(o.p[0]).g, d.t); }
    case 'int': { if (!need(2)) return null; const r = intersections(P[0], obj(o.p[0]).g, P[1], obj(o.p[1]).g); return r[d.k] || null; }
    case 'mid': { if (!need(1)) return null; const g = P[0]; return V.lerp(g.a, g.b, .5); }
    case 'mid2': { if (!need(2)) return null; return V.lerp(P[0], P[1], .5); }
    case 'unit': { if (!need(1)) return null; return { x: P[0].x + d.d, y: P[0].y }; }
    case 'coord': { if (!need(1)) return null; const cs = P[0]; if (d.m === 'val') { if (!P[1] || !P[2]) return null; return csToW(cs, P[1].v, P[2].v); } return csToW(cs, d.x, d.y); }
    case 'fpt': { if (!need(3)) return null; const f = P[1].f, x = P[2].v, y = f(x); if (!isFinite(y)) return null; return csToW(P[0], x, y); }
    case 'seg': case 'ray': case 'line': { if (!need(2)) return null; if (V.dist(P[0], P[1]) < 1e-9) return null; return { k: o.t, a: P[0], b: P[1] }; }
    case 'par': { if (!need(2)) return null; const L = P[1]; return { k: 'line', a: P[0], b: V.add(P[0], V.sub(L.b, L.a)) }; }
    case 'perp': { if (!need(2)) return null; const L = P[1]; return { k: 'line', a: P[0], b: V.add(P[0], V.perp(V.sub(L.b, L.a))) }; }
    case 'bis': { if (!need(3)) return null; const u = V.norm(V.sub(P[0], P[1])), w = V.norm(V.sub(P[2], P[1])); let m = V.add(u, w); if (V.len(m) < 1e-9) m = V.perp(u); return { k: 'ray', a: P[1], b: V.add(P[1], V.mul(V.norm(m), 50)) }; }
    case 'axis': { if (!need(1)) return null; const cs = P[0]; return d.w === 'x' ? { k: 'line', a: cs.o, b: { x: cs.o.x + 1, y: cs.o.y } } : { k: 'line', a: cs.o, b: { x: cs.o.x, y: cs.o.y - 1 } }; }
    case 'circ': { if (!need(2)) return null; return { c: P[0], r: V.dist(P[0], P[1]) }; }
    case 'circr': { if (!need(2)) return null; const src = obj(o.p[1]); const r = src.g === 'ln' ? V.dist(P[1].a, P[1].b) : valToPx(P[1]); if (!(r >= 0)) return null; return { c: P[0], r: Math.abs(r) }; }
    case 'arcon': { if (!need(3)) return null; const c = P[0].c, s = ang(c, P[1]), e = ang(c, P[2]); let sw = n2pi(e - s); if (sw < 1e-9) sw = TAU; return { c, r: P[0].r, s, sw }; }
    case 'arcc': { if (!need(3)) return null; const c = P[0], r = V.dist(c, P[1]), s = ang(c, P[1]), e = ang(c, P[2]); let sw = n2pi(e - s); if (sw < 1e-9) sw = TAU; return { c, r, s, sw }; }
    case 'arc3': { if (!need(3)) return null; return arcFrom3(P[0], P[1], P[2]); }
    case 'poly': { if (!need(P.length)) return null; return { pts: P.map(p => ({ x: p.x, y: p.y })) }; }
    case 'cint': { if (!need(1)) return null; return { c: P[0].c, r: P[0].r }; }
    case 'sect': case 'segm': { if (!need(1)) return null; return { ...P[0] }; }
    case 'xf': { if (!P[0]) return null; const T = makeT(d.tf, P); if (!T) return null; return xfGeom(P[0], o.g, T); }
    case 'cs': { if (!need(2)) return null; let u = Math.max(1e-6, V.dist(P[0], P[1]));
      if (d.ilen != null && P[d.ilen]) { const L = P[d.ilen]; const v = L.a ? V.dist(L.a, L.b) : L.r != null ? L.r : valToPx(L); if (v > 1e-6) u = v; }
      const iuy = d.iuy ?? (d.form === 'rect' ? 2 : null);
      return { o: P[0], u, uy: d.form === 'rect' && iuy != null && P[iuy] ? Math.max(1e-6, V.dist(P[0], P[iuy])) : u, grid: d.grid, form: d.form || 'square' }; }
    case 'unity': { if (!need(1)) return null; return { x: P[0].x, y: P[0].y - d.d }; }
    case 'loc': return computeLocus(o, P);
    case 'param': return { v: d.v, u: d.u === 'L' ? dimL() : d.u === 'A' ? dimA : null };
    case 'calc': {
      const R = P.map(g => g && g.v); if (R.some(v => v == null || !isFinite(v))) return { v: NaN, u: null };
      const U = P.map(g => g && g.u); const u = dimOf(d.ast, U);
      return { v: evalAst(d.ast, { R, F: P.map(g => g && g.f), deg: D.prefs.angUnit === 'deg' }), u: isZ(u) ? null : u };
    }
    case 'meas': return measure(o, P);
    case 'func': case 'deriv': return computeFunc(o, P);
    case 'plot': { if (!need(2)) return null; return { cs: P[0], f: P[1].f, paths: samplePlot(P[0], P[1].f, d) }; }
    case 'text': case 'btn': case 'table': return { x: d.x, y: d.y };
    case 'xval': { if (!need(2)) return null; return isFinite(P[1].v) ? csToW(P[0], P[1].v, 0) : null; }
    case 'tplot': { if (!need(2)) return null; const tb = obj(o.p[1]); const rows = (tb.d.rows || []).map(r => r.map(Number)); const pts = rows.filter(r => isFinite(r[d.cx]) && isFinite(r[d.cy])).map(r => csToW(P[0], r[d.cx], r[d.cy])); return { pts }; }
    case 'pplot': { if (!need(3)) return null; const fx = P[1].f, fy = P[2].f, N = d.n || 400, out = []; let cur = [];
      for (let i = 0; i <= N; i++) { const t = d.t0 + (d.t1 - d.t0) * i / N, x = fx(t), y = fy(t); if (!isFinite(x) || !isFinite(y)) { if (cur.length > 1) out.push(cur); cur = []; continue; } cur.push(csToW(P[0], x, y)); }
      if (cur.length > 1) out.push(cur); return { paths: out, env: null }; }
    case 'img': { const n = d.anchors || 0; if (P.slice(0, n).some(x => !x)) return null;
      let box; if (n === 0) box = { o: { x: d.x, y: d.y }, ux: { x: d.w, y: 0 }, uy: { x: 0, y: d.h } };
      else if (n === 1) box = { o: { x: P[0].x, y: P[0].y }, ux: { x: d.w, y: 0 }, uy: { x: 0, y: d.h } };
      else { const ux = V.sub(P[1], P[0]); const uy = V.mul(V.perp(ux), -d.h / d.w); box = { o: { x: P[0].x + uy.x * 0, y: P[0].y }, ux, uy: { x: -uy.x, y: -uy.y } }; box.o = V.sub(P[0], box.uy); }
      const clip = d.clip != null && P[d.clip] ? P[d.clip].pts : null; return { ...box, clip }; }
    case 'amark': { if (!need(3)) return null; return { a: P[0], b: P[1], c: P[2] }; }
    case 'draw': return { pts: d.pts };
    case 'iter': return { pending: true };
  }
  return null;
}
function computeFunc(o, P) {
  const d = o.d;
  if (o.t === 'deriv') {
    const src = obj(o.p[0]); if (!src || !P[0]) return null;
    if (!P[0].ast) { const f0 = P[0].f, h = 1e-4; return { ast: null, refsG: [], f: x => (f0(x + h) - f0(x - h)) / (2 * h), num: true }; }
    const body = P[0].ast, srcP = P[0].refsG;
    const inline = n => { const g = srcP[n.i]; if (!g || !g.ast) return null; return substX(g.ast, n.a); };
    let dast;
    try { dast = simp(deriv(body, inline)); } catch (e) { return null; }
    const R = srcP.map(g => g && g.v), F = srcP.map(g => g && g.f);
    const deg = D.prefs.angUnit === 'deg';
    return { ast: dast, refsG: srcP, f: x => evalAst(dast, { x, R, F, deg: false }), names: P[0].names };
  }
  const R = P.map(g => g && g.v), F = P.map(g => g && g.f);
  return { ast: d.ast, refsG: P, f: x => evalAst(d.ast, { x, R, F, deg: false }) };
}
function substX(ast, a) {
  const go = n => n.n === 'x' ? a : n.n === 'bin' ? { ...n, a: go(n.a), b: go(n.b) } : (n.n === 'neg' || n.n === 'call' || n.n === 'fref') ? { ...n, a: go(n.a) } : n;
  return go(ast);
}
function samplePlot(cs, f, d) {
  const vw = viewRect(); let x0, x1;
  if (d.dom) { x0 = d.dom[0]; x1 = d.dom[1]; } else { x0 = (vw.x0 - cs.o.x) / cs.u; x1 = (vw.x1 - cs.o.x) / cs.u; }
  const N = d.n || D.prefs.plotN || 600, paths = []; let cur = [], prev = null;
  const ylim = (vw.y1 - vw.y0) * 4;
  for (let i = 0; i <= N; i++) {
    const x = x0 + (x1 - x0) * i / N, y = f(x);
    if (!isFinite(y)) { if (cur.length > 1) paths.push(cur); cur = []; prev = null; continue; }
    const p = csToW(cs, x, y);
    if (prev && Math.abs(p.y - prev.y) > ylim) { if (cur.length > 1) paths.push(cur); cur = []; }
    cur.push(p); prev = p;
  }
  if (cur.length > 1) paths.push(cur);
  return paths;
}
/* 측정 */
function measure(o, P) {
  const m = o.d.m, K = lenK(), A = angK();
  const res = (v, u) => ({ v, u });
  if (P.some(x => !x)) return { v: NaN, u: null };
  const g0 = P[0];
  switch (m) {
    case 'len': return res(V.dist(g0.a, g0.b) * K, dimL());
    case 'dist': { if (obj(o.p[1]).g === 'ln') return res(distTo({ ...P[1], k: 'line' }, 'ln', g0) * K, dimL()); return res(V.dist(g0, P[1]) * K, dimL()); }
    case 'perim': { const gt = obj(o.p[0]).g; if (gt === 'poly') return res(polyPerim(g0.pts, true) * K, dimL()); if (gt === 'sect') return res((g0.r * g0.sw + 2 * g0.r) * K, dimL()); if (gt === 'segm') return res((g0.r * g0.sw + V.dist(arcAt(g0, 0), arcAt(g0, 1))) * K, dimL()); return res(NaN); }
    case 'circum': return res(TAU * g0.r * K, dimL());
    case 'ang': { let a = Math.abs(n2pi(ang(P[1], P[2]) - ang(P[1], P[0]))); if (a > PI) a = TAU - a; return res(a * A, dimA); }
    case 'area': { const gt = obj(o.p[0]).g; let v;
      if (gt === 'poly') v = polyArea(g0.pts); else if (gt === 'ci' || gt === 'cint') v = PI * g0.r * g0.r;
      else if (gt === 'sect') v = g0.r * g0.r * g0.sw / 2; else if (gt === 'segm') v = g0.r * g0.r * (g0.sw - Math.sin(g0.sw)) / 2;
      return res(v * K * K, dimL(2)); }
    case 'arcang': return res(arcOf(o, P).sw * A, dimA);
    case 'arclen': { const a = arcOf(o, P); return res(a.r * a.sw * K, dimL()); }
    case 'rad': return res(g0.r * K, dimL());
    case 'ratio': { if (P.length === 2) return res(V.dist(g0.a, g0.b) / V.dist(P[1].a, P[1].b), null); const d1 = V.sub(P[1], P[0]), d2 = V.sub(P[2], P[0]); return res(V.dot(d2, d1) / V.dot(d1, d1), null); }
    case 'pval': { const pt = obj(o.p[0]); const path = obj(pt.p[0]); let t = pt.d.t; if (path.g === 'ci' || path.g === 'cint') t = n2pi(t) / TAU; return res(t, null); }
    case 'coord': { const c = wToCs(P[0], P[1]); if (P[0].form === 'polar') { const r = Math.hypot(c.x, c.y), th = n2pi(Math.atan2(c.y, c.x)); return { v: r, v2: th * A, u: null, pair: true }; } return { v: c.x, v2: c.y, u: null, pair: true }; }
    case 'xc': { const c = wToCs(P[0], P[1]); if (P[0].form === 'polar') return res(Math.hypot(c.x, c.y), null); return res(c.x, null); }
    case 'yc': { const c = wToCs(P[0], P[1]); if (P[0].form === 'polar') return res(n2pi(Math.atan2(c.y, c.x)) * A, dimA); return res(c.y, null); }
    case 'cdist': { const a = wToCs(P[0], P[1]), b = wToCs(P[0], P[2]); return res(Math.hypot(a.x - b.x, a.y - b.y), null); }
    case 'slope': { const a = wToCs(P[0], P[1].a), b = wToCs(P[0], P[1].b); return res((b.y - a.y) / (b.x - a.x), null); }
    case 'eq': return { v: NaN, u: null, eq: true };
  }
  return { v: NaN, u: null };
}
function arcOf(o, P) { if (P.length === 3) { const c = P[0].c, s = ang(c, P[1]); return { r: P[0].r, sw: n2pi(ang(c, P[2]) - s) || TAU }; } return P[0]; }

/* 자취: 구동점(경로 위의 점 또는 매개변수)과 피구동 개체 */
function locusDomain(path, gt) {
  if (gt === 'ln') { if (path.k === 'seg') return [0, 1, t => t]; return [path.k === 'ray' ? 0 : -1, 1, null]; }
  if (gt === 'ci' || gt === 'cint') return [0, TAU, t => t];
  if (gt === 'plot') { const vw = viewRect(); return [(vw.x0 - path.cs.o.x) / path.cs.u, (vw.x1 - path.cs.o.x) / path.cs.u, t => t]; }
  return [0, 1, t => t];
}
function computeLocus(o, P) {
  const [drvId, drnId] = o.p, drv = obj(drvId), drn = obj(drnId);
  if (!drv || !drn || !P[0] || !P[1]) return null;
  const set = new Set([...descendants([drvId])].filter(id => ancestors([drnId]).has(id)));
  set.delete(drvId);
  const sub = ORDER.filter(x => set.has(x.id));
  const N = o.d.n || 150, out = [], env = [];
  let sampler;
  if (drv.t === 'on') {
    const pathO = obj(drv.p[0]), pg = G.get(pathO.id); if (!pg) return null;
    const gt = pathO.g;
    if (gt === 'ln' && pg.k !== 'seg') { const L = V.dist(pg.a, pg.b) || 1; const big = 3000 / L; sampler = i => { const u = i / N; const t = pg.k === 'ray' ? big * Math.pow(u, 2) : big * Math.sign(u - .5) * Math.pow(2 * Math.abs(u - .5), 2); return pathPoint(pg, gt, t); }; }
    else { const [a, b] = locusDomain(pg, gt); sampler = i => pathPoint(pg, gt, a + (b - a) * i / N); }
  } else if (drv.t === 'param') {
    const [a, b] = drv.d.range || [0, 10]; sampler = i => ({ v: a + (b - a) * i / N, u: P[0].u });
  } else return null;
  let cur = [], prev = null;
  for (let i = 0; i <= N; i++) {
    const L = new Map(); L.set(drvId, sampler(i));
    const get = id => L.has(id) ? L.get(id) : G.get(id);
    for (const x of sub) L.set(x.id, x.t === 'loc' || x.t === 'iter' ? null : compute(x, get));
    const r = L.get(drnId);
    if (drn.g === 'pt') {
      if (!V.ok(r)) { if (cur.length > 1) out.push(cur); cur = []; prev = null; continue; }
      if (prev && V.dist(prev, r) > 400) { if (cur.length > 1) out.push(cur); cur = []; }
      cur.push(r); prev = r;
    } else if (r && i % Math.max(1, Math.round(N / (o.d.env || 40))) === 0) env.push({ gt: drn.g, g: r });
  }
  if (cur.length > 1) out.push(cur);
  if (drn.g === 'pt' && o.d.closed && out.length === 1 && out[0].length > 2) { const s = out[0]; if (V.dist(s[0], s[s.length - 1]) < 2) s.push(s[0]); }
  return { paths: out, env: drn.g === 'pt' ? null : env };
}
/* 반복: 상(像) 계산 */
function computeIter(o) {
  const n = o.d.n, m = o.d.maps, depth = o.d.depth;
  const pre = o.p.slice(0, n), imgs = []; for (let k = 0; k < m; k++) imgs.push(o.p.slice(n + k * n, n + (k + 1) * n));
  const desc = descendants(pre, false); const own = descendants([o.id]);
  for (const x of own) desc.delete(x);
  for (const p of pre) desc.delete(p);
  const sub = ORDER.filter(x => desc.has(x.id) && x.t !== 'iter' && x.t !== 'loc');
  const draws = sub.filter(x => !x.h && ['pt', 'ln', 'ci', 'arc', 'poly', 'cint', 'sect', 'segm'].includes(x.g));
  const out = [], rows = o.d.numeric ? [[0, ...pre.map(p => G.get(p)?.v)]] : null; let budget = 30000;
  const level = (env, lv) => {
    if (lv > depth || budget <= 0) return;
    for (let k = 0; k < m; k++) {
      const get0 = id => env.has(id) ? env.get(id) : G.get(id);
      const L = new Map(); pre.forEach((p, i) => L.set(p, get0(imgs[k][i])));
      const get = id => L.has(id) ? L.get(id) : G.get(id);
      for (const x of sub) { L.set(x.id, compute(x, get)); budget--; }
      if (o.d.numeric) rows.push([lv, ...pre.map(p => L.get(p)?.v)]);
      if (!o.d.finalOnly || lv === depth) for (const x of draws) { const g = L.get(x.id); if (g) out.push({ id: x.id, g, lv }); }
      level(L, lv + 1);
    }
  };
  level(new Map(), 1);
  return { items: out, rows, x: o.d.x, y: o.d.y };
}
/* 전체 평가 */
function evaluate() {
  if (structDirty) rebuildIndex();
  G = new Map();
  const get = id => G.get(id);
  const later = [];
  for (const o of ORDER) { if (o.t === 'iter') { later.push(o); continue; } let g = null; try { g = compute(o, get); } catch (e) { g = null; } G.set(o.id, g); }
  for (const o of later) { try { G.set(o.id, computeIter(o)); } catch (e) { G.set(o.id, null); } }
}

/* --- 이름 --- */
const SUBN = '₀₁₂₃₄₅₆₇₈₉';
const subNum = n => String(n).split('').map(c => SUBN[+c]).join('');
function nextLabel(kind) {
  const used = new Set(D.objs.map(o => o.lab));
  for (let guard = 0; guard < 10000; guard++) {
    const k = D.lc[kind]++; let s;
    if (kind === 'pt') { const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; s = L[k % 26] + (k >= 26 ? subNum(Math.floor(k / 26)) : ''); }
    else if (kind === 'ln') { const L = 'jklmnopqrstuvw'; s = L[k % L.length] + (k >= L.length ? subNum(Math.floor(k / L.length)) : ''); }
    else if (kind === 'ci') s = 'c' + subNum(k + 1);
    else if (kind === 'pa') s = 't' + subNum(k + 1);
    else if (kind === 'fn') { const L = 'fghpqrs'; s = L[k % L.length] + (k >= L.length ? subNum(Math.floor(k / L.length)) : ''); }
    if (!used.has(s)) return s;
  }
  return '?';
}
function labelKind(gt) { return gt === 'pt' ? 'pt' : gt === 'ln' ? 'ln' : (gt === 'ci' || gt === 'arc') ? 'ci' : null; }

/* --- 기본 모양 --- */
const DEF_COL = { pt: '#e0201b', ln: '#1d3f9e', ci: '#1d3f9e', arc: '#1d3f9e', loc: '#8a2be2', plot: '#2c6e2c', poly: '#f2b830', cint: '#f2b830', sect: '#f2b830', segm: '#f2b830', val: '#000000', txt: '#000000', amark: '#000000', draw: '#000000', iter: '#1d3f9e' };
function addObj(t, g, p, d, extra) {
  const o = { id: D.next++, t, g, p: p || [], d: d || {}, s: { c: DEF_COL[g] || '#000', w: 2, dash: 0, ps: 2, op: g === 'poly' || g === 'cint' || g === 'sect' || g === 'segm' ? .35 : 1 }, h: false, lab: '', sl: false, lo: null, tr: false };
  if (extra) Object.assign(o, extra);
  const lk = labelKind(g);
  if (lk && !o.lab) { o.lab = nextLabel(lk); o.sl = g === 'pt' ? D.prefs.autoLabelPts : D.prefs.autoLabelOther; }
  D.objs.push(o); structDirty = true; return o;
}
function removeObjs(ids) {
  const all = descendants(ids);
  D.objs = D.objs.filter(o => !all.has(o.id));
  for (const k of Object.keys(D.marks)) { const m = D.marks[k]; if (m && (m.ids || []).some(i => all.has(i))) delete D.marks[k]; }
  structDirty = true; return all;
}
