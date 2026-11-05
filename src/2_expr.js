/* ===================== 2. 수식 (계산기·함수·미분) ===================== */
/* AST: {n:'num',v} {n:'x'} {n:'ref',i} {n:'call',f,a} {n:'fref',i,a} {n:'neg',a} {n:'bin',op,a,b} */
const FUNCS = ['sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'ln', 'log', 'exp', 'sgn', 'round', 'trunc'];
const FUNC_ALIAS = { asin: 'arcsin', acos: 'arccos', atan: 'arctan' };
/* resolve(name) -> {kind:'ref'|'fref', id} | null */
function parseExpr(src, resolve, allowX) {
  let i = 0; const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/·/g, '*').replace(/²/g, '^2').replace(/³/g, '^3');
  const refs = []; const refIdx = id => { let k = refs.indexOf(id); if (k < 0) { refs.push(id); k = refs.length - 1; } return k; };
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const err = m => { throw new Error(m || '수식을 이해할 수 없습니다'); };
  function primary() {
    ws(); const c = s[i];
    if (c === undefined) err('식이 끝나지 않았습니다');
    if (c === '(') { i++; const e = expr(); ws(); if (s[i] !== ')') err('닫는 괄호가 없습니다'); i++; return e; }
    if (c === '|') { i++; const e = expr(); ws(); if (s[i] !== '|') err('| 가 닫히지 않았습니다'); i++; return { n: 'call', f: 'abs', a: e }; }
    if (c === '[') { const j = s.indexOf(']', i); if (j < 0) err(); const name = s.slice(i + 1, j); i = j + 1; const r = resolve(name); if (!r) err('"' + name + '" 값을 찾을 수 없습니다'); if (r.kind === 'fref') { ws(); if (s[i] !== '(') err(); i++; const a = expr(); ws(); if (s[i] !== ')') err(); i++; return { n: 'fref', i: refIdx(r.id), a }; } return { n: 'ref', i: refIdx(r.id) }; }
    if (/[0-9.]/.test(c)) { const m = /^(\d*\.?\d+(?:e[+-]?\d+)?|\d+\.)/i.exec(s.slice(i)); if (!m) err(); i += m[0].length; const v = parseFloat(m[0]); if (s[i] === '°') { i++; return { n: 'num', v: (typeof D !== 'undefined' && D && D.prefs.angUnit === 'rad') ? v * PI / 180 : v, deg: 1 }; } return { n: 'num', v }; }
    if (c === 'π') { i++; return { n: 'num', v: PI, pi: 1 }; }
    if (/[A-Za-z_ㄱ-힝]/.test(c)) {
      const m = /^[A-Za-z_ㄱ-힝][A-Za-z0-9_₀-₉'ㄱ-힝]*/.exec(s.slice(i)); let w = m[0];
      // 가장 긴 함수명 접두
      const fn = FUNCS.slice().sort((a, b) => b.length - a.length).find(f => w.toLowerCase().startsWith(f));
      if (fn) { i += fn.length; const a = primaryOrPow(); return { n: 'call', f: FUNC_ALIAS[fn] || fn, a }; }
      if (w === 'pi') { i += 2; return { n: 'num', v: PI, pi: 1 }; }
      if (w === 'e' ) { i += 1; return { n: 'num', v: Math.E, e: 1 }; }
      // 이름(매개변수, 함수)
      for (let L = w.length; L > 0; L--) { const r = resolve(w.slice(0, L)); if (r) { i += L; if (r.kind === 'fref') { ws(); if (s[i] !== '(') err('함수 ' + w.slice(0, L) + ' 뒤에 괄호가 필요합니다'); i++; const a = expr(); ws(); if (s[i] !== ')') err(); i++; return { n: 'fref', i: refIdx(r.id), a }; } return { n: 'ref', i: refIdx(r.id) }; } }
      if (allowX && w[0] === 'x') { i++; return { n: 'x' }; }
      err('"' + w + '"을(를) 알 수 없습니다');
    }
    err('"' + c + '"을(를) 알 수 없습니다');
  }
  function primaryOrPow() { ws(); if (s[i] === '(') return primary(); const p = primary(); return p; }
  function power() { let b = primary(); ws(); if (s[i] === '^') { i++; ws(); const sign = s[i] === '-' ? (i++, -1) : 1; let e = power(); if (sign < 0) e = { n: 'neg', a: e }; return { n: 'bin', op: '^', a: b, b: e }; } return b; }
  function unary() { ws(); if (s[i] === '-') { i++; return { n: 'neg', a: unary() }; } if (s[i] === '+') { i++; return unary(); } return power(); }
  function term() {
    let a = unary();
    for (;;) { ws(); const c = s[i];
      if (c === '*' || c === '/') { i++; a = { n: 'bin', op: c, a, b: unary() }; }
      else if (c !== undefined && /[0-9.(\[πA-Za-z_|ㄱ-힝]/.test(c) && c !== '|') { a = { n: 'bin', op: '*', a, b: power() }; }
      else return a; }
  }
  function expr() { let a = term(); for (;;) { ws(); const c = s[i]; if (c === '+' || c === '-') { i++; a = { n: 'bin', op: c, a, b: term() }; } else return a; } }
  const ast = expr(); ws(); if (i < s.length) err('"' + s.slice(i) + '" 부분을 이해할 수 없습니다');
  return { ast, refs };
}
/* 평가: env = {x, R:[values], F:[fns], deg:bool} */
function evalAst(n, env) {
  switch (n.n) {
    case 'num': return n.v;
    case 'x': return env.x;
    case 'ref': return env.R[n.i];
    case 'fref': { const f = env.F[n.i]; return f ? f(evalAst(n.a, env)) : NaN; }
    case 'neg': return -evalAst(n.a, env);
    case 'bin': { const a = evalAst(n.a, env), b = evalAst(n.b, env);
      switch (n.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b; case '^': return powR(a, b); } }
    case 'call': { const a = evalAst(n.a, env), k = env.deg && n.angArg ? PI / 180 : 1, ik = env.deg && n.angOut ? 180 / PI : 1;
      switch (n.f) {
        case 'sin': return Math.sin(a * k); case 'cos': return Math.cos(a * k); case 'tan': return Math.tan(a * k);
        case 'arcsin': return Math.asin(a) * ik; case 'arccos': return Math.acos(a) * ik; case 'arctan': return Math.atan(a) * ik;
        case 'sqrt': return Math.sqrt(a); case 'abs': return Math.abs(a); case 'ln': return Math.log(a); case 'log': return Math.log10(a);
        case 'exp': return Math.exp(a); case 'sgn': return Math.sign(a); case 'round': return Math.round(a); case 'trunc': return Math.trunc(a);
      } }
  }
  return NaN;
}
function powR(a, b) { if (a < 0 && !Number.isInteger(b)) { const r = Math.round(1 / b); if (Math.abs(1 / b - r) < 1e-9 && r % 2 === 1) return -Math.pow(-a, b); } return Math.pow(a, b); }
/* 단위 차원 추론: dims {L,A} */
const DIM0 = { L: 0, A: 0 };
function dimOf(n, D) {
  switch (n.n) {
    case 'num': return n.deg ? { L: 0, A: 1 } : DIM0;
    case 'x': return DIM0;
    case 'ref': return D[n.i] || DIM0;
    case 'fref': return DIM0;
    case 'neg': return dimOf(n.a, D);
    case 'bin': { const a = dimOf(n.a, D), b = dimOf(n.b, D);
      if (n.op === '+' || n.op === '-') return (a.L === b.L && a.A === b.A) ? a : (isZ(a) ? b : isZ(b) ? a : DIM0);
      if (n.op === '*') return { L: a.L + b.L, A: a.A + b.A };
      if (n.op === '/') return { L: a.L - b.L, A: a.A - b.A };
      if (n.op === '^' && n.b.n === 'num') return { L: a.L * n.b.v, A: a.A * n.b.v };
      return DIM0; }
    case 'call': { const a = dimOf(n.a, D); n.angArg = a.A === 1; n.angOut = false; if (n.f === 'sqrt') return { L: a.L / 2, A: a.A / 2 }; if (n.f === 'abs') return a; if (/^arc/.test(n.f)) { n.angOut = true; return { L: 0, A: 1 }; } return DIM0; }
  }
  return DIM0;
}
const isZ = d => !d.L && !d.A;
/* 기호 미분 */
const N = v => ({ n: 'num', v }), B = (op, a, b) => ({ n: 'bin', op, a, b }), C = (f, a) => ({ n: 'call', f, a });
function deriv(n, inline) {
  switch (n.n) {
    case 'num': case 'ref': return N(0);
    case 'x': return N(1);
    case 'neg': return { n: 'neg', a: deriv(n.a, inline) };
    case 'fref': { const body = inline(n); if (!body) return N(NaN); return deriv(body, inline); }
    case 'bin': { const a = n.a, b = n.b, da = deriv(a, inline), db = deriv(b, inline);
      switch (n.op) {
        case '+': case '-': return B(n.op, da, db);
        case '*': return B('+', B('*', da, b), B('*', a, db));
        case '/': if (!hasX(b, inline)) return B('/', da, b); return B('/', B('-', B('*', da, b), B('*', a, db)), B('^', b, N(2)));
        case '^': if (!hasX(b, inline)) return B('*', B('*', b, B('^', a, B('-', b, N(1)))), da);
          if (!hasX(a, inline)) return B('*', B('*', n, C('ln', a)), db);
          return B('*', n, B('+', B('*', db, C('ln', a)), B('/', B('*', b, da), a)));
      } }
    case 'call': { const a = n.a, da = deriv(a, inline); let g;
      switch (n.f) {
        case 'sin': g = C('cos', a); break; case 'cos': g = { n: 'neg', a: C('sin', a) }; break;
        case 'tan': g = B('/', N(1), B('^', C('cos', a), N(2))); break;
        case 'arcsin': g = B('/', N(1), C('sqrt', B('-', N(1), B('^', a, N(2))))); break;
        case 'arccos': g = { n: 'neg', a: B('/', N(1), C('sqrt', B('-', N(1), B('^', a, N(2))))) }; break;
        case 'arctan': g = B('/', N(1), B('+', N(1), B('^', a, N(2)))); break;
        case 'sqrt': g = B('/', N(1), B('*', N(2), C('sqrt', a))); break;
        case 'abs': g = C('sgn', a); break; case 'ln': g = B('/', N(1), a); break;
        case 'log': g = B('/', N(1), B('*', a, C('ln', N(10)))); break; case 'exp': g = C('exp', a); break;
        default: g = N(0);
      }
      return B('*', g, da); }
  }
  return N(0);
}
function hasX(n, inline) { if (n.n === 'x') return true; if (n.n === 'fref') return true; return ['a', 'b'].some(k => n[k] && typeof n[k] === 'object' && hasX(n[k], inline)); }
function simp(n) {
  if (n.n === 'neg') { const a = simp(n.a); if (a.n === 'num') return N(-a.v); if (a.n === 'neg') return a.a; return { n: 'neg', a }; }
  if (n.n === 'call') return { ...n, a: simp(n.a) };
  if (n.n === 'fref') return { ...n, a: simp(n.a) };
  if (n.n !== 'bin') return n;
  const a = simp(n.a), b = simp(n.b), an = a.n === 'num', bn = b.n === 'num';
  if (an && bn && !a.pi && !b.pi) { const v = evalAst(B(n.op, a, b), {}); if (isFinite(v)) return N(v); }
  switch (n.op) {
    case '+': if (an && a.v === 0) return b; if (bn && b.v === 0) return a; if (b.n === 'neg') return simp(B('-', a, b.a)); break;
    case '-': if (bn && b.v === 0) return a; if (an && a.v === 0) return simp({ n: 'neg', a: b }); break;
    case '*': if ((an && a.v === 0) || (bn && b.v === 0)) return N(0); if (an && a.v === 1) return b; if (bn && b.v === 1) return a;
      if (bn && !an) return simp(B('*', b, a));
      if (an && b.n === 'bin' && b.op === '*' && b.a.n === 'num') return simp(B('*', N(a.v * b.a.v), b.b));
      if (a.n === 'neg') return simp({ n: 'neg', a: B('*', a.a, b) }); if (b.n === 'neg') return simp({ n: 'neg', a: B('*', a, b.a) });
      break;
    case '/': if (an && a.v === 0) return N(0); if (bn && b.v === 1) return a;
      if (bn && !b.pi && a.n === 'bin' && a.op === '*' && a.a.n === 'num' && !a.a.pi) return simp(B('*', N(a.a.v / b.v), a.b));
      if (bn && !b.pi && a.n === 'neg') return simp({ n: 'neg', a: B('/', a.a, b) });
      break;
    case '^': if (bn && b.v === 0) return N(1); if (bn && b.v === 1) return a; break;
  }
  return B(n.op, a, b);
}
/* 문자열로 */
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
function fmtNum(v, d = 4) { if (!isFinite(v)) return '정의되지 않음'; const r = +v.toFixed(d); return String(r); }
function astStr(n, names, p = 0) {
  switch (n.n) {
    case 'num': return n.pi ? 'π' : n.e ? 'e' : fmtNum(n.v) + (n.deg ? '°' : '');
    case 'x': return 'x';
    case 'ref': return names.ref(n.i);
    case 'fref': return names.fref(n.i) + '(' + astStr(n.a, names) + ')';
    case 'neg': { const s = '−' + astStr(n.a, names, 3); return p > 2 ? '(' + s + ')' : s; }
    case 'call': return n.f + '(' + astStr(n.a, names) + ')';
    case 'bin': {
      const q = PREC[n.op];
      if (n.op === '^' && n.b.n === 'num' && Number.isInteger(n.b.v) && n.b.v >= 0 && n.b.v < 100) {
        const s = astStr(n.a, names, 5) + String(n.b.v).split('').map(c => SUP[c]).join(''); return s;
      }
      let A = astStr(n.a, names, q), Bs = astStr(n.b, names, q + (n.op === '-' || n.op === '/' ? 1 : 0));
      let s;
      if (n.op === '*') { const implicit = n.a.n === 'num' && (n.b.n === 'x' || n.b.n === 'call' || n.b.n === 'ref' || n.b.n === 'fref' || (n.b.n === 'bin' && n.b.op === '^')); s = A + (implicit ? '' : '·') + Bs; }
      else if (n.op === '^') s = A + '^' + (n.b.n === 'num' || n.b.n === 'x' ? Bs : '(' + astStr(n.b, names) + ')');
      else s = A + ' ' + (n.op === '-' ? '−' : n.op === '/' ? '/' : '+') + ' ' + Bs;
      return q < p ? '(' + s + ')' : s;
    }
  }
  return '?';
}
/* 편집용 문자열(다시 파싱 가능) */
function astSrc(n, names) {
  switch (n.n) {
    case 'num': return n.pi ? 'π' : n.e ? 'e' : String(+n.v.toPrecision(12));
    case 'x': return 'x';
    case 'ref': return '[' + names.ref(n.i) + ']';
    case 'fref': return '[' + names.fref(n.i) + '](' + astSrc(n.a, names) + ')';
    case 'neg': return '-(' + astSrc(n.a, names) + ')';
    case 'call': return n.f + '(' + astSrc(n.a, names) + ')';
    case 'bin': return '(' + astSrc(n.a, names) + ')' + n.op + '(' + astSrc(n.b, names) + ')';
  }
}
function astSrcPretty(n, names) { // 괄호 최소화
  const go = (n, p) => {
    switch (n.n) {
      case 'num': return n.pi ? 'π' : n.e ? 'e' : String(+n.v.toPrecision(12)) + (n.deg ? '°' : '');
      case 'x': return 'x';
      case 'ref': return '[' + names.ref(n.i) + ']';
      case 'fref': return '[' + names.fref(n.i) + '](' + go(n.a, 0) + ')';
      case 'neg': { const s = '-' + go(n.a, 3); return p > 2 ? '(' + s + ')' : s; }
      case 'call': return n.f + '(' + go(n.a, 0) + ')';
      case 'bin': { const q = PREC[n.op]; const s = go(n.a, n.op === '^' ? 5 : q) + n.op + go(n.b, q + (n.op === '-' || n.op === '/' || n.op === '^' ? 1 : 0)); return q < p ? '(' + s + ')' : s; }
    }
  };
  return go(n, 0);
}
