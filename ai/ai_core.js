/* ai_core.js — CPU共通基盤（デッキ別AIはこの上に ai_dragapult.js / ai_rayquaza.js として載る）
   ■ 守っているルール：AIは「そのプレイヤーに見える情報」だけで判断する
     ・受け取るのは cpuView() が作ったJSON複製のみ（相手の手札・山札・サイドの中身、山札の順序は含まれない）
     ・自分の山札/サイドの中身は「デッキリスト − 見えているカード」で推定（信念追跡）。山札を初めて全確認した時に
       山札とサイドの内訳が確定する（ハイパーボール等）。以後はサイドから取ったカードで更新
     ・相手はデッキタイプ(oppType)だけ既知。中身は盤面・トラッシュなど公開領域から推測
   このファイルは盤面(P,G,...)のグローバルを一切参照しない（sim/headless.js が空の世界で実行して確認している） */
(function (root) {
  'use strict';
  const R = root.CPUAI || (root.CPUAI = {});
  R.strategies = {}; R.tuned = R.tuned || {};
  R.register = (name, def) => { def.name = name; R.strategies[name] = def; };
  R.detect = cards => { for (const n in R.strategies) { const s = R.strategies[n]; if (s.detect && s.detect(cards)) return n; } return null; };
  R.create = (name, o) => { const st = R.strategies[name]; return st ? new Controller(st, o || {}) : null; };

  /* ---------- 小道具 ---------- */
  const nrm = n => String(n || '').replace(/\(ACE SPEC\)$/, '');
  const isEx = n => /ex$/.test(n);
  const prizeOf = n => /VMAX$|^メガ.*ex$/.test(n) ? 3 : /(ex|V|VSTAR)$/.test(n) ? 2 : 1;
  const BE = /^基本(.)エネルギー/;
  const payable = (cost, eu) => { const es = eu.slice(); for (const t of cost.filter(x => x !== '無')) { let i = es.indexOf(t); if (i < 0) i = es.indexOf('*'); if (i < 0) return false; es.splice(i, 1); } return es.length >= cost.filter(x => x === '無').length; };
  const short = (cost, eu) => { const es = eu.slice(); let s = 0; for (const t of cost.filter(x => x !== '無')) { let i = es.indexOf(t); if (i < 0) i = es.indexOf('*'); if (i < 0) s++; else es.splice(i, 1); } return s + Math.max(0, cost.filter(x => x === '無').length - es.length); };
  const rng = seed => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const sumEu = b => Object.values(b).reduce((s, p) => s + p.eu.length, 0);
  const cnt = (a, f) => a.reduce((s, x) => s + (f(x) ? 1 : 0), 0);
  const best = (a, f) => { let b = null, bs = -1e9; for (const x of a) { const s = f(x); if (s > bs) { bs = s; b = x; } } return b; };
  /* 技ごとの基本ダメージ（数値で表せない技の計算式。カード効果＝公開情報） */
  const FORM = {
    'マシンガンコンボ': () => 250, 'ストームエメラルダ': (cx, sb) => 50 * (sumEu(sb) + cx._xe),
    'ユニオンビート': (cx, sb) => 30 * (Object.keys(sb).length - 1), 'ぎゃっきょうテール': (cx, sb, db) => 60 * cnt(Object.values(db), p => isEx(p.name)),
    'きあいタックル': (cx, sb, db, dk) => 90 + (cx.stage(db[dk]) === '1進化' ? 90 : 0), 'とうしのつばさ': (cx, sb, db, dk) => 20 + (isEx(db[dk].name) ? 90 : 0),
  };
  R.util = { nrm, isEx, prizeOf, BE, payable, short, rng, sumEu, cnt, best, FORM };

  /* ---------- 判断用コンテキスト（1回の判断ごとに作る） ---------- */
  class Cx {
    constructor(C, v, q) {
      this.C = C; this.v = v; this.q = q; this.P = C.prm; this.T = v.turn; this.me = v.self; this.op = v.opp || null; this.fl = v.fl;
      this.myB = v.self.board; this.opB = this.op ? this.op.board : {}; this.hand = v.self.hand; this.lg = v.lg || null; this._xe = 0; this.st = C.st;
    }
    D(x) { return x ? this.C.cd[x.mk] || null : null; }
    stage(x) { const d = this.D(x); return d ? d.st : 'たね'; }
    keys() { return Object.keys(this.myB); }
    bench() { return this.keys().filter(k => k !== 'battle'); }
    opBench() { return Object.keys(this.opB).filter(k => k !== 'battle'); }
    rem(x) { return x.hp ? x.hp - x.dm : 999; }
    pz(x) { return prizeOf(x.name); }
    card(u) { return this.hand.find(c => c.u === u); }
    n(name) { return cnt(this.hand, c => nrm(c.name) === name); }
    has(name) { return this.n(name) > 0; }
    inPlay(name) { return this.keys().filter(k => nrm(this.myB[k].name) === name); }
    inPlayN(name) { return this.inPlay(name).length; }
    first() { return this.v.first === this.v.me; }
    myTurnNo() { return this.first() ? (this.T + 1) / 2 : this.T / 2; }
    get eneHand() { return this.hand.filter(c => c.t === 'ene'); }
    /* --- 信念（自分の山札・サイド） --- */
    expDeck(name) { const a = this.C.unacc[name] || 0; if (!a) return 0; const S = this.me; if (this.C.prz) return Math.max(0, a - (this.C.prz[name] || 0)); return a * S.deckN / Math.max(1, S.deckN + S.prizeN); }
    pDeck(name) { const a = this.C.unacc[name] || 0; if (!a) return 0; const S = this.me; if (this.C.prz) return a - (this.C.prz[name] || 0) > 0 ? 1 : 0; const N = S.deckN + S.prizeN; let all = 1; for (let j = 0; j < a; j++) all *= Math.max(0, S.prizeN - j) / Math.max(1, N - j); return 1 - all; }
    deckKnown() { return !!this.C.prz; }
    pDraw(name, n) { const e = this.expDeck(name), D = Math.max(1, this.me.deckN); return 1 - Math.pow(Math.max(0, 1 - e / D), n); }
    /* --- 技とダメージ --- */
    atks(p) { const d = this.D(p); return d && d.at ? d.at : []; }
    dmg(sb, k, atk, db, dk, o) {
      o = o || {}; const a = sb[k], d = db[dk]; if (!a || !d) return 0; const A = this.D(a), Dd = this.D(d) || {}, turn = o.turn || this.T;
      let b = FORM[atk.n] ? FORM[atk.n](this, sb, k, db, dk) : (parseInt(String(atk.dt).replace(/[^\d]/g, '')) || 0);
      if (o.lo && atk.n === 'マシンガンコンボ') b = 200; if (b <= 0) return 0;
      if (dk !== 'battle' && (Dd.tera || Dd.bnc)) return 0;
      if (!o.ign && ((d.sh === turn && this.stage(a) === 'たね' && A && A.type !== '無') || d.dg === turn)) return 0;
      if (dk === 'battle') { if (o.plus30 && /(ex|V)$/.test(d.name)) b += 30; if (Dd.weak && A && Dd.weak === A.type) b *= 2; if (Dd.res && A && Dd.res === A.type) b -= 30; }
      return Math.max(0, b);
    }
    /* 自分のポケモン k の、今使える技の最大ダメージ（対 相手バトル場）。extra=追加エネルギー単位 */
    myBest(k, extra, lo) { const p = this.myB[k], d = this.opB.battle; if (!p || !d) return { d: 0, a: null }; let r = { d: 0, a: null };
      for (const a of this.atks(p)) if (payable(a.cost, p.eu.concat(extra || []))) { const x = this.dmg(this.myB, k, a, this.opB, 'battle', { lo, plus30: this.fl.plus30 }); if (x > r.d || !r.a) r = { d: x, a }; } return r; }
    canAtkNow(k) { const p = this.myB[k]; return !!p && !(p.na === this.T); }
    /* 相手が次の番に自分の dk へ与えうる最大ダメージ（xe=1: エネルギー1枚追加を見込む） */
    threat(dk, xe) {
      xe = xe === undefined ? 1 : xe; let act = 0, any = 0; if (!this.op) return { act, any };
      for (const k in this.opB) { const p = this.opB[k], Dd = this.D(p); if (!Dd || !Dd.at) continue;
        for (const a of Dd.at) { if (!payable(a.cost, p.eu.concat(xe ? ['*'] : []))) continue; this._xe = xe;
          const d = this.dmg(this.opB, k, a, this.myB, dk, { turn: this.T + 1 }); this._xe = 0; if (k === 'battle') act = Math.max(act, d); any = Math.max(any, d); } }
      return { act, any };
    }
    /* 「次の番にこのポケモンで攻撃できる度合い」0〜 (今払える=大、あと1個=中) */
    readiness(k) {
      const p = this.myB[k]; if (!p) return 0; let s = 0;
      for (const a of this.atks(p)) { const sh = short(a.cost, p.eu); const d = Math.min(300, this.dmg(this.myB, k, a, this.opB, 'battle', {}) || 0);
        if (sh === 0) s = Math.max(s, 100 + d / 3); else if (sh === 1) s = Math.max(s, 55 + d / 6); else s = Math.max(s, 25 - sh * 4); }
      return s;
    }
    /* ボスの指令：相手ベンチのどれを呼ぶと今のバトルポケモンで倒せるか */
    gust() {
      const me = this.myB.battle; if (!me || this.T === 1) return null; let r = null;
      for (const dk of this.opBench()) { const d = this.opB[dk], tmp = Object.assign({}, this.opB, { battle: d }); let bd = 0; // ボスで呼ぶと dk がバトル場に来る
        for (const a of this.atks(me)) if (payable(a.cost, me.eu) && !me.na) bd = Math.max(bd, this.dmg(this.myB, 'battle', a, tmp, 'battle', { lo: 1, plus30: this.fl.plus30 }) || 0);
        const ko = bd >= this.rem(d), sc = (ko ? 1000 + this.pz(d) * 300 + (this.me.prizeN <= this.pz(d) ? 5000 : 0) : 0) + this.pz(d) * 30 - this.rem(d) / 10; if (!r || sc > r.sc) r = { k: dk, ko, sc, d: bd, pz: this.pz(d) }; }
      return r;
    }
    /* 今の技で相手バトルポケモンを倒せるか */
    canKoActive() { const me = this.myB.battle, d = this.opB.battle; if (!me || !d || this.T === 1 || me.na === this.T) return 0; const b = this.myBest('battle', null, 1); return b.d >= this.rem(d) ? this.pz(d) : 0; }
  }

  /* ---------- コントローラ ---------- */
  class Controller {
    constructor(st, o) {
      this.st = st; this.me = o.me; this.oppType = o.opp || 'unknown';
      this.prm = Object.assign({}, st.defaults, (R.tuned || {})[st.name] || {}, o.params || {});
      this.cd = {}; this.tried = new Set(); this.turn = -1; this.prz = null; this.unacc = {}; this.rand = rng((o.seed || 7) + this.me); this.note = {};
    }
    ctx(v, q) {
      for (const k in v.cd) if (v.cd[k]) this.cd[k] = v.cd[k];
      if (v.deck) this.deck = v.deck; // デッキリスト（自分の分）は最初の1回だけ届く
      // 信念：デッキリスト − 見えている自分のカード ＝ 山札∪サイド
      const m = {}, add = (n, k) => { n = nrm(n); m[n] = (m[n] || 0) + k; };
      for (const c of this.deck) add(c.name, c.n);
      const S = v.self; for (const c of S.hand) add(c.name, -1); for (const c of (S.stage || [])) add(c.name, -1); // 使用待機中のカードも見えている for (const c of S.trash) add(c.name, -1);
      for (const k in S.board) { const p = S.board[k]; add(p.name, -1); p.en.forEach(n => add(n, -1)); p.tl.forEach(n => add(n, -1)); p.un.forEach(n => add(n, -1)); }
      if (v.stadium && v.stadium.own === v.me) add(v.stadium.name, -1);
      for (const n in m) if (m[n] < 0) m[n] = 0; this.unacc = m;
      if (v.pz && this.prz) for (const n of v.pz) { const x = nrm(n); if (this.prz[x] > 0) this.prz[x]--; }
      if (v.turn !== this.turn) { this.turn = v.turn; this.tried = new Set(); this.note = {}; }
      return new Cx(this, v, q);
    }
    order(v) { this.ctx(v); return this.prm.first >= 0.5; }
    setup(v) {
      const cx = this.ctx(v), bs = v.self.hand.filter(c => c.t === 'pke' && cx.D(c) && cx.D(c).st === 'たね');
      if (!bs.length) return { mull: true };
      return this.st.setup(cx, bs);
    }
    decide(v) {
      const cx = this.ctx(v), C = []; gen(cx, C);
      C.sort((a, b) => b.s - a.s);
      const low = cx.me.deckN <= (this.prm.deckMin === undefined ? 3 : this.prm.deckMin);   // 山札0枚のまま次の自分の番を迎えると敗北
      for (const c of C) if (c.s > 0 && !this.tried.has(c.key) && !(low && drawy(cx, c.a))) { this.tried.add(c.key); return c.a; }
      const at = pickAttack(cx); return at ? { t: 'attack', n: at.n } : { t: 'end' };
    }
    result() { return null; }
    pk(v, q) {
      const cx = this.ctx(v, q);
      if (q.kind === 'deck') { // 山札を全確認した瞬間：山札の内訳が確定し、サイドの内訳も確定する
        const pool = {}; q.pool.forEach(c => { const n = nrm(c.name); pool[n] = (pool[n] || 0) + 1; }); this.prz = {};
        for (const n in this.unacc) this.prz[n] = Math.max(0, this.unacc[n] - (pool[n] || 0));
      }
      const kind = route(PKR, q.title), h = (this.st.pkH && this.st.pkH[kind]) || PKH[kind];
      let r = h ? h(cx, q) : null; if (!r) r = q.pool.filter(c => c.ok).slice(0, Math.max(q.min, Math.min(q.n, q.min))).map(c => c.u);
      return r;
    }
    ask(v, q) {
      const cx = this.ctx(v, q), kind = route(ASKR, q.title), h = (this.st.askH && this.st.askH[kind]) || ASKH[kind];
      let r = h ? h(cx, q) : undefined; if (r === undefined) r = q.ks[0]; return r;
    }
    menu(v, q) {
      const cx = this.ctx(v, q), h = this.st.menuH || {}; let r;
      if (h.any) r = h.any(cx, q);
      if (r === undefined) r = coreMenu(cx, q);
      return r;
    }
  }
  const DRAWY = /^(リーリエの決心|ジャッジマン|アンフェアスタンプ|おつかいダッシュ|さかてにとる|にげあしドロー|ていさつしれい|博士の研究|ヒカリ|トウコ)/;
  function drawy(cx, a) { let n = ''; if (a.t === 'play') { const c = cx.card(a.u); n = c ? nrm(c.name) : ''; } else if (a.t === 'ab') { const p = cx.myB[a.k], d = p && cx.D(p); n = d && d.ab ? d.ab.n : ''; } return DRAWY.test(n); }
  const route = (tbl, t) => { for (const [re, k] of tbl) if (re.test(t)) return k; return ''; };

  /* ---------- 行動の生成（共通部分）。デッキ別の判断は st.* フック ---------- */
  function gen(cx, C) {
    const st = cx.st, P = cx.P, lg = cx.lg, push = (key, s, a) => { if (s > 0) C.push({ key, s, a }); };
    for (const e of lg.evo) { const c = cx.card(e.u), s = st.evoScore ? st.evoScore(cx, c, e.k) : undefined; push('evo' + e.u + e.k, s === undefined ? P.sEvo : s, { t: 'play', u: e.u, k: e.k }); }
    const nb = cx.bench().length;
    for (const u of lg.bench) { const c = cx.card(u); let s = st.benchScore ? st.benchScore(cx, c, nb) : P.sBench; if (nb >= P.benchCap && !(st.benchForce && st.benchForce(cx, c))) s = 0; push('bn' + u, s, { t: 'play', u, k: 'bench' }); }
    for (const b of lg.abil) { const s = st.abScore ? st.abScore(cx, b, cx.myB[b.k]) : P.sAbil; push('ab' + b.u, s === undefined ? P.sAbil : s, { t: 'ab', k: b.k, u: b.u }); }
    for (const u of lg.habs) { const c = cx.card(u), s = st.habScore ? st.habScore(cx, c) : 60; push('hab' + u, s, { t: 'hab', u }); }
    const seen = new Set();
    // エネルギー：最も良い（カード×つける先）を1つだけ候補にする
    let be = null;
    for (const c of cx.hand) if (c.t === 'ene' && lg.att[c.u] && lg.att[c.u].length && !seen.has(nrm(c.name))) { seen.add(nrm(c.name));
      for (const k of lg.att[c.u]) { let s = attachBase(cx, c, k); if (st.attachScore) { const t = st.attachScore(cx, c, k, s); if (t !== undefined) s = t; } if (!be || s > be.s) be = { s, u: c.u, k }; } }
    cx.attachBest = be;
    for (const c of cx.hand) {
      if (c.t === 'sup' && !lg.sup) continue; if (c.t === 'tr' && !lg.goods) continue;
      if (c.t === 'sup' || c.t === 'tr') { let s = st.trainerScore ? st.trainerScore(cx, c) : undefined; if (s === undefined) s = coreTrainer(cx, c); push('tr' + c.u, s || 0, { t: 'play', u: c.u }); }
      else if (c.t === 'sta' && lg.stad.includes(c.u)) { const s = st.stadiumScore ? st.stadiumScore(cx, c) : 0; push('st' + c.u, s || 0, { t: 'play', u: c.u }); }
    }
    if (be) push('en' + be.u, be.s, { t: 'play', u: be.u, k: be.k });
    for (const c of cx.hand) if (c.t === 'tool' && lg.att[c.u]) { let bt = null; for (const k of lg.att[c.u]) { const s = st.toolScore ? st.toolScore(cx, c, k) : 0; if (!bt || s > bt.s) bt = { s, k }; } if (bt) push('tl' + c.u, bt.s, { t: 'play', u: c.u, k: bt.k }); }
    if (lg.retreat) { const s = retreatScore(cx); push('retreat', s, { t: 'retreat' }); }
    if (st.extra) st.extra(cx, C, push);
  }
  /* エネルギーを付ける基本評価：その技が打てるようになるか、あと何個か */
  function attachBase(cx, c, k) {
    const p = cx.myB[k], P = cx.P, units = /^ネオアッパー/.test(c.name) ? (cx.stage(p) === '2進化' ? ['*', '*'] : ['無']) : [(c.name.match(BE) || [, '無'])[1]];
    let s = P.aBase; if (!cx.atks(p).length) return s * 0.3;
    let en = 0, prog = 0;
    for (const a of cx.atks(p)) { const b0 = payable(a.cost, p.eu), b1 = payable(a.cost, p.eu.concat(units)); const d = Math.min(300, cx.dmg(cx.myB, k, a, cx.opB, 'battle', {}) || 0);
      if (!b0 && b1) en = Math.max(en, (k === 'battle' && cx.canAtkNow('battle') && cx.T !== 1 ? P.aEnableNow : P.aEnableSoon) + d / 12);
      else if (!b1) prog = Math.max(prog, (short(a.cost, p.eu) - short(a.cost, p.eu.concat(units))) * P.aProg); }
    s += Math.max(en, prog); if (k === 'battle') s += P.aBattle;
    const th = cx.threat(k); if (th.act >= cx.rem(p) && k === 'battle' && !cx.myBest('battle').d) s -= P.aDoomed;
    return s;
  }
  function retreatScore(cx) {
    const P = cx.P, lg = cx.lg, at = cx.myB.battle; if (!at || !lg.retreat) return 0; if (cx.st.retreatScore) { const s = cx.st.retreatScore(cx); if (s !== undefined) return s; }
    const nowD = cx.canAtkNow('battle') && cx.T !== 1 ? cx.myBest('battle').d : 0; let bk = null, bs = 0;
    for (const k of lg.retreat.ks) { const b = cx.myBest(k).d; const sc = b - nowD - lg.retreat.cost * P.rEnergy; if (b > 0 && sc > bs) { bs = sc; bk = k; } }
    cx.C.note.retreatTo = bk; return bk && bs >= P.rMargin ? P.sRetreat + bs / 10 : 0;
  }
  /* ---------- 共通トレーナー ---------- */
  function coreTrainer(cx, c) {
    const n = nrm(c.name), P = cx.P, hs = cx.hand.length - 1, me = cx.me, op = cx.op;
    switch (n) {
      case 'ボスの指令': { const g = cx.gust(); if (!g || !g.ko) return 0; const ba = cx.canKoActive(); if (ba >= g.pz) return 0; return P.sBoss; }
      case 'ジャッジマン': return me.deckN > 6 && hs <= P.judgeMine && op.handN >= P.judgeOpp ? P.sJudge : 0;
      case 'リーリエの決心': return me.deckN > 8 ? Math.max(0, P.sLillie - hs * P.lillieHand) : 0;
      case 'ハイパーボール': return hs >= 3 ? P.sHyper : 0;
      case 'スペシャルレッドカード': return op.prizeN <= 3 && op.handN >= 4 ? P.sRed : 0;
      case 'スタジアム': return 0;
      default: return 0;
    }
  }
  function pickAttack(cx) {
    const lg = cx.lg, me = cx.myB.battle, d = cx.opB.battle; if (!me || !lg.atk.length) return null;
    let b = null;
    for (const a of lg.atk) { if (!a.ok) continue; const at = cx.atks(me).find(x => x.n === a.n); if (!at) continue;
      const dm = d ? cx.dmg(cx.myB, 'battle', at, cx.opB, 'battle', { plus30: cx.fl.plus30 }) : 0, lo = d ? cx.dmg(cx.myB, 'battle', at, cx.opB, 'battle', { lo: 1, plus30: cx.fl.plus30 }) : 0;
      const ko = d && lo >= cx.rem(d), koP = d && dm >= cx.rem(d);
      let s = dm + (ko ? 1000 + cx.pz(d) * 300 : koP ? 500 + cx.pz(d) * 150 : 0);
      const wins = ko && (cx.me.prizeN <= cx.pz(d) || Object.keys(cx.opB).length === 1);   // 勝利条件：サイドを取り切る／相手の場にポケモンがいなくなる
      if (cx.st.attackScore) { const t = cx.st.attackScore(cx, at, { dm, lo, ko, koP }); if (t !== undefined) s = t; }
      if (wins) s += 1e5;
      if (!b || s > b.s) b = { s, n: a.n }; }
    return b;
  }

  /* ---------- 選択プロンプト（山札サーチ・対象選択など） ---------- */
  const PKR = [[/トラッシュする手札を2枚/, 'discard2'], [/山札からポケモンを1枚選択/, 'searchPoke'], [/「ポケモンex」を3枚/, 'cyano'], [/タイプの異なる/, 'akaPair'], [/手札に加える1枚を選ぶ（残りを/, 'akaKeep'],
    [/山札から2枚選ぶ/, 'cipher'], [/山札の上4枚/, 'top4Ene'], [/山札からサポートを1枚/, 'searchSup'], [/好きなカードを2枚/, 'any2'], [/手札の基本炎エネルギー/, 'handFire'], [/山札から基本エネルギーを2枚まで/, 'lantern'],
    [/山札の上2枚/, 'top2'], [/ヨマワルを3枚まで/, 'revive'], [/HP70以下/, 'poffin'], [/ルールを持つポケモンを除く/, 'pad'], [/進化させる2進化/, 'candyEvo'], [/トラッシュからポケモンまたは基本エネルギー/, 'tanka'],
    [/山札から「(たね|1進化|2進化)ポケモン」/, 'hikari'], [/山札から進化ポケモン/, 'toukoEvo'], [/山札からエネルギーを1枚/, 'toukoEne'], [/トラッシュするエネルギーを1個選ぶ/, 'hammerEne'], [/トラッシュから基本エネルギーを2枚まで/, 'mayEne'],
    [/トラッシュするエネルギーを選択（/, 'retreatPay'], [/基本エネルギーを1個選択/, 'moveEne'], [/トラッシュから基本エネルギーを1枚選択/, 'trumpetEne'], [/山札にもどすエネルギー/, 'ret3'], [/手札にもどすエネルギー/, 'ret1']];
  const ASKR = [[/呼び出す相手/, 'boss'], [/バトル場に出すベンチポケモンを選んでください/, 'promote'], [/にげる：/, 'retreatTo'], [/入れ替えるベンチ/, 'swapIn'], [/つけ替える元/, 'moveSrc'], [/つけ替え先/, 'moveDst'],
    [/エネルギーをトラッシュする相手/, 'hammerTgt'], [/ダメカンをのせる相手のベンチ/, 'spread'], [/カースドボム/, 'curse'], [/ダメカンを取る/, 'adrenSrc'], [/ダメカンをのせる相手のポケモン/, 'adrenDst'], [/ベンチが5匹になるまで/, 'trim'],
    [/ダメージを与える相手/, 'snipe'], [/エネルギーをつけるポケモンを盤面から/, 'trumpetTgt'], [/つけるベンチのヒビキ/, 'hoohTgt'], [/エネルギーをつける2進化/, 'mayTgt'], [/つけるポケモン/, 'attachTgt'], [/進化させるたね/, 'candyTgt']];
  const pool = q => q.pool.filter(c => c.ok);
  const topBy = (arr, f, n) => arr.map(x => [x, f(x)]).sort((a, b) => b[1] - a[1]).slice(0, n).map(z => z[0]);
  const st_want = (cx, c) => cx.st.want ? cx.st.want(cx, c) : 30, st_junk = (cx, c) => cx.st.junk ? cx.st.junk(cx, c) : 30;
  const PKH = {
    discard2: (cx, q) => topBy(pool(q), c => -st_junk(cx, c), q.n).map(c => c.u),
    searchPoke: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
    cyano: (cx, q) => topBy(pool(q).filter(c => st_want(cx, c) >= cx.P.cyanoMin), c => st_want(cx, c), q.n).map(c => c.u),
    akaPair: (cx, q) => { const s = topBy(pool(q), c => st_want(cx, c), 9), o = []; const seen = new Set(); for (const c of s) if (!seen.has(c.name)) { seen.add(c.name); o.push(c.u); } return o.slice(0, 2); },
    akaKeep: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
    cipher: (cx, q) => topBy(pool(q), c => st_want(cx, c), 2).map(c => c.u),
    top4Ene: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
    searchSup: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
    any2: (cx, q) => topBy(pool(q), c => st_want(cx, c), 2).map(c => c.u),
    lantern: (cx, q) => topBy(pool(q), c => st_want(cx, c), 2).map(c => c.u),
    tanka: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
    retreatPay: (cx, q) => { const need = cx.lg && cx.lg.retreat ? cx.lg.retreat.cost : 1; const s = topBy(pool(q), c => -st_want(cx, c), 9), o = []; let u = 0; for (const c of s) { if (u >= need) break; o.push(c.u); u += /^ネオ/.test(c.name) ? 1 : 1; } return o; },
    trumpetEne: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
    ret3: (cx, q) => topBy(pool(q), c => -st_want(cx, c), 3).map(c => c.u), ret1: (cx, q) => topBy(pool(q), c => -st_want(cx, c), 1).map(c => c.u),
    hammerEne: (cx, q) => topBy(pool(q), c => st_want(cx, c), 1).map(c => c.u),
  };
  /* 盤面キーの選択：どれをバトル場に出すか等 */
  function promoteScore(cx, k) {
    const p = cx.myB[k], P = cx.P; if (!p) return -1e9; const th = cx.threat('battle', 1), r = cx.readiness(k), ko = th.act >= cx.rem(p);
    return r * P.pReady - (ko ? cx.pz(p) * P.pRisk + (cx.op && cx.op.prizeN <= cx.pz(p) ? 800 : 0) : 0) + Math.min(cx.rem(p), 300) / P.pHp + (cx.st.promoteAdj ? cx.st.promoteAdj(cx, k, p) : 0);
  }
  const ASKH = {
    boss: (cx, q) => { const g = cx.gust(); return g ? g.k : q.ks[0]; },
    promote: (cx, q) => best(q.ks, k => promoteScore(cx, k)),
    retreatTo: (cx, q) => (cx.C.note.retreatTo && q.ks.includes(cx.C.note.retreatTo)) ? cx.C.note.retreatTo : best(q.ks, k => promoteScore(cx, k)),
    swapIn: (cx, q) => best(q.ks, k => promoteScore(cx, k)),
    moveSrc: (cx, q) => best(q.ks, k => k === 'battle' ? -1 : cx.myB[k].en.length),
    moveDst: (cx, q) => best(q.ks, k => cx.readiness(k) + (k === 'battle' ? 20 : 0)),
    hammerTgt: (cx, q) => best(q.ks, k => { const p = cx.opB[k]; return p.en.length * 10 + (k === 'battle' ? 15 : 0) + cx.pz(p) * 3; }),
    trim: (cx, q) => best(q.ks, k => -(cx.pz(cx.myB[k]) * 10 + cx.readiness(k))),
    snipe: (cx, q) => { const amt = /120/.test(q.title) ? 120 : 100; return best(q.ks, k => { const p = cx.opB[k]; return (cx.rem(p) <= amt ? 1000 + cx.pz(p) * 100 : 0) + cx.pz(p) * 20 - cx.rem(p) / 10; }); },
    trumpetTgt: (cx, q) => best(q.ks, k => cx.readiness(k) + (cx.myB[k].en.length < 3 ? 10 : 0)),
    hoohTgt: (cx, q) => best(q.ks, k => cx.readiness(k)),
    mayTgt: (cx, q) => best(q.ks, k => cx.readiness(k)),
    attachTgt: (cx, q) => best(q.ks, k => cx.readiness(k) + (k === 'battle' ? 15 : 0)),
    candyTgt: (cx, q) => q.ks[0],
  };
  function coreMenu(cx, q) {
    const L = q.items;
    if (L.length === 2 && L[0] === 'はい') return 0;
    const i = L.findIndex(x => !/使わない|ここまで|キャンセル|この中にない/.test(x)); return i < 0 ? 0 : i;
  }
  R.core = { PKH, ASKH, route, PKR, ASKR, topBy, pool, promoteScore, coreTrainer, attachBase, Cx };
})(typeof window !== 'undefined' ? window : globalThis);
