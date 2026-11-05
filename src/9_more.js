/* ===================== 9. 매뉴얼 보완 기능 ===================== */
/* --- 가변색 --- */
function paramColor(pc) {
  const g = G.get(pc.id); if (!g || !isFinite(g.v)) return null;
  let t = (g.v - pc.min) / ((pc.max - pc.min) || 1);
  if (pc.cyc) t = ((t % 1) + 1) % 1; else t = clamp(t, 0, 1);
  if (pc.mode === 'gray') { const v = Math.round(255 * (1 - t) * .85); return '#' + [v, v, v].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const h = t * 300, sat = .85, l = .45; // 빨강 → 보라
  const f = n => { const k = (n + h / 30) % 12, a = sat * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
function paramColorDialog() {
  const v = sel().find(o => o.g === 'val'), targets = sel().filter(o => o !== v);
  const r = v.t === 'param' && v.d.range ? v.d.range : [0, 1];
  dialog('가변색', `<p class="note">${esc(valName(v.id))} 값에 따라 ${targets.length}개 개체의 색이 바뀝니다.</p>
    <div class="row"><label>범위</label><input name="a" value="${r[0]}" size="6"> ~ <input name="b" value="${r[1]}" size="6"></div>
    <fieldset><legend>색의 변화</legend><label class="radio"><input type="radio" name="m" value="hue" checked> 무지개색</label><label class="radio"><input type="radio" name="m" value="gray"> 회색조</label></fieldset>
    <label class="chk"><input type="checkbox" name="cyc" checked> 범위를 벗어나면 반복</label>`, f => {
    const pc = { id: v.id, min: evalNum(f.a.value), max: evalNum(f.b.value), mode: f.querySelector('input[name=m]:checked').value, cyc: f.cyc.checked };
    for (const o of targets) o.s.pc = { ...pc }; commit();
  });
}
/* --- 사진 --- */
const IMGS = new Map();
function imgSrc(o) { let q = o; for (let k = 0; q && q.t === 'xf' && k < 50; k++) q = obj(q.p[0]); return q && q.d.src; }
function getImg(src) { if (!src) return null; let im = IMGS.get(src); if (!im) { im = new Image(); im.onload = () => redraw(); im.src = src; IMGS.set(src, im); } return im.complete && im.naturalWidth ? im : null; }
function drawImg(c, o, g) {
  const im = getImg(imgSrc(o)); c.save();
  if (g.clip && g.clip.length > 2) { c.beginPath(); g.clip.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.clip(); }
  c.transform(g.ux.x, g.ux.y, g.uy.x, g.uy.y, g.o.x, g.o.y);
  if (im) c.drawImage(im, 0, 0, 1, 1); else { c.fillStyle = '#eee'; c.fillRect(0, 0, 1, 1); }
  c.restore();
}
function inImg(g, p) { const d = V.sub(p, g.o), det = V.cross(g.ux, g.uy); if (Math.abs(det) < 1e-9) return false; const a = V.cross(d, g.uy) / det, b = V.cross(g.ux, d) / det; if (!(a >= 0 && a <= 1 && b >= 0 && b <= 1)) return false; return !g.clip || pointInPoly(g.clip, p); }
function addPicture(src, at) {
  const im = new Image(); im.onload = () => {
    let w = im.naturalWidth, h = im.naturalHeight; const k = Math.min(1, 400 / Math.max(w, h)); w *= k; h *= k;
    const pts = sel().filter(o => o.g === 'pt').slice(0, 2); const vw = viewRect();
    const pos = at || { x: (vw.x0 + vw.x1) / 2 - w / 2, y: (vw.y0 + vw.y1) / 2 - h / 2 };
    const o = addObj('img', 'img', pts.map(p => p.id), { src, x: pos.x, y: pos.y, w, h, anchors: pts.length });
    IMGS.set(src, im); finish([o], pts.length ? `사진을 점 ${pts.map(p => p.lab).join(', ')}에 붙였습니다.` : '사진을 넣었습니다. 점을 1개(이동) 또는 2개(이동·회전·확대) 선택한 뒤 넣으면 사진이 점을 따라갑니다.');
  }; im.src = src;
}
function importPicture() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => addPicture(r.result); r.readAsDataURL(f); }; inp.click();
}
wrap.addEventListener('dragover', e => { e.preventDefault(); });
wrap.addEventListener('drop', e => {
  e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f) return;
  const at = toW(evPos(e));
  if (/^image\//.test(f.type)) { const r = new FileReader(); r.onload = () => addPicture(r.result, at); r.readAsDataURL(f); }
  else if (/\.(wgsp|json)$/i.test(f.name)) { f.text().then(t => { try { loadBook(JSON.parse(t), f.name.replace(/\.(wgsp|json)$/i, '')); autosave(); } catch (err) { alertBox('이 파일을 열 수 없습니다.'); } }); }
});
document.addEventListener('paste', e => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (!it) return;
  e.preventDefault(); const r = new FileReader(); r.onload = () => addPicture(r.result); r.readAsDataURL(it.getAsFile());
});
function cropPicture() { const im = sel().find(o => o.g === 'img'), pg = sel().find(o => o.g === 'poly'); im.p = [...im.p.slice(0, im.d.anchors || 0), pg.id]; im.d.clip = im.p.length - 1; structDirty = true; finish([im], '사진을 다각형 모양으로 잘랐습니다.'); }
function uncropPicture() { const im = sel().find(o => o.g === 'img'); im.p = im.p.slice(0, im.d.anchors || 0); delete im.d.clip; structDirty = true; commit(); }

/* --- 동작 버튼 (동시/연결 실행·소리·바로가기·화면이동) --- */
let actx = null;
function playTone(freq, dur = .6) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = clamp(freq, 30, 5000); g.gain.setValueAtTime(.18, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + dur); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur); } catch (e) { } }
function playFunc(f, dur = 1.5) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const sr = actx.sampleRate, n = Math.floor(sr * dur), buf = actx.createBuffer(1, n, sr), d = buf.getChannelData(0); let mx = 1e-9; for (let i = 0; i < n; i++) { const v = f(i / sr * 440 * TAU / TAU); d[i] = isFinite(v) ? v : 0; mx = Math.max(mx, Math.abs(d[i])); } for (let i = 0; i < n; i++) d[i] = d[i] / mx * .25; const s = actx.createBufferSource(); s.buffer = buf; s.connect(actx.destination); s.start(); } catch (e) { } }
function runButtonExtra(o) {
  const k = o.d.kind;
  if (k === 'present') {
    const btns = o.p.map(obj).filter(Boolean);
    if (o.d.mode === 'sim') btns.forEach(runButton);
    else { let t = 0; btns.forEach(b => { setTimeout(() => runButton(b), t); t += b.d.kind === 'move' ? [1500, 800, 300, 1][b.d.speed ?? 1] + 200 : (o.d.pause || 1) * 1000; }); }
  } else if (k === 'sound') {
    const g = G.get(o.p[0]); if (!g) return; if (g.f) playFunc(g.f); else playTone(g.v);
  } else if (k === 'link') {
    if (o.d.url) window.open(o.d.url, '_blank'); else if (o.d.page != null) { const i = BOOK.pages.findIndex(p => p.title === o.d.page); if (i >= 0) switchPage(i); else flash('연결된 페이지를 찾을 수 없습니다.'); }
  } else if (k === 'scroll') {
    const g = G.get(o.p[0]); if (!g) return; const to = { x: g.x - W / 2, y: g.y - H / 2 }, from = { ...D.view }, t0 = performance.now();
    const step = t => { const k = clamp((t - t0) / 600, 0, 1); D.view.x = from.x + (to.x - from.x) * k; D.view.y = from.y + (to.y - from.y) * k; eraseTraces(); redraw(); if (k < 1) requestAnimationFrame(step); else autosave(); }; requestAnimationFrame(step);
  }
}
function btnPresentDialog() {
  const ids = SEL.slice();
  dialog('동시/연결 실행 버튼', `<p class="note">선택한 버튼 ${ids.length}개를 한꺼번에 실행하는 버튼을 만듭니다.</p><fieldset><legend>실행 방식</legend><label class="radio"><input type="radio" name="m" value="sim" checked> 동시에</label><label class="radio"><input type="radio" name="m" value="seq"> 차례대로</label><div class="row"><label>단계 사이</label><input name="ps" value="1" size="4"> 초</div></fieldset>`, f => {
    const mode = f.querySelector('input[name=m]:checked').value; finish([addObj('btn', 'txt', ids, { kind: 'present', mode, pause: +f.ps.value || 1, label: mode === 'sim' ? '동시 실행' : '연결 실행', ...nextBoxPos() })]);
  });
}
function btnLinkDialog() {
  dialog('바로가기 버튼', `<fieldset><legend>대상</legend><label class="radio"><input type="radio" name="m" value="page" checked> 이 문서의 페이지 <select name="pg">${BOOK.pages.map(p => `<option>${esc(p.title)}</option>`).join('')}</select></label>
    <label class="radio"><input type="radio" name="m" value="url"> 웹 주소 <input name="url" value="https://" size="26"></label></fieldset>`, f => {
    const m = f.querySelector('input[name=m]:checked').value;
    const d = m === 'page' ? { page: f.pg.value, label: '바로가기: ' + f.pg.value } : { url: f.url.value, label: '바로가기: ' + f.url.value.replace(/^https?:\/\//, '') };
    finish([addObj('btn', 'txt', [], { kind: 'link', ...d, ...nextBoxPos() })]);
  });
}
/* --- 애니메이션 제어판 --- */
let mcEl = null;
function toggleMotion() {
  if (mcEl) { mcEl.remove(); mcEl = null; return; }
  mcEl = document.createElement('div'); mcEl.className = 'motion';
  mcEl.innerHTML = `<div class="mt">애니메이션 제어판<button class="x" title="닫기">✕</button></div>
    <div class="mrow"><button data-a="back" title="뒤로">◀</button><button data-a="pause" title="잠시 멈춤">❚❚</button><button data-a="stop" title="정지">■</button><button data-a="fwd" title="앞으로">▶</button></div>
    <div class="mrow"><label>속도</label><input type="range" min="-3" max="3" step="0.1" value="${Math.log2(animSpeed)}"><span class="sv">×${animSpeed.toFixed(2)}</span></div>
    <div class="mrow tgt"></div>`;
  host.appendChild(mcEl);
  const tgt = () => { const ids = SEL.filter(id => ANIM.has(id)); return ids.length ? ids : [...ANIM.keys()]; };
  mcEl.querySelector('.x').onclick = toggleMotion;
  mcEl.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'stop') { stopAll(); paused = null; }
    else if (a === 'pause') { if (paused) { for (const [id, st] of paused) ANIM.set(id, st); paused = null; kick(); } else { paused = new Map(ANIM); ANIM.clear(); } }
    else { let ids = tgt(); if (!ids.length) { ids = SEL.slice(); ids.forEach(startAnim); } for (const id of ids) { const st = ANIM.get(id); if (st) st.dir = a === 'fwd' ? 1 : -1; } kick(); }
    syncMotion();
  });
  const rg = mcEl.querySelector('input[type=range]'); rg.oninput = () => { animSpeed = Math.pow(2, +rg.value); syncMotion(); };
  const t = mcEl.querySelector('.mt'); t.onpointerdown = e => { if (e.target.closest('button')) return; const r = mcEl.getBoundingClientRect(), hr = host.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; const mv = ev => { mcEl.style.left = (ev.clientX - hr.left - sx) + 'px'; mcEl.style.top = (ev.clientY - hr.top - sy) + 'px'; mcEl.style.right = 'auto'; }; const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  syncMotion();
}
let paused = null;
function syncMotion() { if (!mcEl) return; mcEl.querySelector('.sv').textContent = '×' + animSpeed.toFixed(2); const n = ANIM.size; mcEl.querySelector('.tgt').textContent = paused ? '잠시 멈춤' : n ? `움직이는 개체 ${n}개: ` + [...ANIM.keys()].map(id => obj(id)?.lab || typeName(obj(id) || {})).join(', ') : '애니메이션 없음 — 개체를 선택하고 ▶'; }
setInterval(syncMotion, 500);

/* --- 표 --- */
function removeTableRow(all) { const t = sel()[0]; if (!t.d.rows || !t.d.rows.length) return; if (all) t.d.rows = []; else t.d.rows.pop(); commit(); }
function plotTableDialog() {
  const t = sel()[0]; const cols = t.p.map(id => valName(id));
  dialog('표의 자료로 점 찍기', `<div class="row"><label>x 값</label><select name="cx">${cols.map((c, i) => `<option value="${i}">${esc(c)}</option>`).join('')}</select></div><div class="row"><label>y 값</label><select name="cy">${cols.map((c, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div><p class="note">표에 기록된 행마다 점이 찍힙니다. 행을 추가하면 점도 늘어납니다.</p>`, f => {
    const cs = needCS(); const o = addObj('tplot', 'tpts', [cs, t.id], { cx: +f.cx.value, cy: +f.cy.value }); o.s.c = '#e0201b'; finish([o]);
  });
}
/* --- 매개변수 함수의 그래프 --- */
function plotParamCurve() {
  const fs = selOf('fn'); const cs = needCS();
  dialog('매개변수 함수의 그래프', `<p class="note">x = ${esc(fs[0].lab)}(t), y = ${esc(fs[1].lab)}(t)</p><div class="row"><label>t 범위</label><input name="a" value="0" size="6"> ~ <input name="b" value="2π" size="6"></div>`, f => {
    const o = addObj('pplot', 'loc', [cs, fs[0].id, fs[1].id], { t0: evalNum(f.a.value), t1: evalNum(f.b.value), n: 400 }); o.s.c = '#b5302a'; finish([o]);
  });
}
/* --- 사용자 정의 변환 --- */
function defineCustomXf() {
  const [a, b] = SEL; if (!descendants([a]).has(b)) return alertBox('두 번째 점(상)이 첫 번째 점(원상)에 의존해야 합니다.');
  const keep = SEL.slice(); SEL = [a, b];
  const S = new Set(SEL); const need = ancestors([b]); const dg = descendants([a]);
  const steps0 = new Set([...need].filter(id => dg.has(id) && id !== a));
  const extra = []; for (const id of steps0) for (const p of obj(id).p) if (!steps0.has(p) && p !== a && !extra.includes(p)) extra.push(p);
  const all = [a, ...extra]; const idx = new Map(); all.forEach((id, i) => idx.set(id, { g: i }));
  const steps = []; for (const o of ORDER) if (steps0.has(o.id)) { idx.set(o.id, { s: steps.length }); steps.push({ t: o.t, g: o.g, d: JSON.parse(JSON.stringify(o.d)), s: { ...o.s }, p: o.p.map(p => idx.get(p)), res: o.id === b, sl: o.sl }); }
  SEL = keep;
  dialog('사용자 정의 변환 만들기', `<div class="row"><label>변환 이름</label><input name="nm" value="변환 ${(D.xforms || []).length + 1}" size="16"></div><p class="note">${esc(nm(a))} → ${esc(nm(b))} 작도를 변환으로 저장합니다. 이제 변환 메뉴 아래쪽에서 골라 다른 개체에 적용할 수 있습니다.</p>`, f => {
    D.xforms = D.xforms || []; D.xforms.push({ name: f.nm.value.trim() || '변환', extra, steps }); commit();
  });
}
function applyCustomXf(i) {
  const X = D.xforms[i]; const map = new Map(); const made = [];
  const mapPt = id => { if (map.has(id)) return map.get(id); const ids = [id, ...X.extra]; const sids = []; let res = null; for (const st of X.steps) { const p = st.p.map(r => r.g !== undefined ? ids[r.g] : sids[r.s]); const o = addObj(st.t, st.g, p, JSON.parse(JSON.stringify(st.d))); o.s = { ...st.s }; o.h = !st.res; if (!st.res) o.sl = false; sids.push(o.id); if (st.res) res = o; } const src = obj(id); if (res) { res.s = { ...src.s }; if (src.lab) { res.lab = src.lab + '′'; res.sl = src.sl; } } map.set(id, res ? res.id : null); return res ? res.id : null; };
  for (const o of sel()) {
    if (o.g === 'pt') { const r = mapPt(o.id); if (r) made.push(r); continue; }
    if (['seg', 'ray', 'line', 'circ', 'poly', 'arc3'].includes(o.t)) { const P = o.p.map(mapPt); if (P.some(x => !x)) continue; const n = addObj(o.t, o.g, P, JSON.parse(JSON.stringify(o.d))); n.s = { ...o.s }; made.push(n.id); continue; }
  }
  if (!made.length) flash('이 변환은 점과, 점으로 정의된 선분·반직선·직선·원·다각형·호에 적용됩니다.');
  finish(made);
}
function customXfSub() {
  const L = (D.xforms || []).map((x, i) => ({ t: x.name, cmd: { en: () => SEL.length > 0 && sel().some(o => o.g === 'pt' || ['seg', 'ray', 'line', 'circ', 'poly', 'arc3'].includes(o.t)), run: () => applyCustomXf(i) } }));
  return [{ t: '사용자 정의 변환 만들기...', cmd: { en: () => only(cnt(), { pt: 2 }), run: defineCustomXf } }, ...(L.length ? [SEP, ...L, SEP, { t: '변환 이름 바꾸기·지우기...', cmd: { en: () => true, run: editCustomXf } }] : [])];
}
function editCustomXf() {
  const L = D.xforms || [];
  dialog('사용자 정의 변환 편집', L.map((x, i) => `<div class="row"><input name="n${i}" value="${esc(x.name)}" size="18"> <label class="chk"><input type="checkbox" name="d${i}"> 지우기</label></div>`).join(''), f => {
    D.xforms = L.filter((x, i) => { x.name = f['n' + i].value.trim() || x.name; return !f['d' + i].checked; }); commit();
  });
}
/* --- 앞/뒤, 세밀도, Tab 선택 --- */
function toFront(front) { const zs = D.objs.map(o => o.z || 0); const z = front ? Math.max(...zs) + 1 : Math.min(...zs) - 1; for (const o of sel()) o.z = z; commit(); }
function changeRes(up) { let did = false; for (const o of sel()) { if (o.t === 'loc' || o.t === 'pplot') { o.d.n = clamp(Math.round((o.d.n || 150) * (up ? 1.5 : 1 / 1.5)), 10, 3000); did = true; } } if (did) { commit(); flash('표본 수: ' + sel().filter(o => o.d.n).map(o => o.d.n).join(', ')); } return did; }
function tabSelect(shift) {
  evaluate(); const vis = ORDER.filter(o => !o.h && o.t !== 'cs' && G.get(o.id) && !SEL.includes(o.id));
  const last = SEL.length ? obj(SEL[SEL.length - 1]) : null;
  let pool = vis; if (shift && last) pool = vis.filter(o => o.g === last.g);
  if (!pool.length) return;
  const anchor = last ? (last.g === 'pt' ? G.get(last.id) : BOX.get(last.id) || labelAnchor(last, G.get(last.id))) : { x: D.view.x, y: D.view.y };
  const pos = o => { const g = G.get(o.id); if (o.g === 'pt') return g; const b = BOX.get(o.id); if (b) return b; return labelAnchor(o, g) || { x: 1e9, y: 1e9 }; };
  let best = pool[0], bd = 1e18; for (const o of pool) { const p = pos(o); const d = anchor ? Math.hypot(p.x - anchor.x, p.y - anchor.y) : 0; if (d < bd) { bd = d; best = o; } }
  if (!last) SEL = [best.id]; else SEL.push(best.id); redraw(); updateUI();
}
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select,.dlg')) return;
  if (e.key === 'Tab') { e.preventDefault(); tabSelect(e.shiftKey); }
  if ((e.key === '+' || e.key === '=' || e.key === '-') && !e.ctrlKey && SEL.length) { if (changeRes(e.key !== '-')) e.preventDefault(); }
});
/* --- 글자 모양 --- */
function setTextStyle(fn) { for (const o of sel()) if (isBoxObj(o)) fn(o.d); commit(); }

/* --- 메뉴에 덧붙이기 --- */
(function patchMenus() {
  const M = t => MENUS.find(m => m.t === t).items;
  const insAfter = (items, label, ...add) => { const i = items.findIndex(x => x !== SEP && lbl(x.t) === label); items.splice(i + 1, 0, ...add); };
  const F = M('파일');
  insAfter(F, '다른 이름으로 저장...', { t: '닫기', cmd: { en: () => true, run: newSketch } });
  insAfter(F, '그림으로 내보내기 (SVG)', { t: '사진 가져오기...', cmd: { en: () => true, run: importPicture } });
  insAfter(F, '인쇄...', { t: '인쇄 미리보기', cmd: { en: () => true, run: () => window.print() } });
  const E = M('편집');
  const btn = E.find(x => x !== SEP && x.t === '동작 버튼');
  btn.sub.push({ t: '동시/연결 실행...', cmd: { en: () => SEL.length > 0 && sel().every(o => o.t === 'btn'), run: btnPresentDialog } },
    { t: '소리', cmd: { en: () => only(cnt(), { val: 1 }) || only(cnt(), { fn: 1 }), run: () => finish([addObj('btn', 'txt', [SEL[0]], { kind: 'sound', label: '소리 ' + (obj(SEL[0]).lab || valName(SEL[0])), ...nextBoxPos() })]) } },
    { t: '바로가기...', cmd: { en: () => true, run: btnLinkDialog } },
    { t: '화면이동', cmd: { en: () => only(cnt(), { pt: 1 }), run: () => finish([addObj('btn', 'txt', [SEL[0]], { kind: 'scroll', label: '화면이동 ' + nm(SEL[0]), ...nextBoxPos() })]) } });
  insAfter(E, '하위 개체 선택', SEP, { t: '다각형에 맞게 사진 자르기', cmd: { en: () => only(cnt(), { img: 1, poly: 1 }), run: cropPicture } }, { t: '사진 자르기 취소', cmd: { en: () => only(cnt(), { img: 1 }) && sel()[0].d.clip != null, run: uncropPicture } });
  const Dm = M('보기');
  const col = Dm.find(x => x !== SEP && x.t === '색'); const ci = Dm.indexOf(col);
  Dm.splice(ci + 1, 0, { t: '가변색...', cmd: { en: () => { const c = cnt(); return c.val >= 1 && c.n >= 2 && sel().filter(o => o.g === 'val').length === 1; }, run: paramColorDialog } },
    { t: '가변색 해제', cmd: { en: () => sel().some(o => o.s.pc), run: () => setStyle(o => delete o.s.pc) } },
    { t: '문자열', sub: [{ t: '굵게', cmd: { en: () => sel().some(isBoxObj), check: () => sel().some(o => o.d.b), run: () => setTextStyle(d => d.b = !d.b) } }, { t: '기울임', cmd: { en: () => sel().some(isBoxObj), check: () => sel().some(o => o.d.it), run: () => setTextStyle(d => d.it = !d.it) } }, SEP,
      ...[12, 14, 18, 24, 32].map(n => ({ t: n + 'px', cmd: { en: () => sel().some(isBoxObj), check: () => sel().some(o => (o.d.fs || 14) === n), run: () => setTextStyle(d => d.fs = n) } })), SEP,
      { t: '바탕체', cmd: { en: () => sel().some(isBoxObj), run: () => setTextStyle(d => d.ff = '"Batang","바탕",serif') } }, { t: '돋움체', cmd: { en: () => sel().some(isBoxObj), run: () => setTextStyle(d => delete d.ff) } }] });
  insAfter(Dm, '애니메이션 정지', { t: '애니메이션 제어판 보이기', cmd: { en: () => true, check: () => !!mcEl, run: toggleMotion } });
  const T = M('변환'); T.push(SEP, { t: '사용자 정의 변환', sub: customXfSub });
  const N = M('수');
  insAfter(N, '표에 자료 추가', { t: '표에서 마지막 자료 삭제', cmd: { en: () => only(cnt(), { val: 1 }) && sel()[0].t === 'table' && (sel()[0].d.rows || []).length > 0, run: () => removeTableRow(false) } }, { t: '표의 자료 모두 삭제', cmd: { en: () => only(cnt(), { val: 1 }) && sel()[0].t === 'table' && (sel()[0].d.rows || []).length > 0, run: () => removeTableRow(true) } });
  const Gm = M('그래프');
  const gi = Gm.findIndex(x => x !== SEP && x.t === '격자 숨기기');
  Gm.splice(gi, 0, { t: '격자 형태', sub: [['square', '정사각형 격자'], ['rect', '직사각형 격자'], ['polar', '극좌표 격자']].map(([f, t]) => ({ t, cmd: { en: () => true, check: () => (CS()?.d.form || 'square') === f, run: () => setGridForm(f) } })) });
  insAfter(Gm, '좌표로 점 찍기...', { t: '위칫값으로 x축 위에 점 찍기', cmd: { en: () => SEL.length > 0 && sel().every(o => o.g === 'val' && o.t !== 'table'), run: () => { const cs = needCS(); finish(sel().map(o => addObj('xval', 'pt', [cs, o.id]))); } } },
    { t: '표의 자료로 점 찍기...', cmd: { en: () => only(cnt(), { val: 1 }) && sel()[0].t === 'table' && sel()[0].p.length >= 2, run: plotTableDialog } });
  insAfter(Gm, '함수의 그래프 그리기...', { t: '매개변수 함수의 그래프...', cmd: { en: () => only(cnt(), { fn: 2 }), run: plotParamCurve } });
})();
function setGridForm(f) {
  const c = CS() ? CS() : (needCS(), CS()); c.d.form = f;
  const iuy = c.d.iuy ?? (c.p[2] && obj(c.p[2])?.t === 'unity' ? 2 : null);
  if (f === 'rect' && iuy == null) { const uy = addObj('unity', 'pt', [c.p[0]], { d: G.get(c.id)?.u || 37.795 }); uy.lab = ''; uy.sl = false; D.lc.pt = Math.max(0, D.lc.pt - 1); c.p.push(uy.id); c.d.iuy = c.p.length - 1; structDirty = true; }
  if (f !== 'rect' && iuy != null) { const id = c.p[iuy]; c.p.splice(iuy, 1); if (c.d.ilen != null && c.d.ilen > iuy) c.d.ilen--; delete c.d.iuy; D.objs = D.objs.filter(o => o.id !== id); structDirty = true; }
  SEL = []; commit();
}
/* 오른쪽 클릭 메뉴에 앞/뒤 */
const _onContext = onContext;
onContext = function (e, pw) { _onContext(e, pw); if (!SEL.length) return; const extra = document.createElement('div'); renderItems([SEP, { t: '맨 앞으로', cmd: { en: () => true, run: () => toFront(true) } }, { t: '맨 뒤로', cmd: { en: () => true, run: () => toFront(false) } }, ...(sel().some(o => o.t === 'loc' || o.t === 'pplot') ? [{ t: '더 세밀하게', cmd: { en: () => true, run: () => changeRes(true) } }, { t: '덜 세밀하게', cmd: { en: () => true, run: () => changeRes(false) } }] : [])], extra); [...extra.children].forEach(ch => ctxEl.appendChild(ch)); };
/* 수치 반복의 표 */
function drawIterTable(c, o, g) {
  const x = o.d.x, y = o.d.y; const n = o.d.n; const pre = o.p.slice(0, n);
  const head = ['n', ...pre.map(valName)]; const rows = (g && g.rows) || [];
  const dg = o.dg ?? D.prefs.digits;
  const all = [head, ...rows.map(r => r.map((v, j) => j === 0 ? String(v) : (isFinite(v) ? (+v).toFixed(dg) : '—')))];
  c.font = '13px ' + FONT_UI; const cw = head.map((_, j) => Math.max(...all.map(r => c.measureText(String(r[j])).width)) + 16), rh = 20;
  const tw = cw.reduce((a, b) => a + b, 0), th = all.length * rh;
  c.setLineDash([]); c.fillStyle = '#fff'; c.fillRect(x, y, tw, th); c.fillStyle = '#eceef2'; c.fillRect(x, y, tw, rh); c.strokeStyle = '#555'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, tw, th);
  all.forEach((r, i) => { let X = x; r.forEach((v, j) => { c.fillStyle = '#111'; c.fillText(String(v), X + 8, y + i * rh + 14); X += cw[j]; if (j < r.length - 1) { c.beginPath(); c.moveTo(X + .5, y); c.lineTo(X + .5, y + th); c.stroke(); } }); if (i) { c.beginPath(); c.moveTo(x, y + i * rh + .5); c.lineTo(x + tw, y + i * rh + .5); c.stroke(); } });
  BOX.set(o.id, { x, y, w: tw, h: th });
}
