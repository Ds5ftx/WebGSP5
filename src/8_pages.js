/* ===================== 8. 여러 페이지(시트) · 문서 저장 ===================== */
let BOOK = null;
const pageTitle = () => BOOK.pages[BOOK.cur].title;
function newPage(title) { return { title, doc: newDoc(), undo: [], redo: [], snap: null }; }
function nextPageTitle() { let n = BOOK.pages.length + 1; const used = new Set(BOOK.pages.map(p => p.title)); while (used.has('페이지 ' + n)) n++; return '페이지 ' + n; }
function bookData() {
  if (!BOOK) return null;
  return { format: 'webgsp', version: 2, name: BOOK.name, cur: BOOK.cur, tools: BOOK.tools,
    pages: BOOK.pages.map(p => { const { tools, ...rest } = p.doc; return { title: p.title, doc: rest }; }) };
}
/* 현재 페이지 상태 보관 → 다른 페이지로 */
function stashPage() {
  const pg = BOOK.pages[BOOK.cur]; if (!pg) return;
  pg.undo = UNDO.slice(); pg.redo = REDO.slice(); pg.snap = lastSnap; BOOK.tools = D.tools;
}
function enterPage(i) {
  BOOK.cur = clamp(i, 0, BOOK.pages.length - 1); const pg = BOOK.pages[BOOK.cur];
  D = pg.doc; D.prefs = { ...PREFS0, ...(D.prefs || {}) }; D.tools = BOOK.tools;
  structDirty = true; rebuildIndex();
  UNDO.length = 0; UNDO.push(...pg.undo); REDO.length = 0; REDO.push(...pg.redo);
  lastSnap = pg.snap || snapDoc();
  SEL = []; ANIM.clear(); MOVES.length = 0; polyState = null; twoClick = null; preview = null; PICK = null; hoverId = null;
  if (custState) custState.got = [];
  hideInfo(); eraseTraces(); renderTabs(); updateTitle(); redraw(); updateUI();
}
function switchPage(i) { if (i === BOOK.cur || i < 0 || i >= BOOK.pages.length) return; stashPage(); enterPage(i); autosave(); }
function addPage(dup) {
  stashPage();
  const src = BOOK.pages[BOOK.cur];
  const pg = newPage(dup ? src.title + ' (사본)' : nextPageTitle());
  if (dup) { const { tools, ...rest } = src.doc; pg.doc = Object.assign(newDoc(), JSON.parse(JSON.stringify(rest))); }
  else { pg.doc.prefs = { ...D.prefs }; }
  BOOK.pages.splice(BOOK.cur + 1, 0, pg); enterPage(BOOK.cur + 1); autosave();
  flash(dup ? '페이지를 복제했습니다.' : '새 페이지를 만들었습니다. 아래 탭으로 페이지를 오갈 수 있습니다.');
}
function deletePage(i) {
  if (BOOK.pages.length < 2) return;
  const pg = BOOK.pages[i];
  if (pg.doc.objs.length && !confirm(`"${pg.title}" 페이지를 지울까요? 이 페이지의 작도는 모두 사라집니다.`)) return;
  if (i === BOOK.cur) { BOOK.pages.splice(i, 1); enterPage(Math.min(i, BOOK.pages.length - 1)); }
  else { stashPage(); BOOK.pages.splice(i, 1); if (i < BOOK.cur) BOOK.cur--; renderTabs(); }
  autosave();
}
function renamePage(i) {
  if (i !== BOOK.cur) switchPage(i);
  const t = pbEl.querySelectorAll('.ptab')[i]; if (t) editTab(t, i);
}
/* 탭에서 바로 이름 고치기 */
function editTab(t, i) {
  if (t.querySelector('input')) return;
  const pg = BOOK.pages[i]; const inp = document.createElement('input');
  inp.className = 'ptin'; inp.value = pg.title; inp.size = Math.max(4, pg.title.length + 2);
  t.textContent = ''; t.appendChild(inp); t.classList.add('editing'); inp.focus(); inp.select();
  let done = false;
  const finish = ok => { if (done) return; done = true; const v = inp.value.trim(); if (ok && v) pg.title = v; renderTabs(); updateTitle(); if (ok) autosave(); };
  inp.oninput = () => { inp.size = Math.max(4, inp.value.length + 2); };
  inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); };
  inp.onblur = () => finish(true);
  inp.onclick = e => e.stopPropagation(); inp.ondblclick = e => e.stopPropagation();
}
function movePage(i, d) {
  const j = i + d; if (j < 0 || j >= BOOK.pages.length) return;
  stashPage(); const [pg] = BOOK.pages.splice(i, 1); BOOK.pages.splice(j, 0, pg);
  if (BOOK.cur === i) BOOK.cur = j; else if (BOOK.cur === j) BOOK.cur = i;
  renderTabs(); autosave();
}
function docOptions() {
  stashPage();
  let order = BOOK.pages.map((p, i) => ({ i, title: p.title }));
  const rows = () => order.map((r, k) => `<tr><td>${k + 1}</td><td><input data-k="${k}" class="pt" value="${esc(r.title)}" size="16"></td><td><button type="button" data-up="${k}" ${k ? '' : 'disabled'}>▲</button><button type="button" data-dn="${k}" ${k < order.length - 1 ? '' : 'disabled'}>▼</button> <button type="button" data-del="${k}" ${order.length > 1 ? '' : 'disabled'}>삭제</button></td></tr>`).join('');
  const dl = dialog('문서 설정 — 페이지', `<div class="row"><label>문서 이름</label><input name="nm" value="${esc(BOOK.name)}" size="20"></div>
    <table class="pages"><tbody>${rows()}</tbody></table><div class="row"><button type="button" class="padd">페이지 추가</button></div>
    <p class="note">이름을 바꾸거나 순서를 정한 뒤 확인을 누르세요. 삭제한 페이지는 되돌릴 수 없습니다.</p>`, f => {
    f.querySelectorAll('input.pt').forEach(inp => order[+inp.dataset.k].title = inp.value.trim() || order[+inp.dataset.k].title);
    const curPg = BOOK.pages[BOOK.cur];
    const pages = order.map(r => { if (r.i == null) return newPage(r.title); const p = BOOK.pages[r.i]; p.title = r.title; return p; });
    BOOK.name = f.nm.value.trim() || BOOK.name;
    BOOK.pages = pages; const ci = pages.indexOf(curPg);
    enterPage(ci >= 0 ? ci : 0); autosave();
  });
  const tb = dl.querySelector('table.pages tbody');
  const sync = () => tb.querySelectorAll('input.pt').forEach(inp => order[+inp.dataset.k].title = inp.value);
  const re = () => { tb.innerHTML = rows(); bind(); };
  const bind = () => {
    tb.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { sync(); const k = +b.dataset.up; [order[k - 1], order[k]] = [order[k], order[k - 1]]; re(); });
    tb.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { sync(); const k = +b.dataset.dn; [order[k + 1], order[k]] = [order[k], order[k + 1]]; re(); });
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { sync(); const k = +b.dataset.del; const r = order[k]; if (r.i != null && BOOK.pages[r.i].doc.objs.length && !confirm(`"${r.title}" 페이지를 지울까요?`)) return; order.splice(k, 1); re(); });
  };
  bind();
  dl.querySelector('.padd').onclick = () => { sync(); const used = new Set(order.map(r => r.title)); let n = order.length + 1; while (used.has('페이지 ' + n)) n++; order.push({ i: null, title: '페이지 ' + n }); re(); };
}

/* --- 페이지 탭 --- */
const pbEl = document.getElementById('pagebar');
function renderTabs() {
  pbEl.innerHTML = '';
  BOOK.pages.forEach((pg, i) => {
    const t = document.createElement('button'); t.className = 'ptab' + (i === BOOK.cur ? ' on' : ''); t.textContent = pg.title; t.title = i === BOOK.cur ? '클릭하면 이름을 바로 고칠 수 있습니다 (Enter: 확정, Esc: 취소)' : '클릭: 이 페이지로 가기 · 오른쪽 클릭: 페이지 메뉴';
    t.onclick = () => { if (i === BOOK.cur) editTab(t, i); else switchPage(i); };
    t.oncontextmenu = e => { e.preventDefault(); tabMenu(i, e); };
    pbEl.appendChild(t);
  });
  const add = document.createElement('button'); add.className = 'ptab add'; add.textContent = '+'; add.title = '새 페이지 (Shift+Ctrl+N)'; add.onclick = () => addPage(); pbEl.appendChild(add);
  const n = document.createElement('span'); n.className = 'pcount'; n.textContent = `${BOOK.cur + 1} / ${BOOK.pages.length}`; pbEl.appendChild(n);
}
function tabMenu(i, e) {
  closeMenus();
  const items = [
    { t: '이 페이지로 가기', cmd: { en: () => i !== BOOK.cur, run: () => switchPage(i) } },
    { t: '이름 바꾸기', cmd: { en: () => true, run: () => renamePage(i) } },
    { t: '복제', cmd: { en: () => true, run: () => { switchPage(i); addPage(true); } } }, SEP,
    { t: '왼쪽으로 옮기기', cmd: { en: () => i > 0, run: () => movePage(i, -1) } },
    { t: '오른쪽으로 옮기기', cmd: { en: () => i < BOOK.pages.length - 1, run: () => movePage(i, 1) } }, SEP,
    { t: '새 페이지', cmd: { en: () => true, run: () => addPage() } },
    { t: '삭제', cmd: { en: () => BOOK.pages.length > 1, run: () => deletePage(i) } },
  ];
  renderItems(items, ctxEl); ctxEl.hidden = false;
  const hr = host.getBoundingClientRect(); ctxEl.style.left = Math.min(e.clientX - hr.left, hr.width - 230) + 'px'; ctxEl.style.top = Math.max(4, e.clientY - hr.top - ctxEl.offsetHeight) + 'px';
}
pbEl.addEventListener('wheel', e => { pbEl.scrollLeft += e.deltaY; }, { passive: true });

/* --- 문서 불러오기·저장 --- */
function loadBook(data, name) {
  let pages, tools = [], cur = 0;
  if (data && data.pages) { pages = data.pages.map(p => ({ title: p.title, doc: Object.assign(newDoc(), p.doc), undo: [], redo: [], snap: null })); tools = data.tools || []; cur = data.cur || 0; }
  else if (data && data.objs) { pages = [{ title: '페이지 1', doc: Object.assign(newDoc(), data), undo: [], redo: [], snap: null }]; tools = data.tools || []; }
  else pages = [newPage('페이지 1')];
  if (!pages.length) pages = [newPage('페이지 1')];
  BOOK = { name: name || (data && data.name) || '제목없음1', pages, cur: 0, tools };
  custState = null; fileHandle = null;
  enterPage(Math.min(cur, pages.length - 1));
}
function newSketch() {
  if (BOOK.pages.some(p => p.doc.objs.length) && !confirm('현재 문서(모든 페이지)를 닫고 새로 시작할까요? 저장하지 않은 내용은 사라집니다.')) return;
  const tools = BOOK.tools; loadBook(null); BOOK.tools = tools; D.tools = tools; autosave();
}
let fileHandle = null;
async function saveFile(as) {
  stashPage(); const data = JSON.stringify(bookData());
  if (window.showSaveFilePicker) {
    try {
      if (as || !fileHandle) fileHandle = await showSaveFilePicker({ suggestedName: BOOK.name.replace(/\.wgsp$/, '') + '.wgsp', types: [{ description: '웹 스케치패드 문서', accept: { 'application/json': ['.wgsp'] } }] });
      const w = await fileHandle.createWritable(); await w.write(data); await w.close();
      BOOK.name = fileHandle.name.replace(/\.wgsp$/, ''); updateTitle(); DIRTY = false; flash('저장했습니다: ' + fileHandle.name + ` (페이지 ${BOOK.pages.length}개)`); return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = BOOK.name + '.wgsp'; a.click(); DIRTY = false; flash('내려받기 폴더에 저장했습니다.');
}
function openFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.wgsp,.json,.gsp';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (/\.gsp$/i.test(f.name)) { alertBox('GSP5의 .gsp 파일은 형식이 공개되어 있지 않아 직접 열 수 없습니다. GSP5에서 작도를 다시 만들어 .wgsp로 저장해 주세요.'); return; }
    try { const d = JSON.parse(await f.text()); if (!d.objs && !d.pages) throw new Error(); loadBook(d, f.name.replace(/\.(wgsp|json)$/i, '')); autosave(); }
    catch (e) { alertBox('이 파일을 열 수 없습니다.'); }
  };
  inp.click();
}
function updateTitle() { const t = BOOK.pages.length > 1 ? `${BOOK.name} : ${pageTitle()}` : BOOK.name; document.title = `웹 스케치패드 - [${t}]`; document.getElementById('docname').textContent = `[${t}]`; }

/* --- 시작 --- */
function init() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem('webgsp.book') || 'null') || JSON.parse(localStorage.getItem('webgsp.doc') || 'null'); } catch (e) { }
  buildMenubar(); buildToolbox();
  loadBook(d);
  resize(); kick(); status(toolHint());
}
