/* ===================== 6. 명령 (작도·변환·측정·수·그래프·편집) ===================== */
const sel = () => SEL.map(obj).filter(Boolean);
function cnt() { const c = { n: 0 }; for (const o of sel()) { c[o.g] = (c[o.g] || 0) + 1; c.n++; } return c; }
const only = (c, spec) => c.n === Object.values(spec).reduce((a, b) => a + b, 0) && Object.entries(spec).every(([k, v]) => (c[k] || 0) === v);
const selOf = g => sel().filter(o => o.g === g);
const straights = () => sel().filter(o => o.g === 'ln');
const isSegLike = o => o.g === 'ln' && (o.t === 'seg' || (o.t === 'xf' && G.get(o.id)?.k === 'seg'));
function finish(made, msg) { if (made.length) SEL = made.map(o => o.id ?? o); commit(); if (msg) flash(msg); }

/* --- 작도 --- */
const C_ = {
  pointOn: { en: () => SEL.length > 0 && sel().every(pathish), run() { evaluate(); const made = sel().map(o => { const g = G.get(o.id); let t = .35; if (o.g === 'ci' || o.g === 'cint') t = PI / 3; if (o.g === 'plot') t = 1; if (o.g === 'ln' && g && g.k !== 'seg') t = .5; return addObj('on', 'pt', [o.id], { t }); }); finish(made); } },
  midpoint: { en: () => SEL.length > 0 && sel().every(isSegLike), run() { finish(sel().map(o => addObj('mid', 'pt', [o.id]))); } },
  intersect: { en: () => SEL.length === 2 && sel().every(o => canIntersect(o.g)), run() {
    evaluate();
    const [a, b] = SEL; const r = intersections(G.get(a), obj(a).g, G.get(b), obj(b).g); const made = [];
    const n = r.length; for (let k = 0; k < n; k++) { if (!D.objs.find(o => o.t === 'int' && o.p[0] === a && o.p[1] === b && o.d.k === k)) made.push(addObj('int', 'pt', [a, b], { k })); }
    if (!r.some(Boolean)) flash('지금은 두 개체가 만나지 않습니다. 교점은 만나게 되면 나타납니다.');
    finish(made);
  } },
  segment: { en: () => cnt().pt >= 2 && cnt().n === cnt().pt, run() { const P = SEL.slice(), made = []; for (let i = 0; i < P.length; i++) { if (P.length === 2 && i === 1) break; const a = P[i], b = P[(i + 1) % P.length]; if (!findSeg(a, b)) made.push(addObj('seg', 'ln', [a, b])); } finish(made); } },
  ray: { en: () => cnt().pt >= 2 && cnt().n === cnt().pt, run() { const P = SEL.slice(), made = []; for (let i = 0; i + 1 < P.length; i++) made.push(addObj('ray', 'ln', [P[i], P[i + 1]])); finish(made); } },
  line: { en: () => cnt().pt >= 2 && cnt().n === cnt().pt, run() { const P = SEL.slice(), made = []; for (let i = 0; i + 1 < P.length; i++) made.push(addObj('line', 'ln', [P[i], P[i + 1]])); finish(made); } },
  parallel: { en: () => { const c = cnt(); return c.pt >= 1 && c.ln >= 1 && c.n === c.pt + c.ln && (c.pt === 1 || c.ln === 1); }, run() { finish(mkPP('par')); } },
  perp: { en: () => { const c = cnt(); return c.pt >= 1 && c.ln >= 1 && c.n === c.pt + c.ln && (c.pt === 1 || c.ln === 1); }, run() { finish(mkPP('perp')); } },
  bisector: { en: () => only(cnt(), { pt: 3 }), run() { finish([addObj('bis', 'ln', SEL.slice())]); } },
  circCP: { en: () => only(cnt(), { pt: 2 }), run() { finish([addObj('circ', 'ci', SEL.slice())]); } },
  circCR: { en: () => { const c = cnt(), r = sel().filter(o => isSegLike(o) || (o.g === 'val' && o.t !== 'func')); return c.pt >= 1 && r.length >= 1 && c.n === c.pt + r.length && (c.pt === 1 || r.length === 1); }, run() {
    const P = selOf('pt'), R = sel().filter(o => o.g !== 'pt'), made = [];
    for (const p of P) for (const r of R) made.push(addObj('circr', 'ci', [p.id, r.id])); finish(made);
  } },
  arcOn: { en: () => { const c = cnt(); return (c.ci === 1 && c.pt === 2 && c.n === 3) || only(c, { pt: 3 }); }, run() {
    const c = cnt(); if (c.ci) { const ci = selOf('ci')[0], P = selOf('pt'); finish([addObj('arcon', 'arc', [ci.id, P[0].id, P[1].id])]); }
    else { finish([addObj('arcc', 'arc', SEL.slice())]); }
  } },
  arc3: { en: () => only(cnt(), { pt: 3 }), run() { finish([addObj('arc3', 'arc', SEL.slice())]); } },
  interior: { label: () => { const c = cnt(); return c.ci ? '원 내부' : c.arc ? '부채꼴 내부' : '다각형 내부'; }, en: () => { const c = cnt(); return (c.pt >= 3 && c.n === c.pt) || (c.ci >= 1 && c.n === c.ci) || (c.arc >= 1 && c.n === c.arc); }, run() {
    const c = cnt(); if (c.pt) finish([addObj('poly', 'poly', SEL.slice())]); else if (c.ci) finish(sel().map(o => addObj('cint', 'cint', [o.id]))); else finish(sel().map(o => addObj('sect', 'sect', [o.id])));
  } },
  segInterior: { en: () => { const c = cnt(); return c.arc >= 1 && c.n === c.arc; }, run() { finish(sel().map(o => addObj('segm', 'segm', [o.id]))); } },
  locus: { en: () => !!locusPair(), run() {
    const [drv, drn] = locusPair(); const o = addObj('loc', 'loc', [drv, drn], { n: obj(drn).g === 'pt' ? (D.prefs.locN || 200) : 60, env: 40 }); o.s.c = obj(drn).g === 'pt' ? '#8a2be2' : obj(drn).s.c; o.s.w = obj(drn).g === 'pt' ? 2 : 1; finish([o]);
  } },
};
function mkPP(t) { const P = selOf('pt'), L = straights(), made = []; for (const p of P) for (const l of L) made.push(addObj(t, 'ln', [p.id, l.id])); return made; }
function locusPair() {
  if (SEL.length !== 2) return null;
  for (const [a, b] of [[SEL[0], SEL[1]], [SEL[1], SEL[0]]]) { const A = obj(a), Bo = obj(b); if ((A.t === 'on' || A.t === 'param') && ancestors([b], false).has(a) && Bo.g !== 'val' && Bo.g !== 'txt') return [a, b]; }
  return null;
}

/* --- 변환 --- */
const T_ = {
  markCenter: { en: () => only(cnt(), { pt: 1 }), run() { D.marks.center = { ids: [SEL[0]] }; commit(); flash('중심을 지정했습니다.'); } },
  markMirror: { en: () => only(cnt(), { ln: 1 }), run() { D.marks.mirror = { ids: [SEL[0]] }; commit(); flash('대칭축을 지정했습니다.'); } },
  markAngle: { en: () => only(cnt(), { pt: 3 }) || (only(cnt(), { val: 1 })), run() { D.marks.angle = cnt().pt ? { ids: SEL.slice() } : { ids: [SEL[0]], val: 1 }; commit(); flash('각을 지정했습니다.'); } },
  markRatio: { en: () => (SEL.length === 2 && sel().every(isSegLike)) || only(cnt(), { val: 1 }) || only(cnt(), { pt: 3 }), run() { D.marks.ratio = cnt().val ? { ids: [SEL[0]], val: 1 } : cnt().pt ? { ids: SEL.slice(), pts: 1 } : { ids: SEL.slice() }; commit(); flash('비율을 지정했습니다.'); } },
  markVector: { en: () => only(cnt(), { pt: 2 }), run() { D.marks.vector = { ids: SEL.slice() }; commit(); flash('벡터를 지정했습니다.'); } },
  markDistance: { en: () => only(cnt(), { val: 1 }) || only(cnt(), { val: 2 }), run() { D.marks.distance = { ids: SEL.slice() }; commit(); flash('거리를 지정했습니다.'); } },
  translate: { en: canXf, run: () => xfDialog('tr') },
  rotate: { en: canXf, run: () => xfDialog('rot') },
  dilate: { en: canXf, run: () => xfDialog('dil') },
  reflect: { en: canXf, run() { const m = D.marks.mirror; if (!m || !G.get(m.ids[0])) { pickThen('대칭축으로 쓸 선을 스케치에서 클릭하세요.', o => o.g === 'ln', id => { D.marks.mirror = { ids: [id] }; doXf({ k: 'ref' }, [id], { m: 1 }); }); return; } doXf({ k: 'ref' }, [m.ids[0]], { m: 1 }); } },
  iterate: { en: () => (cnt().pt >= 1 && cnt().n === cnt().pt) || (SEL.length > 0 && sel().every(o => o.t === 'param')), run: iterDialog },
};
function canXf() { return SEL.length > 0 && sel().every(o => ['pt', 'ln', 'ci', 'arc', 'poly', 'cint', 'sect', 'segm', 'draw', 'img', 'tpts'].includes(o.g) && o.t !== 'iter' && o.t !== 'axis'); }
function pickThen(msg, filter, cb) { flash(msg); PICK = { filter, cb: id => { PICK = null; cb(id); } }; }
/* tf: 기본 정의(인덱스 없는 값). refs: 추가 부모 id 목록. idx: tf 필드 → refs 위치(1부터) */
function doXf(tf, refs, idx) {
  const made = [];
  const srcs = sel().filter(o => !refs.includes(o.id) || o.g !== 'pt' || tf.k !== 'rot');
  for (const o of srcs) {
    const t = { ...tf }; for (const [k, v] of Object.entries(idx)) t[k] = v;
    const x = addObj('xf', o.g, [o.id, ...refs], { tf: t });
    x.s = { ...o.s }; if (o.lab) { x.lab = o.lab + '′'; x.sl = o.sl; }
    if (o.d.ticks) x.d.ticks = o.d.ticks;
    made.push(x);
  }
  finish(made);
}
function markDesc(k) {
  const m = D.marks[k]; if (!m) return null;
  if (m.ids.some(id => !obj(id))) return null;
  if (k === 'center') return '점 ' + nm(m.ids[0]);
  if (k === 'mirror') return nameSegs(m.ids[0]).map(s => s.t).join('');
  if (k === 'angle') return m.val ? valName(m.ids[0]) : '∠' + m.ids.map(nm).join('');
  if (k === 'ratio') return m.val ? valName(m.ids[0]) : m.pts ? m.ids.map(nm).join(', ') : m.ids.map(id => nameSegs(id).map(s => s.t).join('')).join(' / ');
  if (k === 'vector') return nm(m.ids[0]) + ' → ' + nm(m.ids[1]);
  if (k === 'distance') return m.ids.map(valName).join(', ');
}
function xfDialog(kind) {
  const title = { tr: '평행이동', rot: '회전이동', dil: '닮음변환' }[kind];
  let html = '';
  const cen = markDesc('center');
  if (kind !== 'tr') html += `<div class="row"><label>중심</label><span class="mk">${cen ? esc(cen) : '<i>(지정 안 됨 — 확인을 누르면 점을 고르게 됩니다)</i>'}</span></div>`;
  if (kind === 'tr') {
    const vec = markDesc('vector'), dist = markDesc('distance');
    html += `<fieldset><legend>평행이동 벡터</legend>
      <label class="radio"><input type="radio" name="m" value="polar" ${vec ? '' : 'checked'}> 극좌표</label>
      <label class="radio"><input type="radio" name="m" value="rect"> 직교좌표</label>
      <label class="radio ${vec ? '' : 'dis'}"><input type="radio" name="m" value="vec" ${vec ? 'checked' : 'disabled'}> 지정한 벡터 ${vec ? '(' + esc(vec) + ')' : ''}</label>
      <div class="sub" data-for="polar"><div class="row"><label>거리</label><input name="r" value="1" size="6"> ${lenName()}</div><div class="row"><label>각</label><input name="deg" value="0" size="6"> °</div></div>
      <div class="sub" data-for="rect"><div class="row"><label>수평</label><input name="dx" value="1" size="6"> ${lenName()}</div><div class="row"><label>수직</label><input name="dy" value="0" size="6"> ${lenName()}</div></div>
      ${dist ? `<label class="chk"><input type="checkbox" name="usedist"> 지정한 거리·각 사용 (${esc(dist)})</label>` : ''}
    </fieldset>`;
  } else if (kind === 'rot') {
    const a = markDesc('angle');
    html += `<fieldset><legend>회전각</legend><label class="radio"><input type="radio" name="am" value="fix" ${a ? '' : 'checked'}> 고정각 <input name="deg" value="90" size="6"> °</label>
      <label class="radio ${a ? '' : 'dis'}"><input type="radio" name="am" value="mark" ${a ? 'checked' : 'disabled'}> 지정한 각 ${a ? '(' + esc(a) + ')' : ''}</label></fieldset>`;
  } else {
    const r = markDesc('ratio');
    html += `<fieldset><legend>비율</legend><label class="radio"><input type="radio" name="rm" value="fix" ${r ? '' : 'checked'}> 고정비 <input name="num" value="1" size="4"> : <input name="den" value="2" size="4"></label>
      <label class="radio ${r ? '' : 'dis'}"><input type="radio" name="rm" value="mark" ${r ? 'checked' : 'disabled'}> 지정한 비율 ${r ? '(' + esc(r) + ')' : ''}</label></fieldset>`;
  }
  dialog(title, html, f => {
    const num = n => evalNum(f[n].value);
    const go = () => {
      const c = D.marks.center;
      if (kind === 'tr') {
        const m = f.querySelector('input[name=m]:checked').value;
        if (m === 'vec') { const v = D.marks.vector.ids; return doXf({ k: 'tr', m: 'vec' }, v, { a: 1, b: 2 }); }
        if (f.usedist && f.usedist.checked) { const ds = D.marks.distance.ids, am = D.marks.angle; const refs = [ds[0]]; const t = { k: 'tr', m: 'polar' }; const idx = { dv: 1 }; if (ds[1]) { refs.push(ds[1]); idx.av = 2; } else if (am && am.val) { refs.push(am.ids[0]); idx.av = 2; } else t.deg = num('deg'); return doXf(t, refs, idx); }
        if (m === 'polar') return doXf({ k: 'tr', m: 'polar', r: num('r'), deg: num('deg') }, [], {});
        return doXf({ k: 'tr', m: 'rect', dx: num('dx'), dy: num('dy') }, [], {});
      }
      const need = (cb) => { if (c && G.get(c.ids[0])) cb(c.ids[0]); else pickThen('중심으로 쓸 점을 스케치에서 클릭하세요.', o => o.g === 'pt', id => { D.marks.center = { ids: [id] }; cb(id); }); };
      if (kind === 'rot') {
        const am = f.querySelector('input[name=am]:checked').value;
        need(cid => { if (am === 'fix') return doXf({ k: 'rot', am: 'fix', deg: num('deg') }, [cid], { c: 1 }); const a = D.marks.angle; if (a.val) return doXf({ k: 'rot', am: 'val' }, [cid, a.ids[0]], { c: 1, a: 2 }); return doXf({ k: 'rot', am: 'pts' }, [cid, ...a.ids], { c: 1, a: 2, b: 3, cc: 4 }); });
      } else {
        const rm = f.querySelector('input[name=rm]:checked').value;
        need(cid => { if (rm === 'fix') return doXf({ k: 'dil', rm: 'fix', num: num('num'), den: num('den') || 1 }, [cid], { c: 1 }); const r = D.marks.ratio; if (r.val) return doXf({ k: 'dil', rm: 'val' }, [cid, r.ids[0]], { c: 1, a: 2 }); if (r.pts) return doXf({ k: 'dil', rm: 'pts3' }, [cid, ...r.ids], { c: 1, a: 2, b: 3, cc: 4 }); return doXf({ k: 'dil', rm: 'segs' }, [cid, ...r.ids], { c: 1, a: 2, b: 3 }); });
      }
    };
    go();
  }, { onInit: f => { const upd = () => { f.querySelectorAll('.sub').forEach(s => { const r = f.querySelector('input[name=m]:checked'); s.hidden = !r || r.value !== s.dataset.for; }); }; f.querySelectorAll('input[name=m]').forEach(r => r.onchange = upd); upd(); } });
}
function evalNum(s) { try { const { ast } = parseExpr(String(s).replace(/p/g, 'π'), () => null, false); return evalAst(ast, {}); } catch (e) { return NaN; } }

/* 반복 */
function iterDialog() {
  const pre = SEL.slice(); const maps = [pre.map(() => null)]; let cur = 0, slot = 0;
  const body = () => `<p class="note">상(像)이 될 ${obj(pre[0]).g === 'val' ? '값' : '점'}을 스케치에서 차례로 클릭하세요.</p><div class="maps">${maps.map((m, k) => `<table class="map ${k === cur ? 'on' : ''}"><tr><th>원상</th><th>사상 ${k + 1}</th></tr>${pre.map((p, i) => `<tr><td>${esc(nm(p))}</td><td class="${k === cur && i === slot ? 'cur' : ''}">${m[i] ? esc(nm(m[i])) : '?'}</td></tr>`).join('')}</table>`).join('')}</div>
    <div class="row"><button type="button" class="addmap">새 사상 추가</button></div>
    <div class="row"><label>반복 횟수</label><input name="depth" value="3" size="4"></div><label class="chk"><input type="checkbox" name="fin"> 마지막 단계만 보이기</label>`;
  const dl = dialog('반복', body(), f => {
    PICK = null;
    if (maps.some(m => m.some(x => !x))) { flash('모든 상을 지정하지 않아 반복을 취소했습니다.'); return; }
    const depth = clamp(Math.round(evalNum(f.depth.value)) || 3, 1, 12);
    const numeric = obj(pre[0]).g === 'val';
    const o = addObj('iter', 'iter', [...pre, ...maps.flat()], { n: pre.length, maps: maps.length, depth, finalOnly: f.fin.checked, numeric, ...(numeric ? nextBoxPos() : {}) });
    finish([o], '반복 상을 만들었습니다. 선택한 채로 + / − 키를 누르면 반복 횟수가 바뀝니다.');
  }, { modeless: true, onClose: () => { PICK = null; } });
  const rerender = () => { const d = dl.querySelector('input[name=depth]').value, fin = dl.querySelector('input[name=fin]').checked; dl.querySelector('.body').innerHTML = body(); dl.querySelector('input[name=depth]').value = d; dl.querySelector('input[name=fin]').checked = fin; bind(); };
  const bind = () => { dl.querySelector('.addmap').onclick = () => { maps.push(pre.map(() => null)); cur = maps.length - 1; slot = 0; rerender(); }; };
  bind();
  PICK = { filter: o => o.g === (obj(pre[0]).g === 'val' ? 'val' : 'pt'), cb: id => { maps[cur][slot] = id; slot++; if (slot >= pre.length) slot = 0; rerender(); } };
}

/* --- 측정 --- */
function addMeas(m, parents) { const o = addObj('meas', 'val', parents, { m, ...nextBoxPos() }); return o; }
function nextBoxPos() { const vw = viewRect(); const ys = D.objs.filter(o => isBoxObj(o) && o.d.x < vw.x0 + 260 && o.d.y >= vw.y0 && o.d.y < vw.y1).map(o => o.d.y + (BOX.get(o.id)?.h || 22)); let y = vw.y0 + 16; for (const yy of ys.sort((a, b) => a - b)) if (yy + 6 > y) y = yy + 6; return { x: vw.x0 + 16, y }; }
function needCS() { const cs = CS(); if (cs) return cs.id; return defineCS().id; }
const M_ = {
  length: { en: () => SEL.length > 0 && sel().every(isSegLike), run() { finish(sel().map(o => addMeas('len', [o.id]))); } },
  distance: { en: () => { const c = cnt(); return only(c, { pt: 2 }) || only(c, { pt: 1, ln: 1 }); }, run() { const P = selOf('pt'), L = straights(); finish([addMeas('dist', L.length ? [P[0].id, L[0].id] : [P[0].id, P[1].id])]); } },
  perimeter: { en: () => SEL.length > 0 && sel().every(o => ['poly', 'sect', 'segm'].includes(o.g)), run() { finish(sel().map(o => addMeas('perim', [o.id]))); } },
  circum: { en: () => SEL.length > 0 && sel().every(o => o.g === 'ci' || o.g === 'cint'), run() { finish(sel().map(o => addMeas('circum', [o.id]))); } },
  angle: { en: () => only(cnt(), { pt: 3 }), run() { finish([addMeas('ang', SEL.slice())]); } },
  area: { en: () => SEL.length > 0 && sel().every(o => ['poly', 'cint', 'sect', 'segm', 'ci'].includes(o.g)), run() { finish(sel().map(o => addMeas('area', [o.id]))); } },
  arcAngle: { en: () => (SEL.length > 0 && sel().every(o => ['arc', 'sect', 'segm'].includes(o.g))) || (cnt().ci === 1 && cnt().pt === 2 && cnt().n === 3), run() { if (cnt().ci) { const c = selOf('ci')[0], P = selOf('pt'); finish([addMeas('arcang', [c.id, P[0].id, P[1].id])]); } else finish(sel().map(o => addMeas('arcang', [o.id]))); } },
  arcLength: { en: () => (SEL.length > 0 && sel().every(o => ['arc', 'sect', 'segm'].includes(o.g))) || (cnt().ci === 1 && cnt().pt === 2 && cnt().n === 3), run() { if (cnt().ci) { const c = selOf('ci')[0], P = selOf('pt'); finish([addMeas('arclen', [c.id, P[0].id, P[1].id])]); } else finish(sel().map(o => addMeas('arclen', [o.id]))); } },
  radius: { en: () => SEL.length > 0 && sel().every(o => ['ci', 'cint', 'arc', 'sect', 'segm'].includes(o.g)), run() { finish(sel().map(o => addMeas('rad', [o.id]))); } },
  ratio: { en: () => (SEL.length === 2 && sel().every(isSegLike)) || only(cnt(), { pt: 3 }), run() { finish([addMeas('ratio', SEL.slice())]); } },
  pointValue: { en: () => SEL.length > 0 && sel().every(o => o.t === 'on'), run() { finish(sel().map(o => addMeas('pval', [o.id]))); } },
  coords: { en: () => SEL.length > 0 && sel().every(o => o.g === 'pt'), run() { const cs = needCS(); finish(sel().map(o => addMeas('coord', [cs, o.id]))); } },
  abscissa: { en: () => SEL.length > 0 && sel().every(o => o.g === 'pt'), run() { const cs = needCS(); finish(sel().map(o => addMeas('xc', [cs, o.id]))); } },
  ordinate: { en: () => SEL.length > 0 && sel().every(o => o.g === 'pt'), run() { const cs = needCS(); finish(sel().map(o => addMeas('yc', [cs, o.id]))); } },
  cdist: { en: () => only(cnt(), { pt: 2 }), run() { const cs = needCS(); finish([addMeas('cdist', [cs, ...SEL])]); } },
  slope: { en: () => SEL.length > 0 && sel().every(o => o.g === 'ln'), run() { const cs = needCS(); finish(sel().map(o => addMeas('slope', [cs, o.id]))); } },
  equation: { en: () => SEL.length > 0 && sel().every(o => o.g === 'ln' || o.g === 'ci'), run() { const cs = needCS(); finish(sel().map(o => addMeas('eq', [cs, o.id]))); } },
};

/* --- 수 --- */
function valueObjs() { if (structDirty) rebuildIndex(); return ORDER.filter(o => o.g === 'val' && o.t !== 'table'); }
function nameMap() { if (structDirty) rebuildIndex(); const m = new Map(); for (const o of valueObjs()) m.set(valName(o.id), { kind: 'ref', id: o.id }); for (const o of ORDER.filter(o => o.g === 'fn')) m.set(o.lab, { kind: 'fref', id: o.id }); return m; }
function paramDialog(o) {
  const isNew = !o; const lab = o ? o.lab : nextLabel('pa'); const r = o?.d.range || [0, 10];
  dialog(isNew ? '새 매개변수' : '매개변수 편집', `<div class="row"><label>이름</label><input name="lab" value="${esc(lab)}" size="10"></div>
    <div class="row"><label>값</label><input name="v" value="${o ? o.d.v : 1}" size="10"></div>
    <fieldset><legend>단위</legend><label class="radio"><input type="radio" name="u" value="" ${!o || !o.d.u ? 'checked' : ''}> 없음</label><label class="radio"><input type="radio" name="u" value="L" ${o?.d.u === 'L' ? 'checked' : ''}> 거리 (${lenName()})</label><label class="radio"><input type="radio" name="u" value="A" ${o?.d.u === 'A' ? 'checked' : ''}> 각 (${D.prefs.angUnit === 'deg' ? '°' : '라디안'})</label></fieldset>
    <div class="row"><label>애니메이션 범위</label><input name="r0" value="${r[0]}" size="5"> ~ <input name="r1" value="${r[1]}" size="5"></div>`, f => {
    const v = evalNum(f.v.value); if (!isFinite(v)) return false;
    const u = f.querySelector('input[name=u]:checked').value;
    const range = [evalNum(f.r0.value), evalNum(f.r1.value)];
    if (isNew) { const p = addObj('param', 'val', [], { v, u, range, ...nextBoxPos() }); p.lab = f.lab.value.trim() || lab; finish([p]); }
    else { o.d.v = v; o.d.u = u; o.d.range = range; o.lab = f.lab.value.trim() || o.lab; commit(); }
  });
}
let calcPickTarget = null;
function calcDialog(o) {
  const isNew = !o;
  const src = o ? astSrcPretty(o.d.ast, { ref: i => valName(o.p[i]), fref: i => nm(o.p[i]) }) : '';
  const vals = valueObjs().filter(v => !o || !descendants([o.id]).has(v.id));
  const fns = ORDER.filter(x => x.g === 'fn');
  const keys = ['7', '8', '9', '+', '^', '4', '5', '6', '−', '(', '1', '2', '3', '×', ')', '0', '.', 'π', '÷', '⌫'];
  const dl = dialog(isNew ? '새 계산' : '계산 편집', `<input name="ex" class="ex" value="${esc(src)}" autocomplete="off" spellcheck="false">
    <div class="res">= </div>
    <div class="calc"><div class="keys">${keys.map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="lists"><select name="vals"><option value="">값 ▾</option>${vals.map(v => `<option>${esc(valName(v.id))}</option>`).join('')}</select>
    <select name="fns"><option value="">함수 ▾</option>${FUNCS.filter(f => !FUNC_ALIAS[f]).map(f => `<option>${f}</option>`).join('')}${fns.map(x => `<option value="[${esc(x.lab)}]">${esc(x.lab)}</option>`).join('')}</select>
    <button type="button" class="deg" title="각도 단위">°</button></div></div>
    <p class="note">스케치의 측정값·매개변수를 클릭하면 식에 들어갑니다.</p>`, f => {
    let r; try { r = parseExpr(f.ex.value, nm2 => nameMap().get(nm2) || null, false); } catch (e) { alertBox(e.message); return false; }
    if (o && r.refs.some(id => descendants([o.id]).has(id))) { alertBox('자기 자신에 의존하는 값은 쓸 수 없습니다.'); return false; }
    PICK = null;
    if (isNew) finish([addObj('calc', 'val', r.refs, { ast: r.ast, ...nextBoxPos() })]);
    else { o.p = r.refs; o.d.ast = r.ast; structDirty = true; commit(); }
  }, { modeless: true, onClose: () => { PICK = null; } });
  const ex = dl.querySelector('.ex'), res = dl.querySelector('.res');
  const ins = s => { const a = ex.selectionStart ?? ex.value.length, b = ex.selectionEnd ?? a; ex.value = ex.value.slice(0, a) + s + ex.value.slice(b); ex.focus(); ex.selectionStart = ex.selectionEnd = a + s.length; upd(); };
  const upd = () => { try { const r = parseExpr(ex.value, n => nameMap().get(n) || null, false); evaluate(); const R = r.refs.map(id => G.get(id)?.v), U = r.refs.map(id => G.get(id)?.u); const u = dimOf(r.ast, U); const v = evalAst(r.ast, { R, F: r.refs.map(id => G.get(id)?.f), deg: D.prefs.angUnit === 'deg' }); res.textContent = '= ' + fmtVal(v, isZ(u) ? null : u); res.classList.remove('err'); } catch (e) { res.textContent = ex.value.trim() ? e.message : '= '; res.classList.toggle('err', !!ex.value.trim()); } };
  dl.querySelectorAll('.keys button').forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === '⌫') { const a = ex.selectionStart; if (a > 0) { ex.value = ex.value.slice(0, a - 1) + ex.value.slice(a); ex.selectionStart = ex.selectionEnd = a - 1; } upd(); ex.focus(); return; } ins(k === '−' ? '-' : k === '×' ? '*' : k === '÷' ? '/' : k); });
  dl.querySelector('select[name=vals]').onchange = e => { if (e.target.value) ins('[' + e.target.value + ']'); e.target.value = ''; };
  dl.querySelector('select[name=fns]').onchange = e => { if (e.target.value) ins(e.target.value + '('); e.target.value = ''; };
  dl.querySelector('.deg').onclick = () => ins('°');
  ex.oninput = upd; upd(); setTimeout(() => ex.focus(), 30);
  PICK = { filter: x => x.g === 'val' && (!o || !descendants([o.id]).has(x.id)), cb: id => ins('[' + valName(id) + ']') };
}
function funcDialog(_, o) {
  const isNew = !o; const lab = o ? o.lab : nextLabel('fn');
  const src = o ? astSrcPretty(o.d.ast, { ref: i => valName(o.p[i]), fref: i => nm(o.p[i]) }) : '';
  const dl = dialog(isNew ? '새 함수' : '함수 편집', `<div class="row"><input name="lab" value="${esc(lab)}" size="3" class="fl"> (x) = <input name="ex" class="ex" value="${esc(src)}" autocomplete="off" spellcheck="false" style="flex:1"></div>
    <div class="res"></div>${isNew ? '<label class="chk"><input type="checkbox" name="plot" checked> 그래프 그리기</label>' : ''}
    <p class="note">예: x^2 − 2x + 1,  sin(x),  [t₁]·x,  sqrt(x),  |x|.  스케치의 값을 클릭하면 식에 들어갑니다.</p>`, f => {
    let r; try { r = parseExpr(f.ex.value, nm2 => { const m = nameMap().get(nm2); return m && (!o || m.id !== o.id) ? m : null; }, true); } catch (e) { alertBox(e.message); return false; }
    PICK = null;
    if (isNew) { const fo = addObj('func', 'fn', r.refs, { ast: r.ast, ...nextBoxPos() }); fo.lab = f.lab.value.trim() || lab; const made = [fo]; if (f.plot.checked) { evaluate(); made.push(plotFn(fo.id)); } finish(made); }
    else { o.p = r.refs; o.d.ast = r.ast; o.lab = f.lab.value.trim() || o.lab; structDirty = true; commit(); }
  }, { modeless: true, onClose: () => { PICK = null; } });
  const ex = dl.querySelector('.ex'), res = dl.querySelector('.res');
  const upd = () => { try { const r = parseExpr(ex.value, n => nameMap().get(n) || null, true); res.textContent = 'f(x) = ' + astStr(r.ast, { ref: i => valName(r.refs[i]), fref: i => nm(r.refs[i]) }); res.classList.remove('err'); } catch (e) { res.textContent = ex.value.trim() ? e.message : ''; res.classList.add('err'); } };
  ex.oninput = upd; upd(); setTimeout(() => ex.focus(), 30);
  PICK = { filter: x => x.g === 'val', cb: id => { const a = ex.selectionStart ?? ex.value.length; ex.value = ex.value.slice(0, a) + '[' + valName(id) + ']' + ex.value.slice(a); upd(); ex.focus(); } };
}
function plotFn(fid) { const cs = needCS(); const p = addObj('plot', 'plot', [cs, fid], {}); p.s.c = ['#1f6f2a', '#b5302a', '#2a5bb5', '#8b4ab0'][D.objs.filter(o => o.t === 'plot').length % 4]; return p; }
const N_ = {
  newParam: { en: () => true, run: () => paramDialog(null) },
  calculate: { en: () => true, run: () => calcDialog(null) },
  tabulate: { en: () => SEL.length > 0 && sel().every(o => o.g === 'val' && o.t !== 'meas' || (o.g === 'val' && !['coord', 'eq'].includes(o.d.m))), run() { finish([addObj('table', 'val', SEL.slice(), { rows: [], ...nextBoxPos() })], '표를 두 번 클릭하면 현재 값이 새 행으로 추가됩니다.'); } },
  addRow: { en: () => only(cnt(), { val: 1 }) && sel()[0].t === 'table', run() { addTableRow(sel()[0]); } },
  newFunc: { en: () => true, run: () => funcDialog(null, null) },
  derivative: { en: () => only(cnt(), { fn: 1 }), run() { const f = sel()[0]; const lab = f.lab.replace(/′*$/, m => m) + '′'; const o = addObj('deriv', 'fn', [f.id], nextBoxPos()); o.lab = lab; finish([o]); } },
};
function addTableRow(o) { evaluate(); const row = o.p.map(id => { const g = G.get(id); return g ? fmtVal(g.v, null, obj(id)?.dg ?? D.prefs.digits) : '—'; }); o.d.rows = o.d.rows || []; o.d.rows.push(row); o.d.live = true; commit(); }

/* --- 그래프 --- */
function defineCS() {
  const vw = viewRect(); const or = addObj('free', 'pt', [], { x: Math.round((vw.x0 + vw.x1) / 2), y: Math.round((vw.y0 + vw.y1) / 2) }); or.lab = ''; or.sl = false; D.lc.pt--; or.lab = 'O'; or.sl = false;
  const un = addObj('unit', 'pt', [or.id], { d: 37.7952755906 }); un.lab = ''; un.sl = false; D.lc.pt = Math.max(0, D.lc.pt - 1);
  const cs = addObj('cs', 'cs', [or.id, un.id], { grid: true });
  const ax = addObj('axis', 'ln', [cs.id], { w: 'x' }), ay = addObj('axis', 'ln', [cs.id], { w: 'y' });
  for (const a of [ax, ay]) { a.s.c = '#222222'; a.s.w = 1; a.lab = ''; a.sl = false; }
  evaluate(); return cs;
}
const GR_ = {
  defineCS: { en: () => !CS(), run() { defineCS(); SEL = []; commit(); } },
  gridToggle: { label: () => CS() && CS().d.grid !== false ? '격자 숨기기' : '격자 보이기', en: () => !!CS(), run() { const c = CS(); c.d.grid = c.d.grid === false; commit(); } },
  dotGrid: { check: () => !!CS()?.d.dots, en: () => !!CS(), run() { const c = CS(); c.d.dots = !c.d.dots; commit(); } },
  snap: { check: () => D.prefs.snap, en: () => true, run() { D.prefs.snap = !D.prefs.snap; if (D.prefs.snap) needCS(); commit(); } },
  plotPoints: { en: () => true, run() {
    const vals = only(cnt(), { val: 2 });
    if (vals) { const cs = needCS(); finish([addObj('coord', 'pt', [cs, SEL[0], SEL[1]], { m: 'val' })]); return; }
    dialog('좌표로 점 찍기', `<div class="row"><label>x =</label><input name="x" value="1" size="8"></div><div class="row"><label>y =</label><input name="y" value="1" size="8"></div><p class="note">값 두 개를 선택하고 실행하면 (값1, 값2) 점을 찍습니다.</p>`, f => { const cs = needCS(); const x = evalNum(f.x.value), y = evalNum(f.y.value); if (!isFinite(x) || !isFinite(y)) return false; finish([addObj('coord', 'pt', [cs], { x, y })]); });
  } },
  plotFunc: { label: () => only(cnt(), { fn: 1 }) ? '함수의 그래프 그리기' : '함수의 그래프 그리기...', en: () => true, run() { if (only(cnt(), { fn: 1 })) finish([plotFn(SEL[0])]); else funcDialog(null, null); } },
  pointOnPlot: { en: () => only(cnt(), { fn: 1, val: 1 }), run() { const f = selOf('fn')[0], v = selOf('val')[0]; const cs = needCS(); finish([addObj('fpt', 'pt', [cs, f.id, v.id])]); } },
};

/* --- 편집 --- */
function selectAll() {
  const f = { arrow: () => true, point: o => o.g === 'pt', compass: o => o.g === 'ci', straight: o => o.g === 'ln', poly: o => o.g === 'poly', text: o => isBoxObj(o), marker: o => o.t === 'amark' || o.t === 'draw' }[TOOL] || (() => true);
  SEL = ORDER.filter(o => !o.h && o.t !== 'cs' && f(o)).map(o => o.id); redraw(); updateUI();
}
function deleteSel() { if (!SEL.length) return; const all = removeObjs(SEL); for (const id of all) ANIM.delete(id); SEL = []; commit(); flash(`개체 ${all.size}개를 지웠습니다.`); }
let CLIP = null;
function copySel() { if (!SEL.length) return; const keep = ancestors(SEL); const objs = D.objs.filter(o => keep.has(o.id)).map(o => JSON.parse(JSON.stringify(o))); CLIP = { objs, sel: SEL.slice() }; try { navigator.clipboard?.writeText(JSON.stringify({ webgsp: CLIP })).catch(() => { }); } catch (e) { } flash('복사했습니다.'); }
function pasteClip() {
  if (!CLIP) return; const map = new Map(); const made = [];
  for (const src of CLIP.objs) {
    if (src.t === 'cs' || src.t === 'unit' || src.t === 'axis') { const cs = CS(); if (cs) { if (src.t === 'cs') map.set(src.id, cs.id); else if (src.t === 'unit') map.set(src.id, cs.p[1]); else { const ax = axisOf(cs, src.d.w); if (ax) map.set(src.id, ax.id); } continue; } }
    const o = JSON.parse(JSON.stringify(src)); o.id = D.next++; o.p = o.p.map(p => map.get(p) ?? p);
    if (o.t === 'free') { o.d.x += 24; o.d.y += 24; } if (isBoxObj(o)) { o.d.x += 24; o.d.y += 24; } if (o.t === 'draw') o.d.pts = o.d.pts.map(p => ({ x: p.x + 24, y: p.y + 24 }));
    if (labelKind(o.g) && o.lab) o.lab = nextLabel(labelKind(o.g));
    if (!CLIP.sel.includes(src.id) && !keepVisible(src)) { } D.objs.push(o); map.set(src.id, o.id); if (CLIP.sel.includes(src.id)) made.push(o.id);
  }
  structDirty = true; SEL = made; commit();
}
const keepVisible = () => true;
const E_ = {
  undo: { label: () => '실행 취소', en: () => UNDO.length > 0, run: undo },
  redo: { en: () => REDO.length > 0, run: redo },
  cut: { en: () => SEL.length > 0, run() { copySel(); deleteSel(); } },
  copy: { en: () => SEL.length > 0, run: copySel },
  paste: { en: () => !!CLIP, run: pasteClip },
  clear: { en: () => SEL.length > 0, run: deleteSel },
  btnHide: { en: () => SEL.length > 0, run() { const what = sel().length === 1 ? (describe(sel()[0])) : '개체'; const b = addObj('btn', 'txt', SEL.slice(), { kind: 'hide', label: '숨기기 ' + what, what, state: 'shown', ...nextBoxPos() }); finish([b]); } },
  btnAnim: { en: () => SEL.length > 0 && sel().some(o => o.t === 'on' || o.t === 'param' || o.t === 'free'), run() { const ids = sel().filter(o => o.t === 'on' || o.t === 'param' || o.t === 'free').map(o => o.id); const b = addObj('btn', 'txt', ids, { kind: 'anim', label: '애니메이션 ' + ids.map(nm).join(', '), ...nextBoxPos() }); finish([b]); } },
  btnMove: { en: () => { const c = cnt(); return c.pt >= 2 && c.pt % 2 === 0 && c.n === c.pt; }, run() { const b = addObj('btn', 'txt', SEL.slice(), { kind: 'move', speed: 1, label: '이동 ' + SEL.filter((_, i) => i % 2 === 0).map(nm).join(',') + ' → ' + SEL.filter((_, i) => i % 2).map(nm).join(','), ...nextBoxPos() }); finish([b]); } },
  selectAll: { en: () => D.objs.length > 0, run: selectAll },
  selParents: { en: () => SEL.length > 0, run() { const s = new Set(SEL); for (const id of SEL) for (const a of ancestors([id], false)) if (!obj(a).h && obj(a).t !== 'cs') s.add(a); SEL = [...s]; redraw(); updateUI(); } },
  selChildren: { en: () => SEL.length > 0, run() { const s = new Set(SEL); for (const a of descendants(SEL, false)) if (!obj(a).h) s.add(a); SEL = [...s]; redraw(); updateUI(); } },
  splitMerge: { label: () => { const c = cnt(); if (c.n === 1 && sel()[0].t === 'on') return '점을 경로에서 분리'; if (c.n === 2 && c.pt >= 1) return c.pt === 2 ? '점 병합' : '점을 경로에 병합'; return '분리/병합'; }, en: () => { const c = cnt(), s = sel(); if (c.n === 1 && s[0].t === 'on') return true; if (c.n === 2) { const fp = s.find(o => o.t === 'free'), other = s.find(o => o !== fp); if (!fp || !other) return false; if (descendants([fp.id]).has(other.id)) return false; return other.g === 'pt' || pathish(other); } return false; }, run: splitMerge },
  editDef: { label: () => { const o = sel()[0]; return o && o.t === 'calc' ? '계산 편집...' : o && o.t === 'param' ? '매개변수 편집...' : o && o.t === 'func' ? '함수 편집...' : '정의 편집...'; }, en: () => SEL.length === 1 && ['calc', 'param', 'func', 'text'].includes(sel()[0].t), run() { const o = sel()[0]; ({ calc: calcDialog, param: paramDialog, func: x => funcDialog(null, x), text: x => editText(x) })[o.t](o); } },
  props: { en: () => SEL.length > 0, run: () => propsDialog(sel()) },
  prefs: { en: () => true, run: prefsDialog },
};
function splitMerge() {
  evaluate();
  const s = sel();
  if (s.length === 1 && s[0].t === 'on') { const o = s[0], g = G.get(o.id); o.t = 'free'; o.p = []; o.d = { x: g.x + 12, y: g.y - 12 }; structDirty = true; commit(); flash('점을 경로에서 분리했습니다.'); return; }
  const fp = s.find(o => o.t === 'free'), other = s.find(o => o !== fp);
  if (other.g === 'pt') { for (const o of D.objs) o.p = o.p.map(p => p === fp.id ? other.id : p); D.objs = D.objs.filter(o => o !== fp); structDirty = true; SEL = [other.id]; commit(); flash('두 점을 병합했습니다.'); return; }
  const pg = G.get(other.id); fp.t = 'on'; fp.p = [other.id]; fp.d = { t: pathParam(pg, other.g, { x: fp.d.x, y: fp.d.y }) }; structDirty = true; SEL = [fp.id]; commit(); flash('점을 경로에 병합했습니다.');
}

/* --- 보기 --- */
const PALETTE = ['#000000', '#555555', '#999999', '#cccccc', '#e0201b', '#f07818', '#f2b830', '#d9d900', '#2c9e2c', '#1f8f8f', '#1d3f9e', '#4a7fe0', '#8a2be2', '#c0308f', '#8b5a2b', '#ffffff'];
const DSP_ = {
  hide: { label: () => SEL.length && sel().every(o => o.h) ? '개체 보이기' : '개체 숨기기', en: () => SEL.length > 0, run() { const h = !sel().every(o => o.h); for (const o of sel()) o.h = h; if (h) SEL = []; commit(); } },
  showAll: { en: () => D.objs.some(o => o.h && o.t !== 'unit'), run() { const ids = []; for (const o of D.objs) if (o.h && o.t !== 'unit' && !isIterHidden(o)) { o.h = false; ids.push(o.id); } SEL = ids; commit(); } },
  label: { label: () => SEL.length && sel().some(o => o.sl) ? '이름 숨기기' : '이름 보이기', en: () => SEL.length > 0 && sel().some(o => labelKind(o.g)), run() { const on = !sel().some(o => o.sl); for (const o of sel()) if (labelKind(o.g)) { if (!o.lab) o.lab = nextLabel(labelKind(o.g)); o.sl = on; } commit(); } },
  rename: { label: () => SEL.length === 1 ? (labelKind(sel()[0].g) || ['param', 'func', 'calc'].includes(sel()[0].t) ? '이름 바꾸기...' : '이름 바꾸기...') : '이름 바꾸기...', en: () => SEL.length === 1 && (!!labelKind(sel()[0].g) || ['param', 'func', 'calc', 'poly'].includes(sel()[0].t)), run() { renameDialog(SEL[0]); } },
  trace: { label: () => '흔적 남기기', check: () => SEL.length > 0 && sel().every(o => o.tr), en: () => SEL.length > 0 && sel().every(o => !isBoxObj(o)), run() { const on = !sel().every(o => o.tr); for (const o of sel()) o.tr = on; commit(); } },
  erase: { en: () => true, run: eraseTraces },
  animate: { label: () => '애니메이션', en: () => SEL.length > 0 && sel().some(o => o.t === 'on' || o.t === 'param' || o.t === 'free'), run() { for (const o of sel()) startAnim(o.id); kick(); } },
  faster: { en: () => ANIM.size > 0, run() { animSpeed = Math.min(8, animSpeed * 1.5); flash('속도 ×' + animSpeed.toFixed(2)); } },
  slower: { en: () => ANIM.size > 0, run() { animSpeed = Math.max(.1, animSpeed / 1.5); flash('속도 ×' + animSpeed.toFixed(2)); } },
  stop: { en: () => ANIM.size > 0 || MOVES.length > 0, run: stopAll },
  toolbox: { label: () => document.getElementById('toolbox').hidden ? '도구모음 보이기' : '도구모음 숨기기', en: () => true, run() { const t = document.getElementById('toolbox'); t.hidden = !t.hidden; setTimeout(resize, 10); } },
};
const isIterHidden = () => false;
function setStyle(fn) { if (!SEL.length) return; for (const o of sel()) fn(o); commit(); }

/* --- 사용자 도구 --- */
function makeTool() {
  const S = new Set(SEL);
  if (!SEL.length) return alertBox('도구로 만들 작도를 먼저 선택하세요. (조건이 되는 개체와 결과 개체를 모두)');
  let givens = SEL.filter(id => ![...ancestors([id], false)].some(a => S.has(a)));
  const results = SEL.filter(id => !givens.includes(id));
  if (!results.length) return alertBox('선택한 개체 중 다른 선택 개체로부터 작도된 결과가 없습니다.');
  const need = ancestors(results); const dg = descendants(givens);
  const steps0 = new Set([...need].filter(id => dg.has(id) && !givens.includes(id)));
  // 경계 조건(자동 조건)
  const extra = [];
  for (const id of steps0) for (const p of obj(id).p) if (!steps0.has(p) && !givens.includes(p) && !extra.includes(p)) extra.push(p);
  const all = [...givens, ...extra];
  const gv = all.map(id => { const o = obj(id); return o.t === 'cs' ? { g: 'cs', auto: 'cs' } : o.t === 'axis' ? { g: 'ln', auto: 'axis', w: o.d.w } : { g: o.g, name: o.lab || describe(o), lab: o.lab || '' }; });
  const idx = new Map(); all.forEach((id, i) => idx.set(id, { g: i }));
  const steps = [];
  for (const o of ORDER) if (steps0.has(o.id)) { idx.set(o.id, { s: steps.length }); steps.push({ t: o.t, g: o.g, d: JSON.parse(JSON.stringify(o.d)), s: { ...o.s }, p: o.p.map(p => idx.get(p)), res: S.has(o.id), sl: o.sl, lo: o.lo, lab: o.lab || '' }); }
  dialog('사용자 도구 만들기', `<div class="row"><label>도구 이름</label><input name="nm" value="도구 ${D.tools.length + 1}" size="18"></div><label class="chk"><input type="checkbox" name="am"> 이름이 같은 개체에 자동으로 대입 (예: 점 A가 있으면 A에 바로 적용)</label><label class="chk"><input type="checkbox" name="kl"> 결과 개체에 원래 이름 붙이기</label><p class="note">조건 ${gv.filter(g => !g.auto).length}개 (${gv.filter(g => !g.auto).map(g => gtName(g.g)).join(', ')}) → 결과 ${results.length}개</p>`, f => {
    D.tools.push({ name: f.nm.value.trim() || '도구', givens: gv, steps, auto: f.am.checked, keepLabels: f.kl.checked }); saveToolLib(); commit(); flash('사용자 도구를 만들었습니다. 도구상자의 ▶ 단추에서 고르세요.');
  });
}
function instantiateTool(tool, got) {
  const ids = []; let gi = 0;
  for (const g of tool.givens) { if (g.auto === 'cs') ids.push(needCS()); else if (g.auto === 'axis') { needCS(); ids.push(axisOf(CS(), g.w).id); } else ids.push(got[gi++]); }
  const sids = [], made = [];
  for (const st of tool.steps) {
    const p = st.p.map(r => r.g !== undefined ? ids[r.g] : sids[r.s]);
    const o = addObj(st.t, st.g, p, JSON.parse(JSON.stringify(st.d)));
    o.s = { ...st.s }; o.h = !st.res; if (!st.res) o.sl = false; else if (labelKind(st.g)) o.sl = st.sl ?? o.sl;
    if (st.res && tool.keepLabels && st.lab && !D.objs.some(x => x !== o && x.lab === st.lab)) o.lab = st.lab;
    if (o.g === 'val' || o.g === 'fn' || o.t === 'btn' || o.t === 'text') Object.assign(o.d, nextBoxPos());
    sids.push(o.id); if (st.res) made.push(o.id);
  }
  return made;
}
function custGivensRealCount(t) { return t.givens.filter(g => !g.auto).length; }
function chooseTool(i) { const t = D.tools[i]; const real = { ...t, givens: t.givens.filter(g => !g.auto), _orig: t }; custState = { tool: { ...t, givens: t.givens.filter(g => !g.auto) }, orig: t, got: [] }; setTool('custom'); status(`${t.name}: 1번째 대상(${gtName(custState.tool.givens[0]?.g)})을 클릭하세요.`); }
function saveToolLib() { try { const lib = JSON.parse(localStorage.getItem('webgsp.tools') || '[]'); for (const t of D.tools) if (!lib.some(x => x.name === t.name && JSON.stringify(x.steps) === JSON.stringify(t.steps))) lib.push(t); localStorage.setItem('webgsp.tools', JSON.stringify(lib)); } catch (e) { } }
