'use strict';
/* ===================== 1. 기하 기초 ===================== */
const PI = Math.PI, TAU = 2 * Math.PI, EPS = 1e-9;
const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  cross: (a, b) => a.x * b.y - a.y * b.x,
  len: a => Math.hypot(a.x, a.y),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  norm: a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  perp: a => ({ x: -a.y, y: a.x }),
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
  ok: p => !!p && isFinite(p.x) && isFinite(p.y),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ang = (c, p) => Math.atan2(-(p.y - c.y), p.x - c.x);           // 수학 방향(반시계) 각
const onCirc = (c, r, a) => ({ x: c.x + r * Math.cos(a), y: c.y - r * Math.sin(a) });
const n2pi = a => { a %= TAU; return a < 0 ? a + TAU : a; };

function circumcenter(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const A = a.x * a.x + a.y * a.y, B = b.x * b.x + b.y * b.y, C = c.x * c.x + c.y * c.y;
  return { x: (A * (b.y - c.y) + B * (c.y - a.y) + C * (a.y - b.y)) / d, y: (A * (c.x - b.x) + B * (a.x - c.x) + C * (b.x - a.x)) / d };
}
/* 호: {c, r, s, sw}  s에서 반시계로 sw만큼 */
function arcFrom3(p1, p2, p3) {
  const c = circumcenter(p1, p2, p3); if (!c) return null;
  const r = V.dist(c, p1), a1 = ang(c, p1), a2 = ang(c, p2), a3 = ang(c, p3);
  const d13 = n2pi(a3 - a1), d12 = n2pi(a2 - a1);
  return d12 < d13 ? { c, r, s: a1, sw: d13, rev: false } : { c, r, s: a3, sw: TAU - d13, rev: true };
}
const arcAt = (g, t) => onCirc(g.c, g.r, g.s + g.sw * t);
function arc3pts(g) { const P = [arcAt(g, 0), arcAt(g, .5), arcAt(g, 1)]; return g.rev ? P.reverse() : P; }
function onArc(g, p) { return n2pi(ang(g.c, p) - g.s) <= g.sw + 1e-7; }
const inRange = (k, t) => k === 'seg' ? t >= -1e-9 && t <= 1 + 1e-9 : k === 'ray' ? t >= -1e-9 : true;

function polyPerim(pts, closed) { let L = 0; const n = pts.length; for (let i = 0; i < n - (closed ? 0 : 1); i++) L += V.dist(pts[i], pts[(i + 1) % n]); return L; }
function polyAt(pts, t, closed) {
  const n = pts.length; if (!n) return null; if (n === 1) return pts[0];
  const L = polyPerim(pts, closed); if (L < EPS) return pts[0];
  let d = (closed ? n2pi(t * TAU) / TAU : clamp(t, 0, 1)) * L;
  for (let i = 0; i < n - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % n], l = V.dist(a, b); if (d <= l || i === n - (closed ? 1 : 2)) return V.lerp(a, b, l ? clamp(d / l, 0, 1) : 0); d -= l; }
  return pts[n - 1];
}
function segProj(a, b, p) { const d = V.sub(b, a), L = V.dot(d, d); const t = L ? clamp(V.dot(V.sub(p, a), d) / L, 0, 1) : 0; return { t, q: V.lerp(a, b, t) }; }
function polyParam(pts, p, closed) {
  const n = pts.length, L = polyPerim(pts, closed); let best = 1e18, bt = 0, acc = 0;
  for (let i = 0; i < n - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % n], l = V.dist(a, b), r = segProj(a, b, p), d = V.dist(r.q, p); if (d < best) { best = d; bt = (acc + r.t * l) / (L || 1); } acc += l; }
  return { t: bt, d: best };
}
function pointInPoly(pts, p) {
  let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c;
}
function polyArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }

/* 교점 */
function llInt(g1, g2) {
  const d1 = V.sub(g1.b, g1.a), d2 = V.sub(g2.b, g2.a), den = V.cross(d1, d2);
  if (Math.abs(den) < 1e-12) return null;
  const w = V.sub(g2.a, g1.a), t = V.cross(w, d2) / den, u = V.cross(w, d1) / den;
  if (!inRange(g1.k, t) || !inRange(g2.k, u)) return null;
  return V.lerp(g1.a, g1.b, t);
}
function lcInt(gl, c, r) {
  const d = V.sub(gl.b, gl.a), f = V.sub(gl.a, c), A = V.dot(d, d), B = 2 * V.dot(f, d), C = V.dot(f, f) - r * r;
  const D = B * B - 4 * A * C; if (D < 0 || A < EPS) return [null, null];
  const s = Math.sqrt(D), t0 = (-B - s) / (2 * A), t1 = (-B + s) / (2 * A);
  return [t0, t1].map(t => inRange(gl.k, t) ? V.lerp(gl.a, gl.b, t) : null);
}
function ccInt(c1, r1, c2, r2) {
  const d = V.dist(c1, c2); if (d < EPS || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [null, null];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const u = V.mul(V.sub(c2, c1), 1 / d), m = V.add(c1, V.mul(u, a)), pp = V.perp(u);
  return [V.add(m, V.mul(pp, h)), V.sub(m, V.mul(pp, h))];
}
const isLn = gt => gt === 'ln';
const isRound = gt => gt === 'ci' || gt === 'arc';
function intersections(gA, tA, gB, tB) {
  if (!gA || !gB) return [null, null];
  if (isLn(tA) && isLn(tB)) return [llInt(gA, gB)];
  if (isRound(tA) && isLn(tB)) return intersections(gB, tB, gA, tA);
  if (isLn(tA) && isRound(tB)) { return lcInt(gA, gB.c, gB.r).map(p => p && (tB !== 'arc' || onArc(gB, p)) ? p : null); }
  if (isRound(tA) && isRound(tB)) { return ccInt(gA.c, gA.r, gB.c, gB.r).map(p => p && (tA !== 'arc' || onArc(gA, p)) && (tB !== 'arc' || onArc(gB, p)) ? p : null); }
  return [null];
}
const canIntersect = gt => gt === 'ln' || gt === 'ci' || gt === 'arc';

/* 경로 매개화 */
function pathPoint(g, gt, t) {
  if (!g) return null;
  switch (gt) {
    case 'ln': return V.lerp(g.a, g.b, g.k === 'seg' ? clamp(t, 0, 1) : g.k === 'ray' ? Math.max(0, t) : t);
    case 'ci': case 'cint': return onCirc(g.c, g.r, t);
    case 'arc': case 'sect': case 'segm': return arcAt(g, clamp(t, 0, 1));
    case 'poly': return polyAt(g.pts, t, true);
    case 'loc': return locAt(g, t);
    case 'plot': { const y = g.f(t); return isFinite(y) ? csToW(g.cs, t, y) : null; }
  }
  return null;
}
function pathParam(g, gt, p) {
  switch (gt) {
    case 'ln': { const d = V.sub(g.b, g.a), L = V.dot(d, d); let t = L ? V.dot(V.sub(p, g.a), d) / L : 0; if (g.k === 'seg') t = clamp(t, 0, 1); if (g.k === 'ray') t = Math.max(0, t); return t; }
    case 'ci': case 'cint': return ang(g.c, p);
    case 'arc': case 'sect': case 'segm': { const rel = n2pi(ang(g.c, p) - g.s); if (rel <= g.sw) return rel / g.sw; return (rel - g.sw < TAU - rel) ? 1 : 0; }
    case 'poly': return polyParam(g.pts, p, true).t;
    case 'loc': return locParam(g, p).t;
    case 'plot': return (p.x - g.cs.o.x) / g.cs.u;
  }
  return 0;
}
function locAt(g, t) {
  const segs = g.paths; let L = 0; for (const s of segs) L += polyPerim(s, false);
  let d = clamp(t, 0, 1) * L;
  for (const s of segs) { const l = polyPerim(s, false); if (d <= l + 1e-9) return polyAt(s, l ? d / l : 0, false); d -= l; }
  const last = segs[segs.length - 1]; return last ? last[last.length - 1] : null;
}
function locParam(g, p) {
  let L = 0; for (const s of g.paths) L += polyPerim(s, false);
  let acc = 0, best = { d: 1e18, t: 0 };
  for (const s of g.paths) { const l = polyPerim(s, false); if (s.length > 1) { const r = polyParam(s, p, false); if (r.d < best.d) best = { d: r.d, t: (acc + r.t * l) / (L || 1) }; } acc += l; }
  return best;
}
/* 좌표계 */
const csToW = (cs, x, y) => ({ x: cs.o.x + x * cs.u, y: cs.o.y - y * (cs.uy || cs.u) });
const wToCs = (cs, p) => ({ x: (p.x - cs.o.x) / cs.u, y: -(p.y - cs.o.y) / (cs.uy || cs.u) });

/* 점-개체 거리 (선택 판정) */
function distTo(g, gt, p) {
  if (!g) return 1e18;
  switch (gt) {
    case 'pt': return V.dist(g, p);
    case 'ln': { const d = V.sub(g.b, g.a), L = V.dot(d, d); let t = L ? V.dot(V.sub(p, g.a), d) / L : 0; if (g.k === 'seg') t = clamp(t, 0, 1); if (g.k === 'ray') t = Math.max(0, t); return V.dist(V.lerp(g.a, g.b, t), p); }
    case 'ci': return Math.abs(V.dist(g.c, p) - g.r);
    case 'arc': return V.dist(arcAt(g, pathParam(g, 'arc', p)), p);
    case 'loc': return locParam(g, p).d;
    case 'plot': { let b = 1e18; for (const s of g.paths) if (s.length > 1) b = Math.min(b, polyParam(s, p, false).d); return b; }
    case 'cint': return V.dist(g.c, p) <= g.r ? 0 : 1e18;
    case 'poly': return pointInPoly(g.pts, p) ? 0 : 1e18;
    case 'sect': { if (V.dist(g.c, p) > g.r) return 1e18; return n2pi(ang(g.c, p) - g.s) <= g.sw ? 0 : 1e18; }
    case 'segm': { const P = [arcAt(g, 0), arcAt(g, 1)]; if (V.dist(g.c, p) > g.r) return 1e18; const inA = n2pi(ang(g.c, p) - g.s) <= g.sw; const side = V.cross(V.sub(P[1], P[0]), V.sub(p, P[0])), sideC = V.cross(V.sub(P[1], P[0]), V.sub(g.c, P[0])); return (inA && (g.sw > PI ? true : side * sideC < 0)) || (g.sw > PI && side * sideC > 0) ? 0 : 1e18; }
  }
  return 1e18;
}
