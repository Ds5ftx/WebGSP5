/* ===================== 10. 다중 좌표계 · 가변 문자열 · 스크립트 · 그림 함수 · 고급 선택사항 ===================== */
/* --- 다중 좌표계 / 좌표계 지정 --- */
defineCS = function (opt = {}) {
  const vw = viewRect(); const others = D.objs.filter(o => o.t === 'cs').length;
  let origin = opt.origin;
  if (!origin) { const or = addObj('free', 'pt', [], { x: Math.round((vw.x0 + vw.x1) / 2) + others * 40, y: Math.round((vw.y0 + vw.y1) / 2) + others * 40 }); D.lc.pt = Math.max(0, D.lc.pt - 1); or.lab = others ? 'O' + subNum(others + 1) : 'O'; or.sl = false; origin = or.id; }
  const un = addObj('unit', 'pt', [origin], { d: opt.unitPx || 37.7952755906 }); un.lab = ''; un.sl = false; D.lc.pt = Math.max(0, D.lc.pt - 1);
  const parents = [origin, un.id]; const d = { grid: true };
  if (opt.len) { parents.push(opt.len); d.ilen = 2; un.h = true; }
  const cs = addObj('cs', 'cs', parents, d);
  const ax = addObj('axis', 'ln', [cs.id], { w: 'x' }), ay = addObj('axis', 'ln', [cs.id], { w: 'y' });
  for (const a of [ax, ay]) { a.s.c = '#222222'; a.s.w = 1; a.lab = ''; a.sl = false; }
  if (others) { // 새 좌표계를 지정 좌표계로
    D.marks.cs = { ids: [cs.id] };
    for (const o of D.objs.filter(o => o.t === 'cs' && o !== cs)) o.d.grid = o.d.grid; // 유지
  }
  evaluate(); return cs;
};
GR_.defineCS.label = () => D.objs.some(o => o.t === 'cs') ? '새 좌표계 정의' : '좌표계 정의';
GR_.defineCS.en = () => { const c = cnt(); if (!c.n) return true; if (only(c, { pt: 1 })) return true; if (only(c, { ci: 1 })) return sel()[0].t === 'circ' || sel()[0].t === 'circr'; if (c.pt === 1 && c.n === 2) { const o = sel().find(x => x.g !== 'pt'); return isSegLike(o) || (o.g === 'val' && o.t !== 'table'); } return false; };
GR_.defineCS.run = () => {
  const c = cnt(); let cs;
  if (!c.n) cs = defineCS();
  else if (only(c, { pt: 1 })) cs = defineCS({ origin: SEL[0] });
  else if (only(c, { ci: 1 })) { const ci = sel()[0]; cs = defineCS({ origin: ci.p[0], len: ci.id }); }
  else { const p = sel().find(x => x.g === 'pt'), L = sel().find(x => x.g !== 'pt'); cs = defineCS({ origin: p.id, len: L.id }); }
  SEL = []; commit(); flash(D.objs.filter(o => o.t === 'cs').length > 1 ? '새 좌표계를 만들고 지정 좌표계로 정했습니다. 측정·그래프는 지정 좌표계를 따릅니다.' : '좌표계를 만들었습니다.');
};
function markCS() { const o = sel()[0]; const cs = o.t === 'cs' ? o : obj(o.p[0]); D.marks.cs = { ids: [cs.id] }; commit(); flash('지정 좌표계를 바꿨습니다. 새 측정과 그래프는 이 좌표계를 따릅니다.'); }
/* 지정 좌표계 축을 굵게 */
const _drawCS = drawCS;
drawCS = function (c, o, g) { _drawCS(c, o, g); if (D.objs.filter(x => x.t === 'cs').length > 1 && CS() === o) { c.save(); c.strokeStyle = 'rgba(30,90,200,.35)'; c.lineWidth = 4; c.beginPath(); c.arc(g.o.x, g.o.y, 9, 0, TAU); c.stroke(); c.restore(); } };

/* --- 가변 문자열 · 수식 기호 --- */
const SUPC = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'k': 'ᵏ', 'm': 'ᵐ', 'o': 'ᵒ', 't': 'ᵗ' };
const SUBC = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'n': 'ₙ', 'i': 'ᵢ', 'x': 'ₓ', 'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'k': 'ₖ', 'm': 'ₘ', 't': 'ₜ' };
function mathText(s) {
  const conv = (t, T) => [...t].map(ch => T[ch] || ch).join('');
  return s.replace(/\^\{([^}]*)\}/g, (_, t) => conv(t, SUPC)).replace(/\^(-?[0-9]+|n)/g, (_, t) => conv(t, SUPC))
    .replace(/_\{([^}]*)\}/g, (_, t) => conv(t, SUBC)).replace(/_([0-9]+)/g, (_, t) => conv(t, SUBC))
    .replace(/\bsqrt\(/g, '√(').replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠').replace(/\+-/g, '±');
}
function hotName(id) { const o = obj(id); if (!o) return '?'; if (o.g === 'val' || o.g === 'fn') return valName(id); if (o.lab) return o.lab; return describe(o); }
function hotValue(id) {
  const o = obj(id); if (!o) return '(삭제됨)';
  const g = G.get(id);
  if (o.g === 'val') { if (o.t === 'meas' && o.d.m === 'coord') return valueSegs(o).map(s => s.t.replace(/^_/, '')).join('').replace(/^[^:]*:\s*/, ''); if (o.t === 'meas' && o.d.m === 'eq') return equationStr(o); return fmtVal(g && g.v, g && g.u, o.dg ?? D.prefs.digits); }
  if (o.g === 'fn') return valueSegs(o).map(s => s.t).join('');
  if (o.g === 'ln' && (o.t === 'seg' || o.t === 'ray' || o.t === 'line') && !o.sl) return nameSegs(id).map(s => s.t).join('');
  return o.lab || describe(o);
}
function renderCaption(t) { return mathText(String(t).replace(/\{#(\d+)\}/g, (_, id) => hotValue(+id))); }
/* drawBox의 글상자 부분을 가변 문자열·수식 기호로 */
const _drawBox = drawBox;
drawBox = function (c, o) {
  if (o.t !== 'text') return _drawBox(c, o);
  const size = o.d.fs || 14, x = o.d.x, y = o.d.y;
  const lines = renderCaption(o.d.text || '').split('\n');
  c.font = (o.d.it ? 'italic ' : '') + (o.d.b ? 'bold ' : '') + size + 'px ' + (o.d.ff || FONT_UI);
  let w = 0; for (const L of lines) w = Math.max(w, c.measureText(L).width);
  const h = lines.length * (size + 5); c.fillStyle = o.s.c; c.textBaseline = 'alphabetic'; lines.forEach((L, i) => c.fillText(L, x + 2, y + size + i * (size + 5)));
  BOX.set(o.id, { x, y, w: w + 4, h: h + 2 });
};
const SYMS = ['π', '°', '√', '∠', '△', '□', '⊥', '∥', '≡', '∽', '≠', '≤', '≥', '±', '×', '÷', '∞', '∴', '∵', '→', 'α', 'β', 'γ', 'θ', 'φ', 'Δ', 'Σ', '∫', '′', '″'];
editText = function (o, pw) {
  const toEdit = t => String(t || '').replace(/\{#(\d+)\}/g, (_, id) => '{' + hotName(+id) + '}');
  const cands = () => ORDER.filter(x => !x.h && (x.g === 'val' || x.g === 'fn' || x.lab) && x.t !== 'cs' && x.t !== 'table');
  const dl = dialog(o ? '글상자 편집' : '새 글상자', `<textarea name="t" rows="5" cols="40">${esc(o ? toEdit(o.d.text) : '')}</textarea>
    <div class="syms">${SYMS.map(s => `<button type="button" data-s="${s}">${s}</button>`).join('')}</div>
    <div class="row"><select name="ref"><option value="">개체·값 넣기 ▾</option>${cands().map(x => `<option value="${x.id}">${esc(hotName(x.id))}</option>`).join('')}</select><label>글자 크기</label><input name="fs" value="${o?.d.fs || 15}" size="3"> px</div>
    <div class="prev"></div>
    <p class="note">가변 문자열: 스케치의 측정값·개체를 클릭하거나 위 목록에서 고르면 {이름}이 들어가고, 값이 바뀌면 글도 따라 바뀝니다.<br>수식: x^2 → x², a_1 → a₁, x^{n+1}, sqrt( → √(, &lt;= → ≤</p>`, f => {
    PICK = null;
    const t = fromEdit(f.t.value); if (!t.trim()) { if (o) { removeObjs([o.id]); commit(); } return; }
    if (o) { o.d.text = t; o.d.fs = +f.fs.value || 15; commit(); } else { const n = addObj('text', 'txt', [], { text: t, x: pw.x, y: pw.y - 8, fs: +f.fs.value || 15 }); finish([n]); }
  }, { modeless: true, onClose: () => { PICK = null; } });
  const nameToId = () => { const m = new Map(); for (const x of D.objs) { const n = hotName(x.id); if (!m.has(n)) m.set(n, x.id); } return m; };
  function fromEdit(t) { const m = nameToId(); return t.replace(/\{([^{}#]+)\}/g, (all, n) => m.has(n) ? '{#' + m.get(n) + '}' : all); }
  const ta = dl.querySelector('textarea'), pv = dl.querySelector('.prev');
  const ins = s => { const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a; ta.value = ta.value.slice(0, a) + s + ta.value.slice(b); ta.focus(); ta.selectionStart = ta.selectionEnd = a + s.length; upd(); };
  const upd = () => { evaluate(); pv.textContent = renderCaption(fromEdit(ta.value)); };
  dl.querySelectorAll('.syms button').forEach(b => b.onclick = () => ins(b.dataset.s));
  dl.querySelector('select[name=ref]').onchange = e => { if (e.target.value) ins('{' + hotName(+e.target.value) + '}'); e.target.value = ''; };
  ta.oninput = upd; upd();
  PICK = { filter: x => x.id !== o?.id && x.t !== 'cs', cb: id => ins('{' + hotName(id) + '}') };
};
/* 글상자가 참조하는 개체가 지워지면 글자로 고정 */
const _removeObjs = removeObjs;
removeObjs = function (ids) {
  const all = descendants(ids);
  for (const o of D.objs) if (o.t === 'text' && !all.has(o.id) && /\{#\d+\}/.test(o.d.text || '')) { evaluate(); o.d.text = o.d.text.replace(/\{#(\d+)\}/g, (m, id) => all.has(+id) ? hotValue(+id) : m); }
  return _removeObjs(ids);
};

/* --- 그림으로 함수 정의 --- */
function defineFnFromDrawing() {
  const src = sel()[0]; const cs = needCS();
  const f = addObj('dfn', 'fn', [cs, src.id], nextBoxPos()); f.lab = nextLabel('fn'); finish([f], `${f.lab}(x)를 그림으로 정의했습니다. 그림이 바뀌면 함수도 바뀝니다.`);
}
function dfnCompute(o, P) {
  const cs = P[0], g = P[1]; if (!cs || !g) return null;
  const lines = g.paths || (g.pts ? [g.pts] : []);
  const segs = []; for (const L of lines) for (let i = 0; i + 1 < L.length; i++) { const a = wToCs(cs, L[i]), b = wToCs(cs, L[i + 1]); segs.push(a.x <= b.x ? [a, b] : [b, a]); }
  const f = x => { for (const [a, b] of segs) if (x >= a.x && x <= b.x) { if (b.x - a.x < 1e-12) return a.y; return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); } return NaN; };
  let lo = Infinity, hi = -Infinity; for (const [a, b] of segs) { lo = Math.min(lo, a.x); hi = Math.max(hi, b.x); }
  return { f, ast: null, dom: [lo, hi], refsG: [] };
}
/* compute 확장 */
const _compute = compute;
compute = function (o, Gf) { if (o.t === 'dfn') { return dfnCompute(o, o.p.map(Gf)); } return _compute(o, Gf); };
const _valueSegs = valueSegs;
valueSegs = function (o) { if (o.t === 'dfn') { const g = G.get(o.id); const so = obj(o.p[1]); return [{ t: o.lab + '(x) = ' + (so && so.lab ? so.lab + '(으)로 ' : '그림으로 ') + '정의한 함수' + (g && isFinite(g.dom[0]) ? `  (${g.dom[0].toFixed(2)} ≤ x ≤ ${g.dom[1].toFixed(2)})` : '') }]; } return _valueSegs(o); };

/* --- 스크립트 보기 --- */
function scriptLines(givens, steps, labOf, nameOfStep) {
  const L = ['조건 개체'];
  givens.forEach((g, i) => L.push(`  ${i + 1}. ${g}`));
  L.push('', '작도 단계');
  steps.forEach((s, i) => L.push(`  ${i + 1}. ${s}`));
  return L;
}
function stepText(t, gtype, parentNames, d) {
  const P = parentNames;
  const T = { on: `${P[0]} 위의 점`, int: `${P[0]}와(과) ${P[1]}의 교점`, mid: `${P[0]}의 중점`, seg: `선분 ${P.join(', ')}`, ray: `반직선 ${P.join(' → ')}`, line: `직선 ${P.join(', ')}`, par: `${P[0]}을 지나고 ${P[1]}에 평행한 직선`, perp: `${P[0]}을 지나고 ${P[1]}에 수직인 직선`, bis: `∠${P.join('')}의 이등분선`, circ: `중심 ${P[0]}, ${P[1]}을 지나는 원`, circr: `중심 ${P[0]}, 반지름 ${P[1]}인 원`, arcon: `${P[0]} 위의 호 ${P[1]}→${P[2]}`, arcc: `중심 ${P[0]}의 호 ${P[1]}→${P[2]}`, arc3: `${P.join(', ')}를 지나는 호`, poly: `다각형 ${P.join('')}의 내부`, cint: `${P[0]}의 내부`, sect: `${P[0]}의 부채꼴 내부`, segm: `${P[0]}의 활꼴 내부`, loc: `${P[0]}에 따른 ${P[1]}의 자취`, meas: `측정값 (${({ len: '길이', dist: '거리', ang: '각', area: '넓이', perim: '둘레', circum: '원둘레', rad: '반지름', ratio: '비율', arcang: '중심각', arclen: '호의 길이', coord: '좌표', xc: 'x좌표', yc: 'y좌표', slope: '기울기', eq: '방정식', cdist: '좌표거리', pval: '위칫값' })[d.m] || d.m}: ${P.join(', ')})`, calc: `계산값 (${P.join(', ')} 이용)`, xf: `${P[0]}을(를) ${({ tr: '평행이동', rot: '회전이동', dil: '닮음변환', ref: '선대칭이동' })[d.tf?.k] || '변환'}${P.length > 1 ? ' (' + P.slice(1).join(', ') + ' 이용)' : ''}` };
  return T[t] || `${typeName({ t, g: gtype, d })} (${P.join(', ')})`;
}
function scriptOfSelection() {
  if (!SEL.length) return alertBox('스크립트를 볼 개체를 선택하세요. 선택한 개체를 만드는 데 필요한 작도 단계가 모두 나옵니다.');
  const anc = ancestors(SEL); const list = ORDER.filter(o => anc.has(o.id) && !['cs', 'axis', 'unit', 'unity'].includes(o.t));
  const givens = list.filter(o => !o.p.length || o.p.every(p => ['cs', 'axis'].includes(obj(p)?.t)));
  const steps = list.filter(o => !givens.includes(o));
  const nmOf = id => { const o = obj(id); return o ? (o.lab || (o.g === 'ln' && o.t === 'seg' ? nameSegs(id).map(s => s.t).join('') : typeName(o) + '#' + o.id)) : '?'; };
  const lines = scriptLines(givens.map(o => `${typeName(o)} ${nmOf(o.id)}`), steps.map(o => `${nmOf(o.id) && o.lab ? o.lab + ' = ' : ''}${stepText(o.t, o.g, o.p.map(nmOf), o.d)}${o.h ? ' (숨김)' : ''}`));
  showScript('스크립트 보기 — 선택한 작도', lines);
}
function scriptOfTool(t) {
  const gl = t.givens.filter(g => !g.auto).map((g, i) => `${gtName(g.g)}${g.lab ? ' ' + g.lab : ''}`);
  const names = [...t.givens.map((g, i) => g.auto === 'cs' ? '좌표계' : g.auto === 'axis' ? g.w + '축' : (g.lab || gtName(g.g) + (i + 1)))];
  const sn = t.steps.map((s, i) => s.lab || (s.g === 'pt' ? 'P' + subNum(i + 1) : '#' + (i + 1)));
  const refName = r => r.g !== undefined ? names[r.g] : sn[r.s];
  const lines = scriptLines(gl, t.steps.map((s, i) => `${sn[i]} = ${stepText(s.t, s.g, s.p.map(refName), s.d)}${s.res ? '' : ' (숨김)'}`));
  showScript('스크립트 보기 — ' + t.name, lines);
}
function showScript(title, lines) { dialog(title, `<pre class="script">${esc(lines.join('\n'))}</pre>`, null, { noCancel: true, modeless: true }); }

/* --- 사용자 도구: 자동 대입 · 도구 파일 --- */
chooseTool = function (i) {
  const t = D.tools[i]; const real = t.givens.filter(g => !g.auto);
  const auto = new Map(); const used = new Set();
  if (t.auto) real.forEach((g, k) => { if (!g.lab) return; const m = D.objs.find(o => o.lab === g.lab && o.g === g.g && !o.h && !used.has(o.id)); if (m) { auto.set(k, m.id); used.add(m.id); } });
  const remain = real.filter((g, k) => !auto.has(k));
  custState = { tool: { ...t, givens: remain }, orig: t, got: [], auto, nreal: real.length };
  setTool('custom');
  if (!remain.length) { evaluate(); const made = instantiateTool(t, mergeGot()); SEL = made; commit(); flash(`${t.name}: 이름이 같은 개체에 자동으로 대입해 적용했습니다.`); custState = null; setTool('arrow'); return; }
  status(`${t.name}: ${auto.size ? `자동 대입 ${auto.size}개 · ` : ''}1번째 대상(${gtName(remain[0].g)})을 클릭하세요.`);
};
function mergeGot() { const cs = custState; if (!cs.auto || !cs.auto.size) return cs.got.slice(); const out = []; let gi = 0; for (let k = 0; k < cs.nreal; k++) out.push(cs.auto.has(k) ? cs.auto.get(k) : cs.got[gi++]); return out; }
function exportTools() { const data = JSON.stringify({ format: 'webgsp-tools', tools: D.tools }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = '사용자도구.wgst'; a.click(); }
function importTools() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.wgst,.json'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); const L = d.tools || []; for (const t of L) D.tools.push(t); saveToolLib(); commit(); flash(`도구 ${L.length}개를 가져왔습니다.`); } catch (e) { alertBox('도구 파일을 읽을 수 없습니다.'); } }; inp.click(); }
const _openCustomMenu = openCustomMenu;
openCustomMenu = function () {
  _openCustomMenu();
  const extra = document.createElement('div');
  renderItems([SEP, { t: '스크립트 보기', sub: () => D.tools.length ? D.tools.map(t => ({ t: t.name, cmd: { en: () => true, run: () => scriptOfTool(t) } })) : [{ t: '(도구 없음)', cmd: { en: () => false } }] },
    { t: '도구 파일로 내보내기...', cmd: { en: () => D.tools.length > 0, run: exportTools } }, { t: '도구 파일 가져오기...', cmd: { en: () => true, run: importTools } }], extra);
  [...extra.children].forEach(ch => ctxEl.appendChild(ch));
};

/* --- 고급 선택사항 · 색 메뉴 편집 --- */
const pal = () => (D.prefs.palette && D.prefs.palette.length === 16) ? D.prefs.palette : PALETTE;
const _prefsDialog = prefsDialog;
prefsDialog = function () {
  const p = D.prefs;
  const dl = dialog('선택사항', `<div class="tabs"><button type="button" data-t="0" class="on">단위·이름</button><button type="button" data-t="1">고급</button><button type="button" data-t="2">색</button></div>
   <div class="tp" data-t="0"><fieldset><legend>단위</legend>
    <div class="row"><label>거리</label><select name="lu"><option value="cm" ${p.lenUnit === 'cm' ? 'selected' : ''}>센티미터</option><option value="inch" ${p.lenUnit === 'inch' ? 'selected' : ''}>인치</option><option value="px" ${p.lenUnit === 'px' ? 'selected' : ''}>픽셀</option></select></div>
    <div class="row"><label>각</label><select name="au"><option value="deg" ${p.angUnit === 'deg' ? 'selected' : ''}>도</option><option value="rad" ${p.angUnit === 'rad' ? 'selected' : ''}>라디안</option></select></div>
    <div class="row"><label>정밀도</label><select name="dg">${['단위', '십분의 일', '백분의 일', '천분의 일', '만분의 일', '십만분의 일'].map((t, i) => `<option value="${i}" ${p.digits === i ? 'selected' : ''}>${t}</option>`).join('')}</select></div></fieldset>
    <fieldset><legend>이름 자동으로 보이기</legend><label class="chk"><input type="checkbox" name="alp" ${p.autoLabelPts ? 'checked' : ''}> 점</label><label class="chk"><input type="checkbox" name="alo" ${p.autoLabelOther ? 'checked' : ''}> 선·원·호</label></fieldset></div>
   <div class="tp" data-t="1" hidden><fieldset><legend>자취·그래프 표본 수</legend>
    <div class="row"><label>새 자취</label><input name="ln" value="${p.locN || 200}" size="5"> 개</div><div class="row"><label>함수 그래프</label><input name="pn" value="${p.plotN || 600}" size="5"> 개</div></fieldset>
    <fieldset><legend>내보내기</legend><div class="row"><label>PNG 배율</label><select name="sc">${[1, 2, 3, 4].map(k => `<option value="${k}" ${(p.pngScale || 2) === k ? 'selected' : ''}>${k}배</option>`).join('')}</select></div><label class="chk"><input type="checkbox" name="tb" ${p.pngTransparent ? 'checked' : ''}> 배경 투명</label></fieldset>
    <fieldset><legend>시스템</legend><label class="chk"><input type="checkbox" name="dbl" ${p.dblDeselect ? 'checked' : ''}> 빈 곳을 두 번 클릭해야 선택 해제</label></fieldset></div>
   <div class="tp" data-t="2" hidden><p class="note">색 메뉴에 나오는 16가지 색을 바꿀 수 있습니다.</p><div class="pal-ed">${pal().map((c, i) => `<input type="color" name="c${i}" value="${c}">`).join('')}</div><button type="button" class="rst">기본 색으로</button></div>`, f => {
    p.lenUnit = f.lu.value; p.angUnit = f.au.value; p.digits = +f.dg.value; p.autoLabelPts = f.alp.checked; p.autoLabelOther = f.alo.checked;
    p.locN = clamp(+f.ln.value | 0, 20, 3000); p.plotN = clamp(+f.pn.value | 0, 50, 5000); p.pngScale = +f.sc.value; p.pngTransparent = f.tb.checked; p.dblDeselect = f.dbl.checked;
    p.palette = Array.from({ length: 16 }, (_, i) => f['c' + i].value); if (p.palette.join() === PALETTE.join()) delete p.palette;
    commit();
  });
  dl.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { dl.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); dl.querySelectorAll('.tp').forEach(t => t.hidden = t.dataset.t !== b.dataset.t); });
  dl.querySelector('.rst').onclick = () => PALETTE.forEach((c, i) => dl.querySelector(`[name=c${i}]`).value = c);
};
/* 색 메뉴가 편집한 팔레트를 쓰도록 */
const _renderItems = renderItems;
renderItems = function (items, el) {
  if (items !== 'color') return _renderItems(items, el);
  el.innerHTML = ''; el.classList.add('pal');
  for (const c of pal()) { const s = document.createElement('button'); s.className = 'sw'; s.style.background = c; s.title = c; s.disabled = !SEL.length; s.onclick = () => { setStyle(o => o.s.c = c); closeMenus(); }; el.appendChild(s); }
  const m = document.createElement('button'); m.className = 'mi wide'; m.textContent = '기타 색...'; m.disabled = !SEL.length; m.onclick = () => { closeMenus(); propsDialog(sel()); }; el.appendChild(m);
};
/* 두 번 클릭해야 선택 해제 */
const _downArrow = downArrow;
let lastEmpty = 0;
downArrow = function (pw, e, ps, now) {
  if (D.prefs.dblDeselect && !hit(pw) && !hitLabel(pw) && !e.shiftKey) { const dbl = now - lastEmpty < 400; lastEmpty = now; if (!dbl) { drag = { k: 'marq', s: pw, base: SEL.slice() }; MARQ = { x0: pw.x - D.view.x, y0: pw.y - D.view.y, x1: pw.x - D.view.x, y1: pw.y - D.view.y }; return; } }
  return _downArrow(pw, e, ps, now);
};
/* PNG 내보내기: 배율·투명 */
exportPNG = function () {
  const k = D.prefs.pngScale || 2, keep = DPR; SEL = []; DPR = k; cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  draw();
  let url;
  if (D.prefs.pngTransparent) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const x = c2.getContext('2d'); x.drawImage(cv, 0, 0); const im = x.getImageData(0, 0, c2.width, c2.height); for (let i = 0; i < im.data.length; i += 4) if (im.data[i] > 250 && im.data[i + 1] > 250 && im.data[i + 2] > 250) im.data[i + 3] = 0; x.putImageData(im, 0, 0); url = c2.toDataURL('image/png'); }
  else url = cv.toDataURL('image/png');
  DPR = keep; resize();
  const a = document.createElement('a'); a.href = url; a.download = BOOK.name + '-' + pageTitle() + '.png'; a.click();
};
/* --- 인쇄 설정 · 끝내기 --- */
function pageSetup() {
  const ps = BOOK.print || { orient: 'landscape', title: true, all: false };
  dialog('인쇄 설정', `<fieldset><legend>용지 방향</legend><label class="radio"><input type="radio" name="o" value="landscape" ${ps.orient === 'landscape' ? 'checked' : ''}> 가로</label><label class="radio"><input type="radio" name="o" value="portrait" ${ps.orient === 'portrait' ? 'checked' : ''}> 세로</label></fieldset>
   <label class="chk"><input type="checkbox" name="t" ${ps.title ? 'checked' : ''}> 문서·페이지 이름 인쇄</label><label class="chk"><input type="checkbox" name="all" ${ps.all ? 'checked' : ''}> 모든 페이지 인쇄</label>`, f => {
    BOOK.print = { orient: f.querySelector('input[name=o]:checked').value, title: f.t.checked, all: f.all.checked }; autosave();
  });
}
function doPrint() {
  const ps = BOOK.print || { orient: 'landscape', title: true, all: false };
  const pages = ps.all ? BOOK.pages.map((_, i) => i) : [BOOK.cur]; const cur = BOOK.cur; const imgs = [];
  stashPage();
  for (const i of pages) { if (i !== BOOK.cur) enterPage(i); SEL = []; draw(); imgs.push({ t: BOOK.pages[i].title, src: cv.toDataURL('image/png') }); }
  if (BOOK.cur !== cur) enterPage(cur);
  const box = document.createElement('div'); box.id = 'printbox';
  box.innerHTML = `<style>@page { size: A4 ${ps.orient}; margin: 12mm; } @media print { body > #app { display: none !important; } #printbox { display: block !important; } } #printbox { display: none; } #printbox section { page-break-after: always; } #printbox img { max-width: 100%; max-height: ${ps.orient === 'landscape' ? 165 : 250}mm; display: block; margin: 0 auto; } #printbox h3 { font: 13px "Malgun Gothic",sans-serif; margin: 0 0 6px; }</style>` +
    imgs.map(x => `<section>${ps.title ? `<h3>${esc(BOOK.name)} — ${esc(x.t)}</h3>` : ''}<img src="${x.src}"></section>`).join('');
  document.body.appendChild(box); setTimeout(() => { window.print(); setTimeout(() => box.remove(), 500); }, 100);
}
function quitApp() { autosave(); window.close(); setTimeout(() => flash('브라우저가 창 닫기를 막았습니다. 작업 내용은 자동 저장되었으니 탭을 닫으셔도 됩니다.'), 200); }

/* --- 메뉴 연결 --- */
(function patchMenus2() {
  const M = t => MENUS.find(m => m.t === t).items;
  const insAfter = (items, label, ...add) => { const i = items.findIndex(x => x !== SEP && lbl(x.t) === label); items.splice(i + 1, 0, ...add); };
  const F = M('파일');
  const pi = F.findIndex(x => x !== SEP && x.t === '인쇄...'); F[pi] = { t: '인쇄...', cmd: { en: () => true, run: doPrint } };
  const pp = F.findIndex(x => x !== SEP && x.t === '인쇄 미리보기'); F[pp] = { t: '인쇄 미리보기', cmd: { en: () => true, run: doPrint } };
  F.splice(pi, 0, { t: '인쇄 설정...', cmd: { en: () => true, run: pageSetup } });
  F.push(SEP, { t: '끝내기', cmd: { en: () => true, run: quitApp } });
  const Gm = M('그래프');
  const di = Gm.findIndex(x => x !== SEP && x.t === '좌표계 정의'); Gm[di] = { t: '좌표계 정의', cmd: GR_.defineCS };
  Gm.splice(di + 1, 0, { t: '좌표계 지정', cmd: { en: () => only(cnt(), { ln: 1 }) && sel()[0].t === 'axis' || (SEL.length === 1 && sel()[0].t === 'cs'), run: markCS } });
  const N = M('수');
  N.push({ t: '그림으로 함수 정의', cmd: { en: () => SEL.length === 1 && ['loc', 'plot', 'draw'].includes(sel()[0].g) && sel()[0].t !== 'dfn', run: defineFnFromDrawing } });
  const Dm = M('보기');
  insAfter(Dm, '이름 바꾸기...', { t: '스크립트 보기', cmd: { en: () => true, run: scriptOfSelection } });
})();

/* 이전에 붙잡아 둔 함수 참조 갱신 */
E_.prefs.run = prefsDialog;
(function () { const F = MENUS.find(m => m.t === '파일').items; const it = F.find(x => x !== SEP && x.t === '그림으로 내보내기 (PNG)'); if (it) it.cmd.run = exportPNG; })();
