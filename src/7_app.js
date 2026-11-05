/* ===================== 7. 메뉴 · 대화상자 · 도구상자 · 파일 ===================== */
const host = document.getElementById('app');
/* --- 대화상자 --- */
function dialog(title, html, onOk, opt = {}) {
  const bg = document.createElement('div'); bg.className = 'dlgbg' + (opt.modeless ? ' modeless' : '');
  const dl = document.createElement('form'); dl.className = 'dlg'; dl.innerHTML = `<div class="dt">${esc(title)}<button type="button" class="x" title="닫기">✕</button></div><div class="body">${html}</div><div class="btns">${opt.noCancel ? '' : '<button type="button" class="cancel">취소</button>'}<button type="submit" class="ok">${opt.okText || '확인'}</button></div>`;
  bg.appendChild(dl); host.appendChild(bg);
  const close = () => { bg.remove(); opt.onClose && opt.onClose(); updateUI(); };
  dl.querySelector('.x').onclick = close; const c = dl.querySelector('.cancel'); if (c) c.onclick = close;
  dl.onsubmit = e => { e.preventDefault(); const r = onOk ? onOk(dl) : true; if (r !== false) { bg.remove(); if (opt.onClose && !opt.keepPick) { } updateUI(); } };
  dl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } e.stopPropagation(); });
  // 끌어서 옮기기
  const t = dl.querySelector('.dt'); t.onpointerdown = e => { if (e.target.closest('button')) return; const r = dl.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; dl.style.position = 'fixed'; const mv = ev => { dl.style.left = (ev.clientX - sx) + 'px'; dl.style.top = (ev.clientY - sy) + 'px'; dl.style.margin = '0'; }; const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  if (opt.onInit) opt.onInit(dl);
  setTimeout(() => { const f = dl.querySelector('input:not([type=radio]):not([type=checkbox]),textarea'); if (f && !opt.noFocus) { f.focus(); f.select && f.select(); } }, 20);
  return dl;
}
function alertBox(msg) { dialog('알림', `<p>${esc(msg)}</p>`, null, { noCancel: true }); }
function renameDialog(id) {
  const o = obj(id);
  dialog('이름 바꾸기', `<div class="row"><label>이름</label><input name="lab" value="${esc(o.lab || '')}" size="14"></div>${labelKind(o.g) || o.g === 'poly' ? `<label class="chk"><input type="checkbox" name="sl" ${o.sl ? 'checked' : ''}> 이름 보이기</label>` : ''}
   <p class="note">아래 첨자는 [ ]로: A[1] → A₁</p>`, f => {
    let v = f.lab.value.trim().replace(/\[(\d+)\]/g, (_, n) => subNum(n)); o.lab = v; if (f.sl) o.sl = f.sl.checked && !!v; commit();
  });
}
function editText(o, pw) {
  dialog(o ? '글상자 편집' : '새 글상자', `<textarea name="t" rows="5" cols="36">${esc(o ? o.d.text : '')}</textarea><div class="row"><label>글자 크기</label><input name="fs" value="${o?.d.fs || 15}" size="4"> px</div>`, f => {
    const t = f.t.value; if (!t.trim()) { if (o) { removeObjs([o.id]); commit(); } return; }
    if (o) { o.d.text = t; o.d.fs = +f.fs.value || 15; commit(); } else { const n = addObj('text', 'txt', [], { text: t, x: pw.x, y: pw.y - 8, fs: +f.fs.value || 15 }); finish([n]); }
  });
}
function propsDialog(objs) {
  const o = objs[0]; const many = objs.length > 1; const isV = o.g === 'val' || o.g === 'fn';
  const col = o.s.c;
  dialog('속성' + (many ? ` (${objs.length}개)` : ' — ' + typeName(o)), `
    ${!many ? `<div class="row"><label>이름</label><input name="lab" value="${esc(o.lab || '')}" size="14"></div>` : ''}
    <label class="chk"><input type="checkbox" name="sl" ${o.sl ? 'checked' : ''}> 이름 보이기</label>
    <label class="chk"><input type="checkbox" name="h" ${o.h ? 'checked' : ''}> 숨기기</label>
    <label class="chk"><input type="checkbox" name="tr" ${o.tr ? 'checked' : ''}> 흔적 남기기</label>
    <div class="row"><label>색</label><input type="color" name="c" value="${col}"></div>
    ${o.g === 'pt' ? `<div class="row"><label>점 크기</label><select name="ps">${['아주 작게', '작게', '보통', '크게'].map((t, i) => `<option value="${i}" ${o.s.ps === i ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` : ''}
    ${['ln', 'ci', 'arc', 'loc', 'plot', 'draw'].includes(o.g) ? `<div class="row"><label>선 굵기</label><select name="w">${['가는 선', '보통 선', '굵은 선'].map((t, i) => `<option value="${i + 1}" ${o.s.w === i + 1 ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="row"><label>선 모양</label><select name="dash">${['실선', '파선', '점선'].map((t, i) => `<option value="${i}" ${o.s.dash === i ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` : ''}
    ${isFill(o.g) ? `<div class="row"><label>불투명도</label><input type="range" name="op" min="0.05" max="1" step="0.05" value="${o.s.op}"></div>` : ''}
    ${isV ? `<div class="row"><label>소수 자릿수</label><input name="dg" value="${o.dg ?? D.prefs.digits}" size="3"></div>` : ''}
    ${o.t === 'loc' ? `<div class="row"><label>표본 수</label><input name="n" value="${o.d.n}" size="5"></div>` : ''}
    ${o.t === 'iter' ? `<div class="row"><label>반복 횟수</label><input name="depth" value="${o.d.depth}" size="4"></div><label class="chk"><input type="checkbox" name="fin" ${o.d.finalOnly ? 'checked' : ''}> 마지막 단계만</label>` : ''}
    ${o.t === 'plot' ? `<div class="row"><label>정의역</label><input name="d0" value="${o.d.dom ? o.d.dom[0] : ''}" size="5"> ~ <input name="d1" value="${o.d.dom ? o.d.dom[1] : ''}" size="5"> <span class="note">(비우면 화면 전체)</span></div>` : ''}
    ${o.t === 'btn' && o.d.kind === 'move' ? `<div class="row"><label>이동 속도</label><select name="sp">${['느리게', '보통', '빠르게', '즉시'].map((t, i) => `<option value="${i}" ${o.d.speed === i ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` : ''}
    ${o.t === 'btn' ? `<div class="row"><label>단추 글</label><input name="bl" value="${esc(o.d.label)}" size="20"></div>` : ''}
    ${!many ? `<p class="note">${esc(describe(o))}</p>` : ''}`, f => {
    for (const x of objs) {
      if (!many && f.lab) x.lab = f.lab.value.trim();
      x.sl = f.sl.checked; x.h = f.h.checked; x.tr = f.tr.checked; x.s.c = f.c.value;
      if (f.ps && x.g === 'pt') x.s.ps = +f.ps.value; if (f.w && x.g !== 'pt') { x.s.w = +f.w.value; x.s.dash = +f.dash.value; }
      if (f.op) x.s.op = +f.op.value; if (f.dg) x.dg = clamp(+f.dg.value | 0, 0, 10);
      if (f.n && x.t === 'loc') x.d.n = clamp(+f.n.value | 0, 10, 2000);
      if (f.depth && x.t === 'iter') { x.d.depth = clamp(+f.depth.value | 0, 0, 12); x.d.finalOnly = f.fin.checked; }
      if (f.d0 && x.t === 'plot') { const a = f.d0.value.trim(), b = f.d1.value.trim(); x.d.dom = a && b ? [evalNum(a), evalNum(b)] : null; }
      if (f.sp) x.d.speed = +f.sp.value; if (f.bl) x.d.label = f.bl.value;
    }
    if (objs.some(x => x.h)) SEL = SEL.filter(id => !obj(id).h);
    commit();
  });
}
function prefsDialog() {
  const p = D.prefs;
  dialog('선택사항', `<fieldset><legend>단위</legend>
    <div class="row"><label>거리</label><select name="lu"><option value="cm" ${p.lenUnit === 'cm' ? 'selected' : ''}>센티미터</option><option value="inch" ${p.lenUnit === 'inch' ? 'selected' : ''}>인치</option><option value="px" ${p.lenUnit === 'px' ? 'selected' : ''}>픽셀</option></select></div>
    <div class="row"><label>각</label><select name="au"><option value="deg" ${p.angUnit === 'deg' ? 'selected' : ''}>도</option><option value="rad" ${p.angUnit === 'rad' ? 'selected' : ''}>라디안</option></select></div>
    <div class="row"><label>정밀도</label><select name="dg">${['단위', '십분의 일', '백분의 일', '천분의 일', '만분의 일', '십만분의 일'].map((t, i) => `<option value="${i}" ${p.digits === i ? 'selected' : ''}>${t}</option>`).join('')}</select></div></fieldset>
    <fieldset><legend>이름 자동으로 보이기</legend><label class="chk"><input type="checkbox" name="alp" ${p.autoLabelPts ? 'checked' : ''}> 점</label><label class="chk"><input type="checkbox" name="alo" ${p.autoLabelOther ? 'checked' : ''}> 선·원·호</label></fieldset>`, f => {
    p.lenUnit = f.lu.value; p.angUnit = f.au.value; p.digits = +f.dg.value; p.autoLabelPts = f.alp.checked; p.autoLabelOther = f.alo.checked; commit();
  });
}

/* --- 메뉴 --- */
const cmd = (o, k) => o[k];
const SEP = '-';
function colorSub() { return PALETTE.map(c => ({ swatch: c, cmd: { en: () => SEL.length > 0, run: () => setStyle(o => o.s.c = c) } })).concat([SEP, { t: '기타 색...', cmd: { en: () => SEL.length > 0, run: () => propsDialog(sel()) } }]); }
const MENUS = [
  { t: '파일', k: 'F', items: [
    { t: '새 스케치', k: 'Ctrl+N', cmd: { en: () => true, run: newSketch } },
    { t: '열기...', k: 'Ctrl+O', cmd: { en: () => true, run: openFile } },
    { t: '저장', k: 'Ctrl+S', cmd: { en: () => true, run: () => saveFile(false) } },
    { t: '다른 이름으로 저장...', cmd: { en: () => true, run: () => saveFile(true) } }, SEP,
    { t: '새 페이지', k: 'Shift+Ctrl+N', cmd: { en: () => true, run: () => addPage() } },
    { t: '페이지 복제', cmd: { en: () => true, run: () => addPage(true) } },
    { t: '페이지 이름 바꾸기', cmd: { en: () => true, run: () => renamePage(BOOK.cur) } },
    { t: '페이지 삭제', cmd: { en: () => BOOK.pages.length > 1, run: () => deletePage(BOOK.cur) } },
    { t: '문서 설정...', cmd: { en: () => true, run: () => docOptions() } }, SEP,
    { t: '그림으로 내보내기 (PNG)', cmd: { en: () => true, run: exportPNG } },
    { t: '그림으로 내보내기 (SVG)', cmd: { en: () => true, run: exportSVG } }, SEP,
    { t: '인쇄...', cmd: { en: () => true, run: () => window.print() } },
  ] },
  { t: '편집', k: 'E', items: [
    { t: '실행 취소', k: 'Ctrl+Z', cmd: E_.undo }, { t: '다시 실행', k: 'Ctrl+R', cmd: E_.redo }, SEP,
    { t: '잘라내기', k: 'Ctrl+X', cmd: E_.cut }, { t: '복사', k: 'Ctrl+C', cmd: E_.copy }, { t: '붙여넣기', k: 'Ctrl+V', cmd: E_.paste }, { t: '지우기', k: 'Del', cmd: E_.clear }, SEP,
    { t: '동작 버튼', sub: [{ t: '숨기기/보이기', cmd: E_.btnHide }, { t: '애니메이션', cmd: E_.btnAnim }, { t: '이동', cmd: E_.btnMove }] }, SEP,
    { t: '모두 선택', k: 'Ctrl+A', cmd: E_.selectAll }, { t: '상위 개체 선택', k: 'Ctrl+U', cmd: E_.selParents }, { t: '하위 개체 선택', k: 'Ctrl+D', cmd: E_.selChildren }, SEP,
    { t: '분리/병합', k: 'Shift+Ctrl+M', cmd: E_.splitMerge }, { t: '정의 편집...', k: 'Ctrl+E', cmd: E_.editDef }, { t: '속성...', k: 'Alt+?', cmd: E_.props }, SEP,
    { t: '선택사항...', cmd: E_.prefs },
  ] },
  { t: '보기', k: 'D', items: [
    { t: '점 모양', sub: ['아주 작게', '작게', '보통', '크게'].map((t, i) => ({ t, cmd: { en: () => SEL.length > 0, check: () => SEL.length > 0 && sel().every(o => o.g !== 'pt' || o.s.ps === i), run: () => setStyle(o => { if (o.g === 'pt') o.s.ps = i; }) } })) },
    { t: '선 모양', sub: [...['가는 선', '보통 선', '굵은 선'].map((t, i) => ({ t, cmd: { en: () => SEL.length > 0, check: () => SEL.length > 0 && sel().every(o => o.s.w === i + 1), run: () => setStyle(o => o.s.w = i + 1) } })), SEP, ...['실선', '파선', '점선'].map((t, i) => ({ t, cmd: { en: () => SEL.length > 0, check: () => SEL.length > 0 && sel().every(o => o.s.dash === i), run: () => setStyle(o => o.s.dash = i) } }))] },
    { t: '색', sub: 'color' }, SEP,
    { t: '개체 숨기기', k: 'Ctrl+H', cmd: DSP_.hide }, { t: '숨긴 개체 모두 보이기', cmd: DSP_.showAll }, { t: '이름 보이기', k: 'Ctrl+K', cmd: DSP_.label }, { t: '이름 바꾸기...', k: 'Alt+/', cmd: DSP_.rename }, SEP,
    { t: '흔적 남기기', k: 'Ctrl+T', cmd: DSP_.trace }, { t: '흔적 지우기', k: 'Ctrl+B', cmd: DSP_.erase }, SEP,
    { t: '애니메이션', k: 'Alt+`', cmd: DSP_.animate }, { t: '이동 속도 증가', k: 'Alt+]', cmd: DSP_.faster }, { t: '이동 속도 감소', k: 'Alt+[', cmd: DSP_.slower }, { t: '애니메이션 정지', k: 'Alt+.', cmd: DSP_.stop }, SEP,
    { t: '도구모음 숨기기', cmd: DSP_.toolbox },
  ] },
  { t: '작도', k: 'C', items: [
    { t: '도형 위의 점', cmd: C_.pointOn }, { t: '중점', k: 'Ctrl+M', cmd: C_.midpoint }, { t: '교점', k: 'Ctrl+I', cmd: C_.intersect }, SEP,
    { t: '선분', k: 'Ctrl+L', cmd: C_.segment }, { t: '반직선', cmd: C_.ray }, { t: '직선', cmd: C_.line }, { t: '평행선', cmd: C_.parallel }, { t: '수선', cmd: C_.perp }, { t: '각의 이등분선', cmd: C_.bisector }, SEP,
    { t: '중심과 원주 위의 점이 주어진 원', cmd: C_.circCP }, { t: '중심과 반지름의 길이가 주어진 원', cmd: C_.circCR }, { t: '원 위의 호', cmd: C_.arcOn }, { t: '세 점을 지나는 호', cmd: C_.arc3 }, SEP,
    { t: '다각형 내부', k: 'Ctrl+P', cmd: C_.interior }, { t: '활꼴 내부', cmd: C_.segInterior }, SEP,
    { t: '자취', cmd: C_.locus },
  ] },
  { t: '변환', k: 'T', items: [
    { t: '중심 지정', cmd: T_.markCenter }, { t: '대칭축 지정', cmd: T_.markMirror }, { t: '각 지정', cmd: T_.markAngle }, { t: '비율 지정', cmd: T_.markRatio }, { t: '벡터 지정', cmd: T_.markVector }, { t: '거리 지정', cmd: T_.markDistance }, SEP,
    { t: '평행이동...', cmd: T_.translate }, { t: '회전이동...', cmd: T_.rotate }, { t: '닮음변환...', cmd: T_.dilate }, { t: '선대칭이동', cmd: T_.reflect }, SEP,
    { t: '반복...', cmd: T_.iterate },
  ] },
  { t: '측정', k: 'M', items: [
    { t: '길이', cmd: M_.length }, { t: '거리', cmd: M_.distance }, { t: '둘레의 길이', cmd: M_.perimeter }, { t: '원둘레의 길이', cmd: M_.circum }, SEP,
    { t: '각', cmd: M_.angle }, { t: '넓이', cmd: M_.area }, { t: '중심각의 크기', cmd: M_.arcAngle }, { t: '호의 길이', cmd: M_.arcLength }, { t: '반지름의 길이', cmd: M_.radius }, { t: '비율', cmd: M_.ratio }, SEP,
    { t: '점의 위칫값', cmd: M_.pointValue }, { t: '좌표', cmd: M_.coords }, { t: 'x 좌표', cmd: M_.abscissa }, { t: 'y 좌표', cmd: M_.ordinate }, { t: '좌표상의 거리', cmd: M_.cdist }, { t: '기울기', cmd: M_.slope }, { t: '방정식', cmd: M_.equation },
  ] },
  { t: '수', k: 'N', items: [
    { t: '새 매개변수...', k: 'Shift+Ctrl+P', cmd: N_.newParam }, { t: '계산...', k: 'Alt+=', cmd: N_.calculate }, SEP,
    { t: '표 만들기', cmd: N_.tabulate }, { t: '표에 자료 추가', cmd: N_.addRow }, SEP,
    { t: '새 함수...', k: 'Ctrl+F', cmd: N_.newFunc }, { t: '미분하기', cmd: N_.derivative },
  ] },
  { t: '그래프', k: 'G', items: [
    { t: '좌표계 정의', cmd: GR_.defineCS }, { t: '격자 숨기기', cmd: GR_.gridToggle }, { t: '점선 격자', cmd: GR_.dotGrid }, { t: '격자점에 맞추기', cmd: GR_.snap }, SEP,
    { t: '좌표로 점 찍기...', cmd: GR_.plotPoints }, { t: '함수의 그래프 그리기...', cmd: GR_.plotFunc }, { t: '그래프 위에 점 찍기 (함수, x값)', cmd: GR_.pointOnPlot },
  ] },
  { t: '창', k: 'W', items: [
    { t: '전체 화면', cmd: { en: () => true, run: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() } },
    { t: '화면 위치 초기화', cmd: { en: () => true, run: () => { D.view = { x: 0, y: 0 }; eraseTraces(); redraw(); } } }, SEP,
    { t: '페이지', sub: () => BOOK.pages.map((pg, i) => ({ t: (i + 1) + ' ' + pg.title, cmd: { en: () => true, check: () => i === BOOK.cur, run: () => switchPage(i) } })) },
  ] },
  { t: '도움말', k: 'H', items: [
    { t: 'GSP5 참조 센터 (내 컴퓨터)', cmd: { en: () => true, run: () => openHelp('index.html') } },
    { t: '작도 메뉴 안내', cmd: { en: () => true, run: () => openHelp('menus_construct.htm') } },
    { t: '변환 메뉴 안내', cmd: { en: () => true, run: () => openHelp('menus_trans.htm') } },
    { t: '측정 메뉴 안내', cmd: { en: () => true, run: () => openHelp('menus_measure.htm') } },
    { t: '키보드 사용법', cmd: { en: () => true, run: () => openHelp('shortcuts.htm') } }, SEP,
    { t: '단축키 한눈에 보기', cmd: { en: () => true, run: shortcutHelp } },
    { t: '웹 스케치패드 정보', cmd: { en: () => true, run: () => alertBox('웹 스케치패드 — The Geometer\'s Sketchpad 5의 작도 방식을 웹 브라우저로 옮긴 동적 기하 프로그램입니다. 저장 파일(.wgsp)은 이 프로그램 전용입니다.') } },
  ] },
];
function openHelp(page) { if (location.protocol !== 'file:') { alertBox('GSP5 참조 센터는 GSP5가 설치된 컴퓨터에만 있습니다. WebGSP.html을 GSP5 폴더(예: D:\\Sketchpad)에 두고 열면 도움말 메뉴에서 바로 열립니다. 단축키는 [단축키 한눈에 보기]를 참고하세요.'); return; } window.open('Sketchpad Help/Reference Center/' + page, '_blank'); }
function shortcutHelp() {
  const rows = [['Esc', '작업 취소 → 화살표 도구 → 선택 해제 → 애니메이션 정지 → 흔적 지우기'], ['Shift+↑/↓', '도구 바꾸기'], ['Shift+←/→', '화살표·선·다각형 도구의 세부 도구 바꾸기'], ['Del / Backspace', '선택 개체와 그 하위 개체 지우기'], ['방향키', '선택한 점을 1픽셀씩 이동 (Shift: 10픽셀)'], ['+ / −', '선택한 매개변수 값 또는 반복 횟수 바꾸기'], ['Alt+끌기, 가운데 단추 끌기, 스페이스+끌기', '화면 이동'], ['점 두 번 클릭', '중심 지정'], ['선 두 번 클릭', '대칭축 지정'], ['Shift+선 그리기', '15° 단위로 고정']];
  dialog('단축키', `<table class="keys-t">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`, null, { noCancel: true });
}
const menubar = document.getElementById('menubar');
let openMenu = null;
function buildMenubar() {
  menubar.innerHTML = '';
  MENUS.forEach((m, i) => { const b = document.createElement('button'); b.className = 'mb'; b.innerHTML = `${m.t}(<u>${m.k}</u>)`; b.onpointerdown = e => { e.preventDefault(); if (openMenu === i) closeMenus(); else showMenu(i); }; b.onpointerenter = () => { if (openMenu !== null && openMenu !== i) showMenu(i); }; menubar.appendChild(b); });
}
function lbl(x) { return typeof x === 'function' ? x() : x; }
function renderItems(items, el) {
  el.innerHTML = '';
  if (items === 'color') { el.classList.add('pal'); for (const c of PALETTE) { const s = document.createElement('button'); s.className = 'sw'; s.style.background = c; s.title = c; s.disabled = !SEL.length; s.onclick = () => { setStyle(o => o.s.c = c); closeMenus(); }; el.appendChild(s); } const m = document.createElement('button'); m.className = 'mi wide'; m.textContent = '기타 색...'; m.disabled = !SEL.length; m.onclick = () => { closeMenus(); propsDialog(sel()); }; el.appendChild(m); return; }
  el.classList.remove('pal');
  for (const it of items) {
    if (it === SEP) { const h = document.createElement('div'); h.className = 'sep'; el.appendChild(h); continue; }
    const b = document.createElement('button'); b.className = 'mi';
    const en = it.sub ? true : !!(it.cmd && it.cmd.en());
    const label = it.cmd && it.cmd.label ? it.cmd.label() : lbl(it.t);
    const chk = it.cmd && it.cmd.check && it.cmd.check();
    b.innerHTML = `<span class="ck">${chk ? '✓' : ''}</span><span class="tx">${esc(label)}</span><span class="sk">${it.k || ''}${it.sub ? '▸' : ''}</span>`;
    b.disabled = !en;
    if (it.sub) { const sm = document.createElement('div'); sm.className = 'menu submenu'; b.appendChild(sm); b.onpointerenter = () => { el.querySelectorAll(':scope > .mi > .submenu').forEach(s => s.hidden = true); renderItems(typeof it.sub === 'function' ? it.sub() : it.sub, sm); sm.hidden = false; }; sm.hidden = true; }
    else b.onpointerenter = () => el.querySelectorAll(':scope > .mi > .submenu').forEach(s => s.hidden = true);
    if (!it.sub) b.onclick = e => { e.stopPropagation(); closeMenus(); try { evaluate(); it.cmd.run(); } catch (err) { console.error(err); alertBox('실행 중 오류: ' + err.message); } updateUI(); redraw(); };
    el.appendChild(b);
  }
}
const menuEl = document.getElementById('menu');
function showMenu(i) {
  openMenu = i; const m = MENUS[i]; renderItems(m.items, menuEl); menuEl.hidden = false;
  const b = menubar.children[i].getBoundingClientRect(), hr = host.getBoundingClientRect(); menuEl.style.left = (b.left - hr.left) + 'px'; menuEl.style.top = (b.bottom - hr.top) + 'px';
  [...menubar.children].forEach((x, j) => x.classList.toggle('on', j === i));
}
function closeMenus() { openMenu = null; menuEl.hidden = true; ctxEl.hidden = true; [...menubar.children].forEach(x => x.classList.remove('on')); document.querySelectorAll('.flyout').forEach(f => f.remove()); }
document.addEventListener('pointerdown', e => { if (e.target === cv && e.button === 2) return; if (!e.target.closest('.menu,#menubar,.flyout,.tb')) closeMenus(); });

/* --- 오른쪽 클릭 메뉴 --- */
const ctxEl = document.getElementById('ctx');
function onContext(e, pw) {
  const id = hit(pw); if (id && !SEL.includes(id)) { SEL = [id]; } if (!id && !SEL.length) { }
  redraw(); updateUI();
  const items = SEL.length ? [
    { t: '개체 숨기기', cmd: DSP_.hide }, { t: '이름 보이기', cmd: DSP_.label }, { t: '이름 바꾸기...', cmd: DSP_.rename }, SEP,
    { t: '흔적 남기기', cmd: DSP_.trace }, { t: '애니메이션', cmd: DSP_.animate }, SEP,
    { t: '색', sub: 'color' }, { t: '정의 편집...', cmd: E_.editDef }, { t: '분리/병합', cmd: E_.splitMerge }, SEP,
    { t: '상위 개체 선택', cmd: E_.selParents }, { t: '하위 개체 선택', cmd: E_.selChildren }, SEP, { t: '지우기', cmd: E_.clear }, { t: '속성...', cmd: E_.props }]
    : [{ t: '붙여넣기', cmd: E_.paste }, { t: '모두 선택', cmd: E_.selectAll }, SEP, { t: '숨긴 개체 모두 보이기', cmd: DSP_.showAll }, { t: '흔적 지우기', cmd: DSP_.erase }, SEP, { t: '선택사항...', cmd: E_.prefs }];
  renderItems(items, ctxEl); ctxEl.hidden = false;
  const hr = host.getBoundingClientRect(); ctxEl.style.left = Math.min(e.clientX - hr.left, hr.width - 230) + 'px'; ctxEl.style.top = Math.min(e.clientY - hr.top, hr.height - ctxEl.offsetHeight - 6) + 'px';
}

/* --- 도구상자 --- */
const ICONS = {
  arrow: {
    move: '<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1"/></filter></defs><path d="M10.5 6.5v17l4.2-4 3 6.8 2.8-1.3-3-6.7 5.9-.3z" fill="#000" opacity=".35" filter="url(#sh)" transform="translate(1.2 1.2)"/><path d="M10 6v17l4.2-4 3 6.8 2.8-1.3-3-6.7 5.9-.3z" fill="#1c1f33"/>',
    rot: '<path d="M9 5v14l3.5-3.3 2.5 5.6 2.3-1.1-2.5-5.5 4.9-.3z" fill="#1c1f33"/><path d="M19.5 26a9 9 0 0 0 6-8.5" stroke="#1c1f33" stroke-width="1.7" fill="none"/><path d="M23 15.5l3 3.6 2.3-4.1z" fill="#1c1f33"/>',
    dil: '<path d="M9 5v14l3.5-3.3 2.5 5.6 2.3-1.1-2.5-5.5 4.9-.3z" fill="#1c1f33"/><path d="M18 27l9-9" stroke="#1c1f33" stroke-width="1.7"/><path d="M27.8 16.5v6l-6-6z" fill="#1c1f33"/>' },
  point: '<circle cx="16" cy="16" r="2.6" fill="#1c1f33"/>',
  compass: '<circle cx="16" cy="16" r="13" fill="none" stroke="#111" stroke-width="1.7"/><path d="M16 13v6M13 16h6" stroke="#3d8fd6" stroke-width="1.2"/>',
  straight: {
    seg: '<path d="M4.5 28.5L28 5" stroke="#1c1f33" stroke-width="1.7"/><circle cx="4.5" cy="28.5" r="1.7" fill="#1c1f33"/><circle cx="28" cy="5" r="1.7" fill="#1c1f33"/>',
    ray: '<path d="M4.5 28.5L28 5" stroke="#1c1f33" stroke-width="1.7"/><circle cx="4.5" cy="28.5" r="1.7" fill="#1c1f33"/><path d="M29.5 3.5l-7 1.8 5.2 5.2z" fill="#1c1f33"/>',
    line: '<path d="M3 30L29.5 3.5" stroke="#1c1f33" stroke-width="1.7"/><path d="M29.5 3.5l-7 1.8 5.2 5.2zM3 30l7-1.8-5.2-5.2z" fill="#1c1f33"/>' },
  poly: {
    int: '<defs><linearGradient id="pg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fd0f3"/><stop offset=".45" stop-color="#4aa0db"/><stop offset="1" stop-color="#2c7fbf"/></linearGradient></defs><path d="M15.5 3.5l11.5 8.2-4.3 13.2H8.8L4.4 11.7z" fill="url(#pg1)"/>',
    both: '<defs><linearGradient id="pg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fd0f3"/><stop offset=".45" stop-color="#4aa0db"/><stop offset="1" stop-color="#2c7fbf"/></linearGradient></defs><path d="M15.5 3.5l11.5 8.2-4.3 13.2H8.8L4.4 11.7z" fill="url(#pg2)" stroke="#2c6fa6" stroke-width=".8"/><g fill="#1c1f33"><circle cx="15.5" cy="3.5" r="2"/><circle cx="27" cy="11.7" r="2"/><circle cx="22.7" cy="24.9" r="2"/><circle cx="8.8" cy="24.9" r="2"/><circle cx="4.4" cy="11.7" r="2"/></g>',
    edge: '<path d="M15.5 3.5l11.5 8.2-4.3 13.2H8.8L4.4 11.7z" fill="none" stroke="#1c1f33" stroke-width="1.5"/><g fill="#1c1f33"><circle cx="15.5" cy="3.5" r="2"/><circle cx="27" cy="11.7" r="2"/><circle cx="22.7" cy="24.9" r="2"/><circle cx="8.8" cy="24.9" r="2"/><circle cx="4.4" cy="11.7" r="2"/></g>' },
  text: '<text x="16" y="28" text-anchor="middle" font-family="Times New Roman,Times,serif" font-weight="700" font-size="32" fill="#000">A</text>',
  marker: '<path d="M5.5 25.5l1.2-4.6L20.5 7.1l3.6 3.6L10.3 24.5z" fill="#1c1f33"/><path d="M20.5 7.1l2.6-2.6c.7-.7 1.6-.7 2.3 0l1.3 1.3c.7.7.7 1.6 0 2.3l-2.6 2.6z" fill="#3a3f5c"/><path d="M5.5 25.5l1.2-4.6 3.6 3.6z" fill="#3d8fd6"/><path d="M3 29.3c6-1.8 14-.4 25-1.6" stroke="#3d8fd6" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  info: '<path d="M7.5 4.5h12a5.5 5.5 0 0 1 5.5 5.5v3.4c0 1.1.5 1.8 1.4 2.4l2 1.4-2.6.9c-.7.3-.9.9-.9 1.6v2.8a5.5 5.5 0 0 1-5.5 5.5h-12A5.5 5.5 0 0 1 2 22.5V10a5.5 5.5 0 0 1 5.5-5.5z" fill="#fff" stroke="#3d8fd6" stroke-width="2.4"/><circle cx="13.6" cy="10.3" r="2" fill="#1c1f33"/><path d="M10.3 14.2h5v8.4h1.8v1.8h-6.8v-1.8h1.8v-6.6h-1.8z" fill="#1c1f33"/>',
  custom: '<path d="M6 6.5l12 9.5-12 9.5z" fill="#1c1f33"/><g fill="#1c1f33"><rect x="22" y="6" width="4" height="4"/><rect x="22" y="14" width="4" height="4"/><rect x="22" y="22" width="4" height="4"/></g>',
};
const TOOLS = [['arrow', '화살표 도구'], ['point', '점 도구'], ['compass', '원 도구'], ['straight', '선 도구'], ['poly', '다각형 도구'], ['text', '글 도구'], ['marker', '펜 도구'], ['info', '정보 도구'], ['custom', '사용자 도구']];
const SUBS = { arrow: [['move', '이동 화살표'], ['rot', '회전 화살표'], ['dil', '닮음 화살표']], straight: [['seg', '선분'], ['ray', '반직선'], ['line', '직선']], poly: [['int', '다각형 내부'], ['both', '다각형 내부와 변'], ['edge', '다각형의 변']] };
const tbEl = document.getElementById('toolbox');
const svg = (body) => `<svg viewBox="0 0 32 32" width="32" height="32">${body}</svg>`;
function iconFor(t) { const ic = ICONS[t]; return svg(typeof ic === 'string' ? ic : ic[SUB[t]]); }
function buildToolbox() {
  tbEl.innerHTML = '';
  TOOLS.forEach(([t, name], i) => {
    const b = document.createElement('button'); b.className = 'tb'; b.dataset.t = t; b.title = name; b.innerHTML = iconFor(t) + (SUBS[t] ? '<span class="tri"></span>' : '');
    let holdT = null;
    b.onpointerdown = e => { e.preventDefault(); if (SUBS[t]) holdT = setTimeout(() => { holdT = null; flyout(t, b); }, 350); if (t === 'custom') { openCustomMenu(); return; } };
    b.onpointerup = e => { if (t === 'custom') return; if (holdT) { clearTimeout(holdT); holdT = null; const r = b.getBoundingClientRect(); if (SUBS[t] && e.clientX > r.right - 12 && e.clientY > r.bottom - 12) { flyout(t, b); return; } setTool(t); } else if (!SUBS[t]) setTool(t); };
    tbEl.appendChild(b);
  });
  const end = document.createElement('div'); end.className = 'tend'; tbEl.appendChild(end);
  syncToolbox();
}
function syncToolbox() { tbEl.querySelectorAll('.tb').forEach(b => { b.classList.toggle('on', b.dataset.t === TOOL); const t = b.dataset.t; if (SUBS[t]) { b.firstChild.outerHTML = iconFor(t); } }); }
function flyout(t, b) {
  closeMenus(); const f = document.createElement('div'); f.className = 'flyout'; const hr = host.getBoundingClientRect(), r = b.getBoundingClientRect();
  f.style.left = (r.right - hr.left + 2) + 'px'; f.style.top = (r.top - hr.top) + 'px';
  for (const [s, name] of SUBS[t]) { const x = document.createElement('button'); x.className = 'tb' + (SUB[t] === s ? ' on' : ''); x.title = name; x.innerHTML = svg(ICONS[t][s]); x.onclick = () => { SUB[t] = s; setTool(t); f.remove(); syncToolbox(); }; f.appendChild(x); }
  host.appendChild(f);
}
function openCustomMenu() {
  const b = tbEl.querySelector('[data-t=custom]');
  let lib = []; try { lib = JSON.parse(localStorage.getItem('webgsp.tools') || '[]'); } catch (e) { }
  const extra = lib.filter(t => !D.tools.some(x => x.name === t.name && JSON.stringify(x.steps) === JSON.stringify(t.steps)));
  const items = [{ t: '사용자 도구 만들기...', cmd: { en: () => SEL.length > 0, run: makeTool } }, SEP,
    ...(D.tools.length ? D.tools.map((t, i) => ({ t: t.name, cmd: { en: () => true, check: () => custState && custState.orig === t, run: () => chooseTool(i) } })) : [{ t: '(이 문서의 도구 없음)', cmd: { en: () => false } }]),
    ...(extra.length ? [SEP, { t: '다른 문서에서 만든 도구', sub: extra.map(t => ({ t: t.name, cmd: { en: () => true, run: () => { D.tools.push(JSON.parse(JSON.stringify(t))); chooseTool(D.tools.length - 1); commit(); } } })) }] : []),
    SEP, { t: '이 문서의 도구 모두 지우기', cmd: { en: () => D.tools.length > 0, run: () => { D.tools = []; custState = null; commit(); } } }];
  renderItems(items, ctxEl); ctxEl.hidden = false; const hr = host.getBoundingClientRect(), r = b.getBoundingClientRect(); ctxEl.style.left = (r.right - hr.left + 2) + 'px'; ctxEl.style.top = Math.min(r.top - hr.top, hr.height - ctxEl.offsetHeight - 8) + 'px';
}
function setTool(t) {
  if (t !== TOOL) { polyState = null; twoClick = null; preview = null; if (t !== 'custom') custState = null; }
  if (polyState && polyState.ids.length) { }
  TOOL = t; syncToolbox(); status(t === 'custom' && custState ? `${custState.tool.name}: 1번째 대상을 클릭하세요.` : toolHint()); redraw();
}

/* --- 키보드 --- */
const KEYMAP = { 'ctrl+n': () => newSketch(), 'ctrl+o': () => openFile(), 'ctrl+s': () => saveFile(false), 'ctrl+z': E_.undo, 'ctrl+r': E_.redo, 'ctrl+y': E_.redo, 'ctrl+shift+z': E_.redo, 'ctrl+x': E_.cut, 'ctrl+c': E_.copy, 'ctrl+v': E_.paste, 'ctrl+a': E_.selectAll, 'ctrl+u': E_.selParents, 'ctrl+d': E_.selChildren, 'ctrl+shift+m': E_.splitMerge, 'ctrl+e': E_.editDef, 'alt+?': E_.props, 'alt+/': DSP_.rename, 'ctrl+h': DSP_.hide, 'ctrl+k': DSP_.label, 'ctrl+t': DSP_.trace, 'ctrl+b': DSP_.erase, 'alt+`': DSP_.animate, 'alt+]': DSP_.faster, 'alt+[': DSP_.slower, 'alt+.': DSP_.stop, 'ctrl+m': C_.midpoint, 'ctrl+i': C_.intersect, 'ctrl+l': C_.segment, 'ctrl+p': C_.interior, 'ctrl+shift+p': N_.newParam, 'alt+=': N_.calculate, 'ctrl+f': N_.newFunc, 'ctrl+shift+n': () => addPage(), 'ctrl+pagedown': () => switchPage((BOOK.cur + 1) % BOOK.pages.length), 'ctrl+pageup': () => switchPage((BOOK.cur + BOOK.pages.length - 1) % BOOK.pages.length) };
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select,.dlg')) return;
  const k = (e.ctrlKey || e.metaKey ? 'ctrl+' : '') + (e.altKey ? 'alt+' : '') + (e.shiftKey && (e.ctrlKey || e.metaKey) ? 'shift+' : '') + e.key.toLowerCase();
  if (e.altKey && !e.ctrlKey) { const mi = MENUS.findIndex(m => m.k.toLowerCase() === e.key.toLowerCase()); if (mi >= 0 && !KEYMAP[k]) { e.preventDefault(); showMenu(mi); return; } }
  const c = KEYMAP[k];
  if (c) { e.preventDefault(); evaluate(); if (typeof c === 'function') c(); else if (c.en()) { c.run(); updateUI(); } redraw(); return; }
  if (e.key === ' ') { SPACE = true; cv.style.cursor = 'grab'; e.preventDefault(); return; }
  if (e.key === 'Escape') { escape(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); return; }
  if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); const i = TOOLS.findIndex(t => t[0] === TOOL); setTool(TOOLS[(i + (e.key === 'ArrowDown' ? 1 : TOOLS.length - 1)) % TOOLS.length][0]); return; }
  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && SUBS[TOOL]) { e.preventDefault(); const L = SUBS[TOOL], i = L.findIndex(s => s[0] === SUB[TOOL]); SUB[TOOL] = L[(i + (e.key === 'ArrowRight' ? 1 : L.length - 1)) % L.length][0]; syncToolbox(); status(toolHint()); return; }
  if (e.key.startsWith('Arrow') && SEL.length) { e.preventDefault(); const st = e.shiftKey ? 10 : 1; const d = { ArrowLeft: { x: -st, y: 0 }, ArrowRight: { x: st, y: 0 }, ArrowUp: { x: 0, y: -st }, ArrowDown: { x: 0, y: st } }[e.key]; applyHandles(buildHandles(SEL), p => V.add(p, d), d); commit(); return; }
  if ((e.key === '+' || e.key === '=' || e.key === '-') && SEL.length) {
    const up = e.key !== '-'; let did = false;
    for (const o of sel()) { if (o.t === 'param') { o.d.v = +(o.d.v + (up ? 1 : -1) * (o.d.step || 1)).toFixed(10); did = true; } if (o.t === 'iter') { o.d.depth = clamp(o.d.depth + (up ? 1 : -1), 0, 12); did = true; } }
    if (did) { e.preventDefault(); commit(); }
  }
});
document.addEventListener('keyup', e => { if (e.key === ' ') { SPACE = false; cv.style.cursor = 'default'; } });
function escape() {
  hideInfo();
  if (PICK) { PICK = null; flash('취소했습니다.'); return; }
  if (polyState) { polyState = null; preview = null; commit(); redraw(); return; }
  if (twoClick || drag) { twoClick = null; drag = null; preview = null; redraw(); return; }
  if (custState && custState.got.length) { custState.got = []; status('사용자 도구 적용을 처음부터 다시 합니다.'); return; }
  if (TOOL !== 'arrow') { setTool('arrow'); return; }
  if (SEL.length) { SEL = []; redraw(); updateUI(); return; }
  if (ANIM.size || MOVES.length) { stopAll(); return; }
  eraseTraces();
}

/* --- 파일 --- */
/* 문서 불러오기·저장은 8_pages.js */
function exportPNG() { const a = document.createElement('a'); SEL = []; draw(); a.href = cv.toDataURL('image/png'); a.download = BOOK.name + '-' + pageTitle() + '.png'; a.click(); }
function exportSVG() {
  evaluate(); const vw = viewRect(); const out = []; const tf = p => `${(p.x - vw.x0).toFixed(2)},${(p.y - vw.y0).toFixed(2)}`;
  const st = o => `stroke="${o.s.c}" stroke-width="${[1, 1, 2, 3][o.s.w]}" fill="none"${o.s.dash === 1 ? ' stroke-dasharray="7 4"' : o.s.dash === 2 ? ' stroke-dasharray="2 3"' : ''}`;
  const pathD = (g, gt) => { if (gt === 'ln') { const P = clipLine(g); return P ? `M${tf(P[0])}L${tf(P[1])}` : ''; } if (gt === 'ci' || gt === 'cint') return `M${tf({ x: g.c.x + g.r, y: g.c.y })}A${g.r},${g.r} 0 1 0 ${tf({ x: g.c.x - g.r, y: g.c.y })}A${g.r},${g.r} 0 1 0 ${tf({ x: g.c.x + g.r, y: g.c.y })}`; if (gt === 'arc' || gt === 'sect' || gt === 'segm') { const a = arcAt(g, 0), b = arcAt(g, 1); return (gt === 'sect' ? `M${tf(g.c)}L` : 'M') + `${tf(a)}A${g.r},${g.r} 0 ${g.sw > PI ? 1 : 0} 0 ${tf(b)}` + (gt !== 'arc' ? 'Z' : ''); } if (gt === 'poly') return 'M' + g.pts.map(tf).join('L') + 'Z'; if (gt === 'loc' || gt === 'plot') return g.paths.map(s => 'M' + s.map(tf).join('L')).join(''); if (gt === 'draw') return 'M' + g.pts.map(tf).join('L'); return ''; };
  for (const o of ORDER) { if (o.h) continue; const g = G.get(o.id); if (!g) continue; if (isFill(o.g)) out.push(`<path d="${pathD(g, o.g)}" fill="${o.s.c}" fill-opacity="${o.s.op}"/>`); }
  for (const o of ORDER) { if (o.h) continue; const g = G.get(o.id); if (!g) continue; if (['ln', 'ci', 'arc', 'loc', 'plot', 'draw'].includes(o.g)) out.push(`<path d="${pathD(g, o.g)}" ${st(o)}/>`); if (o.t === 'iter') for (const it of g.items) { const so = obj(it.id); if (so.g === 'pt') out.push(`<circle cx="${(it.g.x - vw.x0).toFixed(2)}" cy="${(it.g.y - vw.y0).toFixed(2)}" r="3" fill="${so.s.c}"/>`); else if (isFill(so.g)) out.push(`<path d="${pathD(it.g, so.g)}" fill="${so.s.c}" fill-opacity="${so.s.op}"/>`); else out.push(`<path d="${pathD(it.g, so.g)}" ${st(so)}/>`); } }
  for (const o of ORDER) { if (o.h) continue; const g = G.get(o.id); if (!g || o.g !== 'pt') continue; out.push(`<circle cx="${(g.x - vw.x0).toFixed(2)}" cy="${(g.y - vw.y0).toFixed(2)}" r="${[1.5, 2.5, 3.5, 4.5][o.s.ps]}" fill="${o.s.c}" stroke="#000" stroke-opacity=".6"/>`); }
  for (const [id, b] of LBOX) { const o = obj(id); if (o && !o.h) out.push(`<text x="${(b.x - vw.x0).toFixed(1)}" y="${(b.y + 13 - vw.y0).toFixed(1)}" font-family="Times New Roman" font-style="italic" font-size="15">${esc(o.lab)}</text>`); }
  for (const [id, b] of BOX) { const o = obj(id); if (!o || o.h) continue; const t = o.t === 'text' ? o.d.text : (boxSegs(o) || []).map(s => s.t.replace(/^_/, '')).join(''); out.push(`<text x="${(b.x + 3 - vw.x0).toFixed(1)}" y="${(b.y + 16 - vw.y0).toFixed(1)}" font-family="Malgun Gothic,sans-serif" font-size="14">${esc(t)}</text>`); }
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/>${out.join('\n')}</svg>`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); a.download = BOOK.name + '-' + pageTitle() + '.svg'; a.click();
}

/* --- 화면 갱신 --- */
function updateUI() { if (performance.now() - flashT > 2500) status(selSummary() || toolHint()); }
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => autosave());

