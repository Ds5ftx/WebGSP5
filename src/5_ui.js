/* ===================== 5. 상호작용 ===================== */
let SEL = [], TOOL = 'arrow', MARQ = null, drag = null;
const SUB = { arrow: 'move', straight: 'seg', poly: 'both' };
const UNDO = [], REDO = []; let lastSnap = '';
const snapDoc = () => JSON.stringify({ objs: D.objs, next: D.next, marks: D.marks, lc: D.lc, tools: D.tools, prefs: D.prefs, xforms: D.xforms });
function commit() { const s = snapDoc(); if (s === lastSnap) { updateUI(); return; } UNDO.push(lastSnap); if (UNDO.length > 300) UNDO.shift(); REDO.length = 0; lastSnap = s; DIRTY = true; autosave(); updateUI(); redraw(); }
function restoreSnap(s) { const o = JSON.parse(s); Object.assign(D, o); if (typeof BOOK !== 'undefined' && BOOK) BOOK.tools = D.tools; lastSnap = s; structDirty = true; rebuildIndex(); SEL = SEL.filter(id => byId.has(id)); redraw(); updateUI(); autosave(); }
function undo() { if (!UNDO.length) return; REDO.push(lastSnap); restoreSnap(UNDO.pop()); }
function redo() { if (!REDO.length) return; UNDO.push(lastSnap); restoreSnap(REDO.pop()); }
let DIRTY = false;
function autosave() { try { localStorage.setItem('webgsp.book', JSON.stringify(bookData())); } catch (e) { } }

/* --- 선택 판정 --- */
const isBoxObj = o => o.g === 'val' || o.g === 'txt' || o.g === 'fn' || o.t === 'table' || o.t === 'btn' || (o.t === 'iter' && o.d.numeric);
function candidates(pw, filter) {
  const out = [];
  for (let i = ORDER.length - 1; i >= 0; i--) {
    const o = ORDER[i]; if ((o.h && !SHOWHID) || (filter && !filter(o))) continue;
    if (o.t === 'cs') continue;
    if (isBoxObj(o)) { const b = BOX.get(o.id); if (b && pw.x >= b.x - 2 && pw.x <= b.x + b.w + 2 && pw.y >= b.y - 2 && pw.y <= b.y + b.h + 2) out.push({ id: o.id, s: -1 }); continue; }
    const g = G.get(o.id); if (!g) continue;
    if (o.t === 'iter') { for (const it of g.items || []) { const so = obj(it.id); if (!so) continue; const d = distTo(it.g, so.g, pw); if (d < (so.g === 'pt' ? 6 : 4)) { out.push({ id: o.id, s: 3 + d / 10 }); break; } } continue; }
    if (o.t === 'amark') { const d = Math.abs(V.dist(g.b, pw) - (o.d.r || 22)); if (d < 5 && V.dist(g.b, pw) > 5) out.push({ id: o.id, s: 2.5 }); continue; }
    if (o.g === 'img') { if (inImg(g, pw)) out.push({ id: o.id, s: 5 }); continue; }
    if (o.g === 'tpts') { const d = Math.min(1e9, ...g.pts.map(p => V.dist(p, pw))); if (d < 7) out.push({ id: o.id, s: 1.5 }); continue; }
    if (o.t === 'draw') { const d = polyParam(g.pts, pw, false).d; if (d < 5) out.push({ id: o.id, s: 2 + d / 10 }); continue; }
    if (o.g === 'pt') { const d = V.dist(g, pw); if (d < 8) out.push({ id: o.id, s: 1 + d / 10 }); continue; }
    if (isFill(o.g)) { if (distTo(g, o.g, pw) === 0) out.push({ id: o.id, s: 4 + (ORDER.length - i) / 1e6 }); continue; }
    const d = distTo(g, o.g, pw); if (d < 5) out.push({ id: o.id, s: 2 + d / 10 });
  }
  out.sort((a, b) => a.s - b.s); return out;
}
function hit(pw, filter) { const c = candidates(pw, filter); return c.length ? c[0].id : null; }
function hitLabel(pw) { for (const [id, b] of LBOX) { if (pw.x >= b.x - 2 && pw.x <= b.x + b.w + 2 && pw.y >= b.y - 2 && pw.y <= b.y + b.h + 2) return id; } return null; }
const pathish = o => ['ln', 'ci', 'arc', 'loc', 'plot', 'poly', 'cint', 'sect', 'segm'].includes(o.g) && o.t !== 'iter' && !(o.g === 'loc' && G.get(o.id) && G.get(o.id).env);
function nearInt(pw) {
  const near = [];
  for (const o of ORDER) { if ((o.h && !SHOWHID) || !canIntersect(o.g) || o.t === 'iter') continue; const g = G.get(o.id); if (g && distTo(g, o.g, pw) < 10) near.push(o); }
  let best = null;
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
    const A = near[i], B = near[j]; const r = intersections(G.get(A.id), A.g, G.get(B.id), B.g);
    r.forEach((p, k) => { if (p) { const d = V.dist(p, pw); if (d < 9 && (!best || d < best.d)) best = { a: A.id, b: B.id, k, p, d }; } });
  }
  return best;
}
function boundaryD(o, g, pw) { if (o.g === 'poly') return polyParam(g.pts, pw, true).d; if (o.g === 'cint') return Math.abs(V.dist(g.c, pw) - g.r); if (o.g === 'sect' || o.g === 'segm') return 1e9; return distTo(g, o.g, pw); }
function snapTarget(pw, excl) {
  const pid = hit(pw, o => o.g === 'pt' && o.t !== 'iter' && o.id !== excl);
  if (pid) return { k: 'pt', id: pid, p: G.get(pid) };
  const it = nearInt(pw); if (it) return { k: 'int', a: it.a, b: it.b, kk: it.k, p: it.p };
  let best = null;
  for (const o of ORDER) { if ((o.h && !SHOWHID) || !pathish(o)) continue; const g = G.get(o.id); if (!g) continue; const d = boundaryD(o, g, pw); if (d < 5 && (!best || d < best.d)) best = { o, d }; }
  if (best) { const g = G.get(best.o.id), t = pathParam(g, best.o.g, pw); return { k: 'on', id: best.o.id, t, p: pathPoint(g, best.o.g, t) }; }
  return { k: 'free', p: gridSnap(pw) };
}
function gridSnap(p) { const cs = CS(); if (!D.prefs.snap || !cs) return p; const g = G.get(cs.id); if (!g) return p; const c = wToCs(g, p); return csToW(g, Math.round(c.x), Math.round(c.y)); }
function realize(t) {
  if (!t) return null;
  if (t.k === 'pt') return t.id;
  if (t.k === 'int') { const ex = D.objs.find(o => o.t === 'int' && o.d.k === t.kk && ((o.p[0] === t.a && o.p[1] === t.b))); if (ex) { if (ex.h) ex.h = false; return ex.id; } return addObj('int', 'pt', [t.a, t.b], { k: t.kk }).id; }
  if (t.k === 'on') return addObj('on', 'pt', [t.id], { t: t.t }).id;
  return addObj('free', 'pt', [], { x: t.p.x, y: t.p.y }).id;
}

/* --- 끌기 손잡이 --- */
function buildHandles(ids) {
  const Hm = new Map(); evaluate();
  const add = (id, direct) => {
    const o = obj(id); if (!o || Hm.has(id)) return;
    if (isBoxObj(o)) { Hm.set(id, { k: 'box', x: o.d.x, y: o.d.y }); return; }
    if (o.t === 'free') { Hm.set(id, { k: 'free', x: o.d.x, y: o.d.y }); return; }
    if (o.t === 'on') { if (direct || !ids.includes(o.p[0])) Hm.set(id, { k: 'on', p: G.get(id) }); if (!direct) return; return; }
    if (o.t === 'unit') { if (direct) Hm.set(id, { k: 'unit', d: o.d.d }); return; }
    if (o.t === 'unity') { if (direct) Hm.set(id, { k: 'unity', d: o.d.d }); return; }
    if (o.t === 'img' && !(o.d.anchors > 0)) { Hm.set(id, { k: 'box', x: o.d.x, y: o.d.y }); return; }
    if (o.t === 'draw') { Hm.set(id, { k: 'draw', pts: o.d.pts.map(p => ({ ...p })) }); return; }
    if (o.t === 'cs') { add(o.p[0], false); return; }
    for (const a of ancestors([id], false)) { const q = obj(a); if (!q) continue; if (q.t === 'free') add(a, false); else if (q.t === 'on') { if (!Hm.has(a)) Hm.set(a, { k: 'on', p: G.get(a) }); } }
  };
  ids.forEach(id => add(id, true));
  return Hm;
}
function applyHandles(Hm, map, delta) {
  const ons = [];
  for (const [id, h] of Hm) {
    const o = obj(id); if (!o) continue;
    if (h.k === 'free') { let p = map({ x: h.x, y: h.y }); if (Hm.size === 1) p = gridSnap(p); o.d.x = p.x; o.d.y = p.y; }
    else if (h.k === 'box') { o.d.x = h.x + delta.x; o.d.y = h.y + delta.y; }
    else if (h.k === 'draw') { o.d.pts = h.pts.map(map); }
    else if (h.k === 'unit') { if (!Hm.has(o.p[0])) o.d.d = Math.max(3, h.d + delta.x); }
    else if (h.k === 'unity') { if (!Hm.has(o.p[0])) o.d.d = Math.max(3, h.d - delta.y); }
    else if (h.k === 'on') ons.push([o, h]);
  }
  if (ons.length) { structDirty = structDirty; evaluate(); for (const [o, h] of ons) { const pg = G.get(o.p[0]); if (pg && h.p) { const target = map(h.p); o.d.t = pathParam(pg, obj(o.p[0]).g, target); } } }
}

/* --- 포인터 --- */
const wrap = cv.parentElement;
function evPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
let polyState = null, twoClick = null, custState = null, PICK = null, lastClick = { t: 0, id: null };
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  closeMenus(); hideInfo(); cv.setPointerCapture(e.pointerId);
  const ps = evPos(e), pw = toW(ps); evaluate();
  if (e.button === 2) { onContext(e, pw); return; }
  if (e.button === 1 || e.altKey || SPACE) { drag = { k: 'pan', s: ps, v: { ...D.view } }; cv.style.cursor = 'grabbing'; return; }
  const now = performance.now();
  if (PICK) { const id = hit(pw, PICK.filter); if (id) PICK.cb(id); return; }
  ({ arrow: downArrow, point: downPoint, compass: downTwo, straight: downTwo, poly: downPoly, text: downText, marker: downMarker, info: downInfo, custom: downCustom })[TOOL](pw, e, ps, now);
});
cv.addEventListener('pointermove', e => {
  const ps = evPos(e), pw = toW(ps);
  if (drag) { moveDrag(pw, e, ps); return; }
  // 강조
  let h = null;
  if (TOOL === 'arrow' || TOOL === 'info') h = hit(pw);
  else if (TOOL === 'text') h = hit(pw, o => !!labelKind(o.g) || isBoxObj(o));
  else if (TOOL === 'custom' && custState) { const gv = custState.tool.givens[custState.got.length]; h = gv ? hit(pw, o => o.g === gv.g) : null; }
  else if (TOOL !== 'marker') { const t = snapTarget(pw); h = t.k === 'pt' ? t.id : t.k === 'on' ? t.id : null; hoverT = t; }
  if (h !== hoverId) { hoverId = h; redraw(); }
  if (TOOL === 'point' || TOOL === 'compass' || TOOL === 'straight' || TOOL === 'poly' || TOOL === 'custom') { setPreviewFor(pw, e); redraw(); }
  cursorFor(pw);
  hoverStatus(pw);
});
let hoverT = null;
cv.addEventListener('pointerup', e => { const ps = evPos(e), pw = toW(ps); if (drag) endDrag(pw, e, ps); });
cv.addEventListener('pointerleave', () => { if (!drag) { hoverId = null; if (!twoClick && !polyState) preview = null; redraw(); } });
cv.addEventListener('dblclick', e => { const pw = toW(evPos(e)); onDbl(pw, e); });
cv.addEventListener('wheel', e => { e.preventDefault(); D.view.x += e.shiftKey ? e.deltaY : e.deltaX; D.view.y += e.shiftKey ? 0 : e.deltaY; eraseTraces(); redraw(); }, { passive: false });
let SPACE = false;

function cursorFor(pw) {
  let c = 'default';
  if (TOOL === 'arrow') { if (hoverId) c = obj(hoverId)?.t === 'btn' ? 'pointer' : 'move'; else c = 'default'; }
  else if (TOOL === 'point' || TOOL === 'compass' || TOOL === 'straight' || TOOL === 'poly') c = 'crosshair';
  else if (TOOL === 'text') c = hoverId ? 'pointer' : 'text';
  else if (TOOL === 'marker') c = 'crosshair';
  else if (TOOL === 'info') c = hoverId ? 'help' : 'default';
  cv.style.cursor = c;
}

function downArrow(pw, e, ps, now) {
  const lid = hitLabel(pw);
  const id = hit(pw);
  if (lid && (!id || obj(id).g !== 'pt' || V.dist(G.get(id), pw) > 4)) { const o = obj(lid); const b = LBOX.get(lid); drag = { k: 'label', id: lid, s: pw, off: o.lo ? { ...o.lo } : { x: b.x - b.ax, y: b.y + 13 - b.ay }, moved: false }; return; }
  if (id) {
    const o = obj(id);
    const was = SEL.includes(id);
    if (!was) { SEL.push(id); }
    const ids = SEL.slice();
    drag = { k: 'move', s: pw, H: buildHandles(ids), moved: false, clicked: id, btn: o.t === 'btn', was, cands: candidates(pw).map(c => c.id) };
    if (SUB.arrow !== 'move') { const c = D.marks.center && G.get(D.marks.center.ids[0]); if (!c) { status('회전·닮음 끌기를 하려면 먼저 중심을 지정하세요(점을 두 번 클릭).'); drag.H = new Map(); } else drag.c = c; }
    redraw(); updateUI();
  } else {
    if (!e.shiftKey) SEL = [];
    drag = { k: 'marq', s: pw, base: SEL.slice() }; MARQ = { x0: pw.x - D.view.x, y0: pw.y - D.view.y, x1: pw.x - D.view.x, y1: pw.y - D.view.y };
    redraw(); updateUI();
  }
}
function moveDrag(pw, e, ps) {
  const d = drag;
  if (d.k === 'pan') { D.view.x = d.v.x - (ps.x - d.s.x); D.view.y = d.v.y - (ps.y - d.s.y); eraseTraces(); redraw(); return; }
  if (d.k === 'label') { const o = obj(d.id); o.lo = { x: d.off.x + pw.x - d.s.x, y: d.off.y + pw.y - d.s.y }; d.moved = true; redraw(); return; }
  if (d.k === 'move') {
    const delta = V.sub(pw, d.s); if (!d.moved && V.len(delta) < 2.5) return; d.moved = true;
    let map;
    if (SUB.arrow === 'rot' && d.c) { const a = ang(d.c, pw) - ang(d.c, d.s), cs = Math.cos(a), sn = Math.sin(a); map = p => { const dx = p.x - d.c.x, dy = -(p.y - d.c.y); return { x: d.c.x + dx * cs - dy * sn, y: d.c.y - (dx * sn + dy * cs) }; }; }
    else if (SUB.arrow === 'dil' && d.c) { const k = V.dist(d.c, pw) / Math.max(1, V.dist(d.c, d.s)); map = p => ({ x: d.c.x + (p.x - d.c.x) * k, y: d.c.y + (p.y - d.c.y) * k }); }
    else map = p => ({ x: p.x + delta.x, y: p.y + delta.y });
    if (e.shiftKey && SUB.arrow === 'move' && d.H.size === 1) { /* 수평·수직 고정 */ const ad = Math.abs(delta.x) > Math.abs(delta.y) ? { x: delta.x, y: 0 } : { x: 0, y: delta.y }; map = p => ({ x: p.x + ad.x, y: p.y + ad.y }); }
    applyHandles(d.H, map, delta); redraw(); return;
  }
  if (d.k === 'marq') { MARQ.x1 = pw.x - D.view.x; MARQ.y1 = pw.y - D.view.y; const r = { x0: Math.min(d.s.x, pw.x), y0: Math.min(d.s.y, pw.y), x1: Math.max(d.s.x, pw.x), y1: Math.max(d.s.y, pw.y) }; SEL = [...d.base, ...marqueeHits(r).filter(id => !d.base.includes(id))]; redraw(); return; }
  if (d.k === 'two') { d.moved = d.moved || V.dist(d.s, pw) > 4; setPreviewFor(pw, e); redraw(); return; }
  if (d.k === 'pen') { d.pts.push(pw); preview = { items: [{ gt: 'draw', g: { pts: d.pts } }] }; redraw(); return; }
  if (d.k === 'amk') { d.cur = pw; redraw(); return; }
}
function endDrag(pw, e, ps) {
  const d = drag; drag = null; cv.style.cursor = 'default';
  if (d.k === 'pan') { autosave(); return; }
  if (d.k === 'label') { if (d.moved) commit(); return; }
  if (d.k === 'move') {
    if (d.moved) { commit(); return; }
    if (d.btn) { runButton(obj(d.clicked)); return; }
    if (d.was && TOOL === 'arrow') { // 선택된 개체를 다시 클릭: 해제, 겹친 개체면 다음 개체 선택
      SEL = SEL.filter(x => x !== d.clicked);
      const i = d.cands.indexOf(d.clicked), nx = d.cands.length > 1 ? d.cands[(i + 1) % d.cands.length] : null;
      if (nx && !SEL.includes(nx) && performance.now() - (lastClick.t2 || 0) < 1500 && lastClick.id === d.clicked) SEL.push(nx);
      redraw(); updateUI();
    }
    lastClick.id = d.clicked; lastClick.t2 = performance.now();
    return; }
  if (d.k === 'marq') { MARQ = null; redraw(); updateUI(); return; }
  if (d.k === 'two') { if (!d.moved) { twoClick = d; return; } finishTwo(pw, e, d); return; }
  if (d.k === 'pen') { preview = null; if (d.pts.length > 2) { const o = addObj('draw', 'draw', [], { pts: simplifyPts(d.pts) }); o.s.w = 2; commit(); } redraw(); return; }
  if (d.k === 'amk') { finishAMark(d, pw); return; }
}
function marqueeHits(r) {
  const out = []; const inR = p => p && p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
  for (const o of ORDER) {
    if (o.h && !SHOWHID) continue; if (o.t === 'cs') continue; const g = G.get(o.id); if (!g) continue;
    let ok = false;
    if (isBoxObj(o)) { const b = BOX.get(o.id); ok = b && b.x < r.x1 && b.x + b.w > r.x0 && b.y < r.y1 && b.y + b.h > r.y0; }
    else if (o.g === 'pt') ok = inR(g);
    else if (o.g === 'ln') { const P = clipLine(g); if (P) for (let i = 0; i <= 20 && !ok; i++) ok = inR(V.lerp(g.k === 'seg' ? g.a : P[0], g.k === 'seg' ? g.b : P[1], i / 20)); }
    else if (o.g === 'ci') { for (let i = 0; i < 36 && !ok; i++) ok = inR(onCirc(g.c, g.r, i * TAU / 36)); }
    else if (o.g === 'arc' || o.g === 'sect' || o.g === 'segm') { for (let i = 0; i <= 20 && !ok; i++) ok = inR(arcAt(g, i / 20)); }
    else if (o.g === 'poly') ok = g.pts.some(inR);
    else if (o.g === 'cint') ok = inR(g.c);
    else if (o.g === 'loc' || o.g === 'plot') ok = (g.paths || []).some(s => s.some(inR));
    else if (o.t === 'amark') ok = inR(g.b);
    else if (o.t === 'draw') ok = g.pts.some(inR);
    if (ok) out.push(o.id);
  }
  return out;
}
function simplifyPts(P) { const out = [P[0]]; for (const p of P) if (V.dist(p, out[out.length - 1]) > 2) out.push(p); return out; }

/* 점 도구 */
function downPoint(pw, e) {
  const t = snapTarget(pw);
  if (t.k === 'pt') { SEL = [t.id]; drag = { k: 'move', s: pw, H: buildHandles([t.id]), moved: false }; redraw(); updateUI(); return; }
  const id = realize(t); evaluate(); SEL = [id];
  drag = { k: 'move', s: pw, H: buildHandles([id]), moved: true }; commit();
}
/* 컴퍼스 / 직선자 */
function angleSnap(a, p) { const d = V.sub(p, a), L = V.len(d); let th = Math.atan2(d.y, d.x); th = Math.round(th / (PI / 12)) * (PI / 12); return { x: a.x + L * Math.cos(th), y: a.y + L * Math.sin(th) }; }
function downTwo(pw, e) {
  if (twoClick) { const st = twoClick; twoClick = null; finishTwo(pw, e, st); return; }
  const a = snapTarget(pw); drag = { k: 'two', s: pw, a, moved: false }; setPreviewFor(pw, e);
}
function secondTarget(pw, e, a) {
  let b = snapTarget(pw, a.k === 'pt' ? a.id : null);
  if (e.shiftKey && TOOL === 'straight') { b = { k: 'free', p: angleSnap(a.p, pw) }; }
  return b;
}
function setPreviewFor(pw, e) {
  const st = drag && drag.k === 'two' ? drag : twoClick;
  if ((TOOL === 'compass' || TOOL === 'straight') && st) {
    const b = secondTarget(pw, e, st.a); const items = [];
    if (st.a.k !== 'pt') items.push({ gt: 'pt', g: st.a.p }); if (b.k !== 'pt') items.push({ gt: 'pt', g: b.p });
    if (TOOL === 'compass') items.push({ gt: 'ci', g: { c: st.a.p, r: V.dist(st.a.p, b.p) } });
    else if (V.dist(st.a.p, b.p) > .5) items.push({ gt: 'ln', g: { k: SUB.straight, a: st.a.p, b: b.p } });
    preview = { items };
  } else if (TOOL === 'poly' && polyState) {
    const b = snapTarget(pw); const pts = polyState.ids.map(id => G.get(id)).filter(Boolean);
    const items = [{ gt: 'poly', g: { pts: [...pts, b.p] } }]; if (b.k !== 'pt') items.push({ gt: 'pt', g: b.p });
    preview = { items: [...items, { gt: 'draw', g: { pts: [...pts, b.p] } }] };
  } else if (TOOL === 'point' || TOOL === 'compass' || TOOL === 'straight' || TOOL === 'poly' || (TOOL === 'custom' && custState)) {
    const t = snapTarget(pw); preview = t.k !== 'pt' ? { items: [{ gt: 'pt', g: t.p }] } : null;
    if (TOOL === 'custom' && custState) { const gv = custState.tool.givens[custState.got.length]; if (!gv || gv.g !== 'pt') preview = null; }
  } else preview = null;
}
function finishTwo(pw, e, st) { const b = secondTarget(pw, e, st.a);
  if (V.dist(st.a.p, b.p) < 1) { preview = null; drag = null; redraw(); return; }
  const ia = realize(st.a); evaluate(); let b2 = b;
  if (b.k === 'pt' && b.id === ia) { preview = null; redraw(); return; }
  const ib = realize(b2); evaluate();
  let o;
  if (TOOL === 'compass') o = addObj('circ', 'ci', [ia, ib]);
  else o = addObj(SUB.straight, 'ln', [ia, ib]);
  preview = null; SEL = [o.id]; commit();
}
/* 다각형 */
function downPoly(pw, e, ps, now) {
  const t = snapTarget(pw);
  if (polyState && t.k === 'pt' && t.id === polyState.ids[0] && polyState.ids.length >= 3) { finishPoly(); return; }
  if (polyState && t.k === 'pt' && t.id === polyState.ids[polyState.ids.length - 1]) { if (now - lastClick.t < 400 && polyState.ids.length >= 3) finishPoly(); lastClick.t = now; return; }
  const id = realize(t); evaluate();
  if (!polyState) polyState = { ids: [] };
  polyState.ids.push(id); lastClick.t = now; redraw(); status('다각형: 다음 꼭짓점을 클릭하세요. 첫 점을 다시 클릭하거나 마지막 점을 두 번 클릭하면 완성됩니다.');
}
function finishPoly() {
  const ids = polyState.ids; polyState = null; preview = null;
  if (ids.length < 2) { commit(); return; }
  const made = [];
  if (SUB.poly !== 'edge' && ids.length >= 3) made.push(addObj('poly', 'poly', ids.slice()).id);
  if (SUB.poly !== 'int') for (let i = 0; i < ids.length; i++) { const a = ids[i], b = ids[(i + 1) % ids.length]; if (ids.length === 2 && i === 1) break; if (!findSeg(a, b)) made.push(addObj('seg', 'ln', [a, b]).id); }
  SEL = made; commit();
}
function findSeg(a, b) { return D.objs.find(o => o.t === 'seg' && ((o.p[0] === a && o.p[1] === b) || (o.p[0] === b && o.p[1] === a))); }
/* 글 도구 */
function downText(pw, e) {
  const lid = hitLabel(pw);
  if (lid) { const o = obj(lid), b = LBOX.get(lid); drag = { k: 'label', id: lid, s: pw, off: o.lo ? { ...o.lo } : { x: b.x - b.ax, y: b.y + 13 - b.ay }, moved: false }; return; }
  const id = hit(pw);
  if (id) {
    const o = obj(id);
    if (isBoxObj(o)) { SEL = [id]; drag = { k: 'move', s: pw, H: buildHandles([id]), moved: false }; updateUI(); redraw(); return; }
    if (labelKind(o.g) || o.g === 'poly') { if (!o.lab) o.lab = nextLabel(labelKind(o.g) || 'pt'); o.sl = !o.sl; commit(); return; }
    return;
  }
  editText(null, pw);
}
/* 표시 도구 */
function downMarker(pw, e) {
  // 꼭짓점 근처: 각 표시
  const vid = hit(pw, o => o.g === 'pt');
  if (vid) {
    const rays = D.objs.filter(o => (o.t === 'seg' || o.t === 'ray') && !o.h && (o.p[0] === vid || (o.t === 'seg' && o.p[1] === vid)));
    if (rays.length >= 2) { drag = { k: 'amk', v: vid, rays, s: pw, cur: pw }; return; }
  }
  const sid = hit(pw, o => o.t === 'seg');
  if (sid) { const o = obj(sid); o.d.ticks = ((o.d.ticks || 0) + 1) % 4; commit(); return; }
  drag = { k: 'pen', pts: [pw] };
}
function finishAMark(d, pw) {
  const V0 = G.get(d.v); let dir = V.sub(d.cur, V0); if (V.len(dir) < 3) dir = V.sub(pw, V0);
  const other = r => r.p[0] === d.v ? r.p[1] : r.p[0];
  const th = Math.atan2(-dir.y, dir.x); let best = null;
  for (let i = 0; i < d.rays.length; i++) for (let j = i + 1; j < d.rays.length; j++) {
    const A = other(d.rays[i]), C = other(d.rays[j]); const a1 = ang(V0, G.get(A)), a2 = ang(V0, G.get(C)); let sw = n2pi(a2 - a1), s0 = a1, f = [A, C]; if (sw > PI) { s0 = a2; sw = TAU - sw; f = [C, A]; }
    const rel = n2pi(th - s0); const score = rel <= sw ? 0 : Math.min(rel - sw, TAU - rel);
    if (!best || score < best.score || (score === best.score && sw < best.sw)) best = { score, sw, f };
  }
  if (!best) return;
  const ex = D.objs.find(o => o.t === 'amark' && o.p[1] === d.v && ((o.p[0] === best.f[0] && o.p[2] === best.f[1]) || (o.p[0] === best.f[1] && o.p[2] === best.f[0])));
  if (ex) { ex.d.n = (ex.d.n || 1) % 3 + 1; } else { const o = addObj('amark', 'amark', [best.f[0], d.v, best.f[1]], { n: 1, r: Math.max(14, Math.min(60, V.dist(V0, d.cur) || 22)) }); o.s.c = '#000000'; }
  commit();
}
/* 정보 도구 */
function downInfo(pw, e) { const id = hit(pw); if (id) showInfo(id, e.clientX, e.clientY); }
/* 사용자 도구 */
function downCustom(pw, e) {
  if (!custState) { status('사용할 사용자 도구를 먼저 고르세요(도구상자의 ▶ 단추).'); openCustomMenu(); return; }
  const gv = custState.tool.givens[custState.got.length]; if (!gv) return;
  let id = null;
  if (gv.g === 'pt') { id = realize(snapTarget(pw)); evaluate(); }
  else id = hit(pw, o => o.g === gv.g);
  if (!id) { status(`${gtName(gv.g)}을(를) 클릭하세요.`); return; }
  custState.got.push(id);
  if (custState.got.length === custState.tool.givens.length) { const made = instantiateTool(custState.orig, mergeGot()); SEL = made; custState.got = []; commit(); flash(`${custState.tool.name}을(를) 적용했습니다. 계속 클릭하면 다시 적용됩니다 (Esc: 그만).`); }
  else { redraw(); status(`${custState.tool.name}: ${custState.got.length + 1}번째 대상(${gtName(custState.tool.givens[custState.got.length].g)})을 클릭하세요.`); }
}

/* 두 번 클릭 */
function onDbl(pw, e) {
  if (TOOL === 'poly' && polyState && polyState.ids.length >= 3) { finishPoly(); return; }
  const lid = hitLabel(pw); if (lid && (TOOL === 'arrow' || TOOL === 'text')) { renameDialog(lid); return; }
  const id = hit(pw); if (!id) return; const o = obj(id);
  if (TOOL !== 'arrow' && TOOL !== 'text') return;
  if (o.t === 'text') return editText(o);
  if (o.t === 'param') return paramDialog(o);
  if (o.t === 'calc') return calcDialog(o);
  if (o.t === 'func') return funcDialog(null, o);
  if (o.t === 'table') { addTableRow(o); return; }
  if (TOOL !== 'arrow') return;
  if (o.g === 'pt') { D.marks.center = { ids: [id] }; flash(`점 ${o.lab || ''}을(를) 중심으로 지정했습니다.`); commit(); return; }
  if (o.g === 'ln') { D.marks.mirror = { ids: [id] }; flash(`${nameSegs(id).map(s => s.t).join('')}을(를) 대칭축으로 지정했습니다.`); commit(); return; }
  if (o.g === 'val' && o.t === 'meas' && G.get(id)?.u?.A === 1) { D.marks.angle = { ids: [id], val: 1 }; flash('각을 지정했습니다.'); commit(); return; }
  if (o.g === 'val') { D.marks.ratio = { ids: [id], val: 1 }; flash('비율(값)을 지정했습니다.'); commit(); }
}

/* 버튼 */
function runButton(o) {
  const k = o.d.kind;
  if (k === 'hide') { const anyHidden = o.p.some(id => obj(id)?.h); const hide = o.d.state !== 'hidden'; for (const id of o.p) { const t = obj(id); if (t) t.h = hide; } o.d.state = hide ? 'hidden' : 'shown'; o.d.label = (hide ? '보이기 ' : '숨기기 ') + (o.d.what || ''); commit(); }
  else if (k === 'anim') { const on = !o.p.some(id => ANIM.has(id)); for (const id of o.p) on ? startAnim(id) : ANIM.delete(id); kick(); }
  else if (k === 'move') { startMove(o); }
  else runButtonExtra(o);
}
const MOVES = [];
function startMove(o) { const pairs = []; for (let i = 0; i + 1 < o.p.length; i += 2) { const a = obj(o.p[i]); const tgt = G.get(o.p[i + 1]); const ga = G.get(o.p[i]); if (a && tgt && ga && (a.t === 'free' || a.t === 'on')) pairs.push({ o: a, from: { ...ga }, to: { ...tgt } }); } MOVES.push({ pairs, t0: performance.now(), dur: [1500, 800, 300, 1][o.d.speed ?? 1] }); kick(); }

/* --- 애니메이션 --- */
const ANIM = new Map(); let animSpeed = 1;
function startAnim(id) { const o = obj(id); if (!o) return; if (o.t === 'on' || o.t === 'param' || o.t === 'free') ANIM.set(id, { dir: 1, vx: Math.random() - .5, vy: Math.random() - .5 }); }
let rafOn = false, lastT = 0;
function kick() { if (!rafOn) { rafOn = true; lastT = performance.now(); requestAnimationFrame(loop); } }
function loop(t) {
  const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
  if (ANIM.size) { stepAnim(dt); needDraw = true; }
  if (MOVES.length) { stepMoves(t); needDraw = true; }
  if (needDraw) { needDraw = false; try { draw(); } catch (e) { console.error(e); } }
  requestAnimationFrame(loop);
}
function stepAnim(dt) {
  evaluate(); const sp = 90 * animSpeed;
  for (const [id, a] of ANIM) {
    const o = obj(id); if (!o) { ANIM.delete(id); continue; }
    if (o.t === 'param') { const r = o.d.range || [0, 10]; let v = o.d.v + a.dir * (r[1] - r[0]) * .1 * animSpeed * dt * 2; if (v > r[1]) { v = r[1]; a.dir = -1; } if (v < r[0]) { v = r[0]; a.dir = 1; } o.d.v = v; continue; }
    if (o.t === 'free') { const vw = viewRect(); a.vx += (Math.random() - .5) * .3; a.vy += (Math.random() - .5) * .3; const L = Math.hypot(a.vx, a.vy) || 1; a.vx /= L; a.vy /= L; o.d.x += a.vx * sp * dt; o.d.y += a.vy * sp * dt; if (o.d.x < vw.x0 + 20 || o.d.x > vw.x1 - 20) a.vx *= -1; if (o.d.y < vw.y0 + 20 || o.d.y > vw.y1 - 20) a.vy *= -1; o.d.x = clamp(o.d.x, vw.x0 + 10, vw.x1 - 10); o.d.y = clamp(o.d.y, vw.y0 + 10, vw.y1 - 10); continue; }
    const po = obj(o.p[0]), g = G.get(o.p[0]); if (!g) continue;
    const ds = sp * dt * a.dir;
    switch (po.g) {
      case 'ci': case 'cint': o.d.t += ds / Math.max(5, g.r); break;
      case 'ln': { const L = V.dist(g.a, g.b) || 1; let t = o.d.t + ds / L; if (g.k === 'seg') { if (t > 1) { t = 1; a.dir = -1; } if (t < 0) { t = 0; a.dir = 1; } } else { const p = V.lerp(g.a, g.b, t), vw = viewRect(); if ((p.x < vw.x0 || p.x > vw.x1 || p.y < vw.y0 || p.y > vw.y1)) { const pc = V.lerp(g.a, g.b, o.d.t); const goingOut = (p.x - (vw.x0 + vw.x1) / 2) ** 2 + (p.y - (vw.y0 + vw.y1) / 2) ** 2 > (pc.x - (vw.x0 + vw.x1) / 2) ** 2 + (pc.y - (vw.y0 + vw.y1) / 2) ** 2; if (goingOut) a.dir *= -1; } if (g.k === 'ray' && t < 0) { t = 0; a.dir = 1; } } o.d.t = t; break; }
      case 'arc': case 'sect': case 'segm': { let t = o.d.t + ds / Math.max(5, g.r * g.sw); if (t > 1) { t = 1; a.dir = -1; } if (t < 0) { t = 0; a.dir = 1; } o.d.t = t; break; }
      case 'poly': { const L = polyPerim(g.pts, true) || 1; o.d.t = (o.d.t + ds / L + 1) % 1; break; }
      case 'loc': { let L = 0; for (const s of g.paths) L += polyPerim(s, false); let t = o.d.t + ds / (L || 1); if (t > 1) { t = 1; a.dir = -1; } if (t < 0) { t = 0; a.dir = 1; } o.d.t = t; break; }
      case 'plot': { o.d.t += ds / g.cs.u; const vw = viewRect(); const x = g.cs.o.x + o.d.t * g.cs.u; if (x > vw.x1 - 10) a.dir = -1; if (x < vw.x0 + 10) a.dir = 1; break; }
    }
  }
}
function stepMoves(t) {
  for (let i = MOVES.length - 1; i >= 0; i--) {
    const m = MOVES[i]; const k = clamp((t - m.t0) / m.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    evaluate();
    for (const pr of m.pairs) { const p = V.lerp(pr.from, pr.to, e); if (pr.o.t === 'free') { pr.o.d.x = p.x; pr.o.d.y = p.y; } else { const g = G.get(pr.o.p[0]); if (g) pr.o.d.t = pathParam(g, obj(pr.o.p[0]).g, p); } }
    if (k >= 1) { MOVES.splice(i, 1); commit(); }
  }
}
function stopAll() { ANIM.clear(); MOVES.length = 0; autosave(); }

/* --- 상태 표시줄 --- */
const stEl = document.getElementById('status');
let flashT = -1e9;
function status(s) { stEl.textContent = s; }
function flash(s) { status(s); flashT = performance.now(); }
const GTN = { pt: '점', ln: '선', ci: '원', arc: '호', poly: '다각형 내부', cint: '원 내부', sect: '부채꼴 내부', segm: '활꼴 내부', loc: '자취', plot: '그래프', val: '값', fn: '함수', txt: '글', amark: '각 표시', draw: '그림', cs: '좌표계', iter: '반복' };
function gtName(g) { return GTN[g] || g; }
function typeName(o) {
  const T = { free: '점', on: '경로 위의 점', int: '교점', mid: '중점', mid2: '중점', unit: '단위점', coord: '좌표로 찍은 점', fpt: '그래프 위의 점', seg: '선분', ray: '반직선', line: '직선', par: '평행선', perp: '수선', bis: '각의 이등분선', axis: '좌표축', circ: '원', circr: '원', arcon: '원 위의 호', arcc: '호', arc3: '세 점을 지나는 호', poly: '다각형 내부', cint: '원 내부', sect: '부채꼴 내부', segm: '활꼴 내부', xf: '변환된 ' + gtName(o.g), cs: '좌표계', loc: '자취', param: '매개변수', calc: '계산값', meas: '측정값', func: '함수', deriv: '도함수', plot: '함수의 그래프', text: '글상자', btn: '동작 버튼', amark: '각 표시', draw: '그림', iter: '반복 상', table: '표', dfn: '그림으로 정의한 함수', pplot: '매개변수 함수의 그래프', tplot: '표의 자료로 찍은 점', xval: '위칫값으로 찍은 점', img: '사진', unity: '단위점' };
  return T[o.t] || o.t;
}
function selSummary() {
  if (!SEL.length) return '';
  const cnt = {}; for (const id of SEL) { const o = obj(id); if (!o) continue; const n = gtName(o.g === 'ln' ? 'ln' : o.g); cnt[n] = (cnt[n] || 0) + 1; }
  return '선택: ' + Object.entries(cnt).map(([k, v]) => `${k} ${v}개`).join(', ');
}
const TOOLHINT = {
  arrow: { move: '화살표(이동): 클릭해 선택하고 끌어서 움직입니다. 빈 곳을 끌면 범위 선택, 점을 두 번 클릭하면 중심 지정.', rot: '화살표(회전): 지정한 중심을 기준으로 선택 개체를 돌립니다.', dil: '화살표(닮음): 지정한 중심을 기준으로 선택 개체를 확대·축소합니다.' },
  point: '점 도구: 빈 곳·선 위·교점을 클릭해 점을 만듭니다.',
  compass: '원 도구: 중심에서 원 위의 점까지 끌거나, 두 번 클릭합니다.',
  straight: { seg: '선분 도구: 두 점을 잇습니다. Shift를 누르면 15° 단위로 고정됩니다.', ray: '반직선 도구: 시작점에서 다른 점 방향으로 끌어 그립니다.', line: '직선 도구: 두 점을 지나는 직선을 그립니다.' },
  poly: '다각형 도구: 꼭짓점을 차례로 클릭하고 첫 점을 다시 클릭하면 완성됩니다.',
  text: '글 도구: 개체를 클릭하면 이름을 보이거나 숨깁니다. 빈 곳을 클릭하면 글상자를 만듭니다. 이름을 두 번 클릭하면 바꿉니다.',
  marker: '펜 도구: 꼭짓점에서 각 안쪽으로 끌면 각 표시, 선분을 클릭하면 같은 길이 표시, 빈 곳에서는 손으로 그립니다.',
  info: '정보 도구: 개체를 클릭하면 정의와 부모·자식 관계를 보여 줍니다.',
  custom: '사용자 도구: 도구의 조건 개체를 차례로 클릭합니다.'
};
function toolHint() { const h = TOOLHINT[TOOL]; return typeof h === 'string' ? h : h[SUB[TOOL]]; }
function hoverStatus(pw) {
  if (performance.now() - flashT < 2500) return;
  if (custState && TOOL === 'custom') return;
  let s = '';
  if (hoverId) { const o = obj(hoverId); s = describe(o); }
  else if ((TOOL === 'point' || TOOL === 'compass' || TOOL === 'straight' || TOOL === 'poly') && hoverT && hoverT.k === 'int') s = '교점';
  status(s || selSummary() || toolHint());
}
function describe(o) {
  const n = o.lab ? ' ' + o.lab : '';
  const P = o.p.map(id => { const q = obj(id); return q ? (q.g === 'ln' || q.t === 'seg' ? nameSegs(id).map(s => s.t).join('') : q.lab || typeName(q)) : '?'; });
  switch (o.t) {
    case 'free': return `점${n}`;
    case 'on': return `${P[0]} 위의 점${n}`;
    case 'int': return `${P[0]}와(과) ${P[1]}의 교점${n}`;
    case 'mid': return `${P[0]}의 중점${n}`;
    case 'seg': return `선분 ${o.lab && o.sl ? o.lab : P.join('')}`;
    case 'ray': return `반직선 ${P.join('')}`;
    case 'line': return `직선 ${P.join('')}`;
    case 'par': return `${P[0]}을 지나고 ${P[1]}에 평행한 직선${n}`;
    case 'perp': return `${P[0]}을 지나고 ${P[1]}에 수직인 직선${n}`;
    case 'bis': return `∠${P.join('')}의 이등분선${n}`;
    case 'circ': return `중심이 ${P[0]}이고 ${P[1]}을 지나는 원${n}`;
    case 'circr': return `중심이 ${P[0]}이고 반지름이 ${P[1]}인 원${n}`;
    case 'arcon': return `${P[0]} 위의 호 ${P[1]}${P[2]}`;
    case 'arc3': return `${P.join('')}를 지나는 호${n}`;
    case 'poly': return `다각형 ${P.join('')}의 내부`;
    case 'xf': return `${P[0]}의 ${{ tr: '평행이동', rot: '회전이동', dil: '닮음변환', ref: '대칭이동' }[o.d.tf.k]} 상${n}`;
    case 'loc': return `${P[0]}에 따른 ${P[1]}의 자취`;
  }
  return typeName(o) + n;
}

/* --- 객체 정보 풍선 --- */
const infoEl = document.getElementById('info');
function showInfo(id, cx, cy) {
  const o = obj(id); const par = o.p.map(p => obj(p)).filter(Boolean), kids = (KIDS.get(id) || []).map(obj).filter(Boolean);
  const li = q => `<li data-id="${q.id}">${esc(describe(q))}</li>`;
  infoEl.innerHTML = `<b>${esc(describe(o))}</b><div class="it">${esc(typeName(o))}${o.h ? ' (숨김)' : ''}</div>` +
    (par.length ? `<div class="ih">부모</div><ul>${par.map(li).join('')}</ul>` : '<div class="ih">독립 개체</div>') +
    (kids.length ? `<div class="ih">자식</div><ul>${kids.map(li).join('')}</ul>` : '');
  infoEl.hidden = false; const r = wrap.getBoundingClientRect();
  infoEl.style.left = Math.min(cx - r.left + 10, r.width - 280) + 'px'; infoEl.style.top = Math.min(cy - r.top + 10, r.height - infoEl.offsetHeight - 10) + 'px';
  infoEl.querySelectorAll('li').forEach(el => { el.onmouseenter = () => { hoverId = +el.dataset.id; redraw(); }; el.onclick = () => { showInfo(+el.dataset.id, cx, cy); }; });
}
function hideInfo() { infoEl.hidden = true; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
