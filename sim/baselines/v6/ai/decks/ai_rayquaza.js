/* ai_rayquaza.js — メガレックウザ用プレイアルゴリズム
   方針：メガレックウザex(はしゃのほうこう)・ヒビキのホウオウex・ガラスのラッパ・エネルギーつけかえで盤面のエネルギーを増やし、
   ストームエメラルダ(50×盤面のエネルギー数)で一撃を狙う。序盤はメガガルーラex/ファイアローex/テラパゴスexの低コスト高火力で
   サイドを進め、サポート(シアノ)で必要なexをまとめて確保する。メガexは倒されるとサイド3枚なので、無駄に前に出さない。 */
(function (root) {
  'use strict';
  const R = root.CPUAI, U = R.util, nrm = U.nrm, payable = U.payable, cnt = U.cnt, C = R.core;
  const GG = 'ガチグマ アカツキex', SG = 'スグリ', CM = '暗号マニアの解読', PC = 'パオジアン', RQ = 'メガレックウザex', KG = 'メガガルーラex', TF = 'ファイアローex', TP = 'テラパゴスex', HO = 'ヒビキのホウオウex', MW = 'ニャースex', LT = 'ラティアスex', FZ = 'キチキギスex';
  const ip = (cx, n) => cx.inPlayN(n), ih = (cx, n) => cx.n(n), have = (cx, n) => ip(cx, n) + ih(cx, n);
  const etype = n => (String(n).match(U.BE) || [, ''])[1];
  const eneCount = (cx, ty) => cx.hand.filter(h => etype(h.name) === ty).length + cx.keys().reduce((s, k) => s + cx.myB[k].eu.filter(x => x === ty).length, 0);
  const megaOnBoard = cx => cx.keys().some(k => /^メガ/.test(cx.myB[k].name) && (cx.D(cx.myB[k]) || {}).type === '無');
  const tera = cx => cx.keys().some(k => (cx.D(cx.myB[k]) || {}).tera);

  const defaults = {
    first: 1, sEvo: 88, sBench: 65, benchCap: 5, sAbil: 70, aBase: 45, aEnableNow: 45, aEnableSoon: 25, aProg: 9, aBattle: 6, aDoomed: 30, aLillie: 60,
    sRetreat: 64, rEnergy: 20, rMargin: 40, sBoss: 96, sJudge: 55, judgeMine: 2, judgeOpp: 5, sLillie: 90, lillieHand: 12, sHyper: 60, sRed: 82, cyanoMin: 30,
    pReady: 1, pRisk: 70, pHp: 20, sCyano: 84, cyanoMaxHand: 6, sLantern: 68, sSwitch: 90, sTrumpet: 78, sAka: 78, sRQBench: 92, sMWBench: 85, sHOBench: 84, sTPBench: 75, sKGBench: 60, sLTBench: 55,
    sRQBenchD: 70, sPC: 88, sGGBench: 55, sSugri: 92, sCipher: 22, sLantern2: 55, sAZ: 50, sTF: 96,   // キチキギスの「さかてにとる」(3枚ドロー)は、他の手札消費系アビリティより先に使う（新しい選択肢が見える） sHOab: 88, sZero: 80, sCape: 50, sKG: 92, sFezBench: 90, latiasPenalty: 60, sRisky: 0, hoFire: 2, aGoal: 0, aOver: 3, aFloor: 4, aLine: 28, aScale: 30, aRetreat: 30, aWaste: 0,
  };
  const space = {
    first: [0, 1], sBench: [40, 85], benchCap: [3, 5], sAbil: [50, 90], aBase: [25, 70], aEnableNow: [20, 75], aEnableSoon: [5, 50], aBattle: [0, 25], sRetreat: [40, 90], rMargin: [10, 120], sBoss: [80, 110],
    sJudge: [20, 85], sLillie: [60, 100], sHyper: [30, 80], sCyano: [60, 100], cyanoMaxHand: [3, 9], sLantern: [40, 85], sSwitch: [60, 100], sTrumpet: [50, 95], sAka: [50, 90], sRQBench: [70, 100], sMWBench: [50, 95],
    sHOBench: [50, 95], sRQBenchD: [20, 100], sGGBench: [20, 90], sSugri: [50, 100], sTPBench: [40, 90], sKGBench: [30, 85], sLTBench: [20, 80], sTF: [50, 95], sHOab: [60, 100], sZero: [40, 95], sCape: [10, 80], pRisk: [20, 140], latiasPenalty: [20, 120], cyanoMin: [15, 60], sRisky: [0, 40],
  };

  /* エネルギーつけかえの最良の動かし方：動かした先が「今この番に技を打てる」ようになる組み合わせ */
  function switchPlan(cx) {
    let best = null;
    for (const s of cx.keys()) { const sp = cx.myB[s]; const eneS = sp.en.filter(n => U.BE.test(n)); if (!eneS.length) continue;
      for (const d of cx.keys()) { if (d === s) continue; const dp = cx.myB[d];
        for (const en of [...new Set(eneS)]) { const ty = etype(en); let sc = 0;
          const canAtk = d === 'battle' && cx.T !== 1 && dp.na !== cx.T;
          for (const a of cx.atks(dp)) { if (payable(a.cost, dp.eu) || !payable(a.cost, dp.eu.concat([ty]))) continue; const dm = cx.dmg(cx.myB, d, a, cx.opB, 'battle', {}) || 0; sc = Math.max(sc, (canAtk ? 100 : 30) + dm / 10); }
          if (s === 'battle' && sc && cx.myBest('battle').d > 0) sc = 0; // 今の攻撃手段を壊さない
          if (sc > (best ? best.sc : 0)) best = { s, d, en, sc }; } } }
    return best;
  }
  /* パオジアン：ベンチに出すこと自体は強くない。特性「ゆきにしずめる」でスタジアムを消す価値があるときだけ出す。
     ・ゼロの大空洞でベンチが6匹以上→消すと5匹に縮む。自分が捨てる側なら、ダメージを負った高賞金のポケモン(メガex等)を先にトラッシュして賞金を渡さない
     ・相手がベンチ6匹以上（大空洞＋テラスタル）→ 相手に捨てさせる
     ・相手のジャミングタワーで自分のどうぐが無効になっている */
  const opDeckN=cx=>6-(cx.op?cx.op.prizeN:6);
  function pcPlan(cx, add) {
    const s = cx.v.stadium; if (!s) return 0; const mine = cx.bench().length + (add || 0), opn = cx.opBench().length;
    if (s.name === 'ゼロの大空洞') {
      const over = mine - 5, dmg = cx.bench().filter(k => cx.myB[k].dm > 0 && cx.pz(cx.myB[k]) >= 2 && nrm(cx.myB[k].name) !== PC);
      if (over > 0 && dmg.length) return 100;            // 自分のダメージを負った高賞金ポケモンを賞金にさせず処理できる
      if (opn > 5) return 60;                            // 相手に捨てさせる
    }
    if (s.name === 'ジャミングタワー' && cx.keys().some(k => cx.myB[k].tl.length)) return 45;
    return 0;
  }
  function needPiece(cx) { // メガレックウザ/供給役が盤面・手札にあるか
    if (!have(cx, RQ)) return 1; if (!have(cx, TF) && megaOnBoard(cx)) return 0.8; if (!ip(cx, HO) && !have(cx, HO)) return 0.7; return 0.4;
  }

  R.register('rayquaza', {
    label: 'メガレックウザ', defaults, space,
    detect: cards => cards.some(c => nrm(c.name) === RQ),
    setup(cx, bs) {
      const sc = c => { const n = nrm(c.name); return n === TF ? 78 : n === PC ? 64 : n === LT ? 60 : n === TP ? 48 : n === HO ? 44 : n === FZ ? 30 : n === MW ? 26 : n === KG ? 20 : n === GG ? 10 : n === RQ ? 8 : 25; };   // ファイアロー最優先（記事：先攻2ターン目のかぎづめハントが理想）
      const s = bs.slice().sort((a, b) => sc(b) - sc(a)), act = s[0], bench = [];
      for (const c of s.slice(1)) { const n = nrm(c.name); if ((n === HO || n === TP || n === LT) && bench.length < 3) bench.push(c.u); } // ベンチに出た時の特性を使いたいメガ・ニャースは手札に残す
      return { active: act.u, bench };
    },
    benchScore(cx, c) {
      const n = nrm(c.name), P = cx.P, opD = cx.v.oppType === 'dragapult';
      switch (n) {
        case RQ: return opD ? P.sRQBenchD : P.sRQBench;   // ダメカンをばらまくドラパ相手は、3サイドのメガを早く出すと狙われる
        case MW: return (!cx.fl.sup && cx.lg.sup && !cx.hand.some(h => h.t === 'sup') ? P.sMWBench : 30) - (opD ? P.sRisky : 0);
        case HO: return ip(cx, HO) ? 0 : P.sHOBench;
        case TP: return ip(cx, TP) ? 10 : P.sTPBench;
        case KG: return ip(cx, KG) ? 0 : P.sKGBench;
        case LT: return ip(cx, LT) ? 0 : P.sLTBench;
        case PC: return pcPlan(cx, 1) > 0 ? P.sPC : 0;      // 特性を使う場面があるときだけ
        case GG: return ip(cx, GG) ? 0 : (opDeckN(cx) >= 2 ? P.sGGBench : 20);   // 相手が2サイド以上取っていると、無色5のコストが実質軽くなる想定
        case FZ: return cx.me.koTurn === cx.T - 1 && cx.me.deckN > 10 ? P.sFezBench : 0;
        default: return P.sBench;
      }
    },
    habScore(cx, c) { return cx.lg.room > 0 ? cx.P.sTF : 0; },
    abScore(cx, b, p) {
      const n = nrm(p.name), P = cx.P;
      if (n === KG) return cx.me.deckN > 6 ? P.sKG : 0; if (n === FZ) return cx.me.deckN > 12 ? 93 : 0;
      if (n === HO) { const be = cx.attachBest, bc = be && cx.card(be.u), ty = bc ? etype(bc.name) : '';
        return be && ty === '炎' && be.k !== 'battle' && be.s >= 55 ? Math.max(20, be.s - 5) : P.sHOab; }   // 手札の炎エネルギーが少なく、ベンチの本命アタッカーに貼れる時は、ためるより手貼りを優先
      return P.sAbil;
    },
    trainerScore(cx, c) {
      const n = nrm(c.name), P = cx.P, hs = cx.hand.length - 1, me = cx.me, np = needPiece(cx);
      switch (n) {
        case 'シアノ': { const ex = [RQ, KG, TF, TP, HO, MW, LT, FZ].reduce((s, x) => s + cx.expDeck(x), 0); return me.deckN > 6 && ex >= 1 ? (hs <= P.cyanoMaxHand ? P.sCyano : 35) * (0.6 + 0.4 * np) : 0; }
        case 'エネルギーつけかえ': { const w = switchPlan(cx); if (!w) return 0; cx.C.note.sw = w; return w.sc >= 100 ? P.sSwitch : 25; }
        case 'ガラスのラッパ': { const tr = cx.v.self.trash.filter(t => U.BE.test(t.name)).length; return tera(cx) && cx.bench().length && tr ? P.sTrumpet + Math.min(2, tr) * 4 : 0; }
        case 'アカマツ': return me.deckN > 6 && hs <= 5 && (cx.expDeck('基本炎エネルギー') + cx.expDeck('基本雷エネルギー')) >= 1 ? P.sAka : 0;
        case 'ハイパーボール': return hs >= 3 ? P.sHyper * (0.4 + 0.6 * np) - (hs <= 3 ? 15 : 0) : 0;
        case 'ゼロの大空洞': return 0;
        case 'スグリ': { const me = cx.myB.battle, d = cx.opB.battle; if (!me || !d || cx.T === 1) return 0; cx.C.note.sg = 0;
          if (/(ex|V)$/.test(d.name)) { const cur = cx.myBest('battle', null, 1).d; let w30 = 0; for (const a of cx.atks(me)) if (U.payable(a.cost, me.eu)) w30 = Math.max(w30, cx.dmg(cx.myB, 'battle', a, cx.opB, 'battle', { lo: 1, plus30: true }) || 0);
            if (cur < cx.rem(d) && w30 >= cx.rem(d)) { cx.C.note.sg = 2; return P.sSugri; } }                      // +30で相手のexを倒せるとき
          if (!cx.myBest('battle').d && cx.bench().some(k => cx.myBest(k).d > 0)) { cx.C.note.sg = 1; return 58; } return 0; }   // 前が攻撃できず、ベンチに攻撃役がいるとき入れ替え
        case '暗号マニアの解読': return me.deckN > 8 && hs <= 3 ? P.sCipher : 0;
        case 'AZの安らぎ': { const at = cx.myB.battle; if (!at || !cx.bench().length) return 0; const dmgd = at.dm > 0 && /ex$/.test(at.name);
          return dmgd || (cx.T !== 1 && !cx.canAtkNow('battle')) ? P.sAZ : 0; }   // ダメージを負ったexを回復して戻す／攻撃できないときの入れ替え
        case 'ぼうけんのランタン': return me.deckN > 4 ? (cx.eneHand.length < 2 ? P.sLantern : P.sLantern2) : 0;
        default: return undefined;
      }
    },
    stadiumScore(cx, c) { const P = cx.P; if (nrm(c.name) === 'ゼロの大空洞') return tera(cx) ? P.sZero : (ih(cx, TP) ? 40 : 0); return 0; },
    toolScore(cx, c, k) { const p = cx.myB[k], P = cx.P; const big = /^メガ/.test(p.name); return P.sCape + (big ? 12 : 0) + (k === 'battle' ? 8 : 0) - (p.tl.length ? 100 : 0); },
    attachScore(cx, c, k, base) {
      const n = nrm(cx.myB[k].name); if (n === LT || n === FZ || n === MW) return base * 0.15;
      const t = etype(c.name); if (t === '雷' && eneCount(cx, '雷') - 1 >= 1 && cx.myB[k].eu.includes('雷')) base -= 8;
      return base;
    },
    attackScore(cx, a, x) {
      const d = cx.opB.battle; let s = x.dm + (x.ko ? 1000 + cx.pz(d) * 300 : x.koP ? 500 + cx.pz(d) * 150 : 0);
      if (a.n === 'しっぽをまく' && !cx.bench().length) return -1e6;   // 場が空になって負けるのを避ける
      if (a.n === 'むげんのやいば' && !x.ko) s -= cx.P.latiasPenalty; if (a.n === 'しっぽをまく') s -= 40; if (a.n === 'かぎづめハント') s += 25; if (a.n === 'シャイニングフェザー') s += 25;
      return s;
    },
    promoteAdj(cx, k, p) { const n = nrm(p.name); return n === KG ? 8 : n === TF ? 10 : n === TP ? Math.min(30, cx.bench().length * 6) : n === LT ? -10 : 0; },
    want(cx, c) {
      const n = nrm(c.name);
      if (c.t === 'ene') { const t = etype(n); if (t === '雷') return eneCount(cx, '雷') === 0 ? 100 : eneCount(cx, '雷') === 1 ? 72 : 45; if (t === '炎') return eneCount(cx, '炎') < 3 ? 62 : 42;
        if (t === '水') return have(cx, PC) && eneCount(cx, '水') === 0 ? 70 : 12; return 25; }
      const np = needPiece(cx);
      switch (n) {
        case RQ: return have(cx, RQ) ? 55 : 100; case KG: return have(cx, KG) ? 45 : 72; case TF: return megaOnBoard(cx) && !have(cx, TF) ? 82 : 45; case TP: return have(cx, TP) ? 40 : 66;
        case PC: return pcPlan(cx, 1) > 0 ? 70 : 20; case GG: return (cx.op ? cx.op.prizeN : 6) <= 4 ? 55 : 25; case HO: return have(cx, HO) ? 38 : 76; case MW: return cx.fl.sup ? 15 : have(cx, MW) ? 20 : 50; case LT: return have(cx, LT) ? 15 : 46; case FZ: return 25;
        case 'シアノ': return cx.fl.sup ? 40 : 88; case 'ボスの指令': return 74 + (cx.gust() && cx.gust().ko ? 20 : 0); case 'アカマツ': return 58; case 'ジャッジマン': return 45;
        case 'エネルギーつけかえ': return 62; case 'ガラスのラッパ': return tera(cx) ? 60 : 30; case 'ぼうけんのランタン': return 50; case 'ゼロの大空洞': return tera(cx) ? 58 : 25;
        case 'スペシャルレッドカード': return 36; case 'ハイパーボール': return 44; case 'ヒーローマント': return 30;
        default: return 30;
      }
    },
    junk(cx, c) {
      const n = nrm(c.name);
      if (c.t === 'ene') return cx.eneHand.length > 3 ? 8 : 30; if (n === RQ) return 96 - ih(cx, RQ) * 15; if (n === TF) return 74; if (n === HO) return 66; if (n === TP) return 60; if (n === KG) return 62;
      if (n === 'シアノ') return 58; if (n === 'ボスの指令') return 62; if (c.t === 'sta') return 14; if (n === LT || n === FZ || n === MW || n === PC || n === GG) return 20; if (n === CM) return 16; if (n === SG) return 34; if (n === 'ジャッジマン') return 28;
      return 26;
    },
    /* 価値関数への追加特徴量：エネルギー総数と「相手の主力を1撃で倒すまでのあと何個」、メガレックウザの準備、テラスタル/大空洞、ダメージを負った高賞金の露出 */
    extraFeatures(cx) {
      const mb = cx.myB, ob = cx.opB, tot = U.sumEu(mb), oa = ob.battle, H = n => cx.hand.some(c => nrm(c.name) === n) ? 1 : 0, rqs = Object.values(mb).filter(p => nrm(p.name) === RQ);
      const exposed = Math.max(0, ...Object.values(mb).filter(p => cx.pz(p) >= 2 && p.dm > 0).map(p => p.dm / (p.hp || 1)));
      return [tot / 12, oa ? Math.max(0, Math.ceil(cx.rem(oa) / 50) - tot) / 6 : 0, rqs.length / 3, rqs.some(p => payable(['雷', '炎', '無'], p.eu)) ? 1 : 0, tera(cx) ? 1 : 0, cx.bench().length / 8,
        cx.v.stadium && cx.v.stadium.name === 'ゼロの大空洞' ? 1 : 0, mb.battle && nrm(mb.battle.name) === KG ? 1 : 0, Object.values(mb).some(p => nrm(p.name) === TF) ? 1 : 0, exposed,
        H('シアノ'), H('ボスの指令'), H('エネルギーつけかえ'), cx.hand.filter(c => etype(c.name) === '炎').length / 3, (cx.expDeck('基本雷エネルギー') + cx.expDeck('基本炎エネルギー')) / 10, pcPlan(cx, 0) > 0 ? 1 : 0];
    },
    pkH: {
      handFire: (cx, q) => C.pool(q).slice(0, Math.min(q.n, cx.P.hoFire)).map(c => c.u),
      moveEne: (cx, q) => { const w = cx.C.note.sw; const t = w ? etype(w.en) : ''; const m = C.pool(q).find(c => etype(c.name) === t); return m ? [m.u] : C.pool(q).slice(0, 1).map(c => c.u); },
      any2: (cx, q) => C.topBy(C.pool(q), c => R.strategies.rayquaza.want(cx, c), 2).map(c => c.u),
    },
    askH: {
      moveSrc: (cx, q) => { const w = cx.C.note.sw; return w && q.ks.includes(w.s) ? w.s : q.ks[0]; },
      moveDst: (cx, q) => { const w = cx.C.note.sw; return w && q.ks.includes(w.d) ? w.d : q.ks[0]; },
    },
    menuH: { any: (cx, q) => /効果を1つ選んでください/.test(q.title) ? (cx.C.note.sg === 2 ? 1 : 0) : /山札の一番上にするカード/.test(q.title) ? q.items.indexOf(C.topBy(q.items, nm => R.strategies.rayquaza.want(cx, { name: nm, t: /エネルギー$/.test(nm) ? 'ene' : 'pke' }), 1)[0]) : /エネルギー3個を山札にもどして/.test(q.title) ? (Object.keys(cx.opB).filter(k => k !== 'battle').some(k => cx.rem(cx.opB[k]) <= 120 && cx.pz(cx.opB[k]) >= 2) ? 0 : 1) :  /パオジアン.*ベンチに出しました/.test(q.title) ? (pcPlan(cx, 0) > 0 ? 0 : 1) : undefined },
  });
})(typeof window !== 'undefined' ? window : globalThis);
