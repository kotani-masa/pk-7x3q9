/* ai_dragapult.js — クラハンドラパ用プレイアルゴリズム
   方針：ドラメシヤ→ドロンチ(ていさつしれい)→ドラパルトex を最速で完成させ、ファントムダイブ(200＋ダメカン6個ばらまき)と
   ヨノワール/サマヨールのカースドボムで「サイドをまとめ取り」。スボミーのグッズロックとクラッシュハンマーで相手の展開を遅らせる。
   ※ 数値の閾値は defaults にまとめてあり、sim/optimize.js の自己対戦で調整する（ai/params_dragapult.js に出力）。 */
(function (root) {
  'use strict';
  const R = root.CPUAI, U = R.util, nrm = U.nrm, payable = U.payable, C = R.core;
  const DR = 'ドラメシヤ', DK = 'ドロンチ', DP = 'ドラパルトex', YM = 'ヨマワル', SM = 'サマヨール', YN = 'ヨノワール', BU = 'スボミー', MU = 'マシマシラ', FZ = 'キチキギスex', MW = 'ニャースex', NK = 'ノコッチ', NN = 'ノココッチ';
  const ip = (cx, n) => cx.inPlayN(n), ih = (cx, n) => cx.n(n), have = (cx, n) => ip(cx, n) + ih(cx, n);
  const ITEMLOCK_OPP = { rayquaza: 1, dragapult: 1 };

  const defaults = {
    first: 1, sEvo: 88, sBench: 70, benchCap: 5, sAbil: 70, aBase: 45, aEnableNow: 40, aEnableSoon: 22, aProg: 10, aBattle: 8, aDoomed: 30, aLillie: 60,
    sRetreat: 64, rEnergy: 15, rMargin: 40, sBoss: 96, sJudge: 55, judgeMine: 2, judgeOpp: 5, sLillie: 92, lillieHand: 12, sHyper: 66, sRed: 82, cyanoMin: 20,
    pReady: 1, pRisk: 60, pHp: 20, sPoffin: 82, sPad: 58, sEvoDk: 90, sEvoDp: 95, sEvoSm: 58, sEvoYn: 62, sEvoNn: 48, sBenchDr: 78, dreepyTarget: 3, sBenchDusk: 66, duskTarget: 2,
    sBenchBudew: 60, sBenchMuni: 52, sDrakloak: 92, sCurse: 90, curseNet: 150, curseLoss: 100, sAdren: 45, sDudu: 52, sHammer: 52, sStamp: 86, sAka: 76, sCandy: 96, sTanka: 46,
    sLock: 110, spreadW: 1, sJam: 60, sRuins: 12, setupBudew: 60, sHikari: 70, sMay: 82, budewSpare: 0,
  };
  /* 探索空間（optimize.js が使う）：[下限, 上限] */
  const space = {
    first: [0, 1], sBench: [50, 90], benchCap: [3, 5], sAbil: [50, 90], aBase: [25, 70], aEnableNow: [20, 70], aEnableSoon: [5, 45], aBattle: [0, 25], sRetreat: [40, 90], rMargin: [10, 100], sBoss: [80, 110],
    sJudge: [20, 85], sLillie: [70, 100], lillieHand: [4, 20], sHyper: [40, 85], sPoffin: [60, 95], sPad: [30, 75], sEvoSm: [30, 80], sEvoYn: [30, 80], sBenchDr: [60, 90], dreepyTarget: [2, 4], sBenchDusk: [30, 80],
    duskTarget: [1, 3], sBenchBudew: [20, 80], sBenchMuni: [20, 75], sCurse: [70, 100], curseNet: [50, 300], sAdren: [20, 80], sDudu: [20, 75], sHammer: [30, 80], sStamp: [60, 100], sAka: [50, 90], sTanka: [20, 70],
    sLock: [40, 200], spreadW: [0.3, 2], sJam: [20, 80], sRuins: [0, 60], setupBudew: [20, 90], pRisk: [20, 120], aLillie: [40, 80], sHikari: [40, 85], sMay: [50, 95],
  };

  /* --- 状況の見立て --- */
  const curseMax = cx => cx.keys().some(k => nrm(cx.myB[k].name) === YN) ? 130 : cx.keys().some(k => nrm(cx.myB[k].name) === SM) ? 50 : 0;
  function need(cx) { // 「いま最優先で欲しい進化ライン」度 0〜1
    const dr = ip(cx, DR), dk = ip(cx, DK), dp = ip(cx, DP);
    if (dp && !have(cx, DP) && !have(cx, DK)) return dr + dk > 1 ? 0.35 : 0.6;
    if ((dk || dr) && !ih(cx, DP) && !dp) return 1;
    if (dr && !ih(cx, DK) && !dk) return 0.85;
    if (!dr && !ih(cx, DR) && !dk && !dp) return 0.9;
    return 0.3;
  }
  function simSpread(cx, n) { // ダメカンn個を貪欲に配ったときの獲得サイド
    const rem = {}; cx.opBench().forEach(k => rem[k] = cx.rem(cx.opB[k])); let pz = 0, left = n;
    while (left > 0) { const k = spreadPick(cx, Object.keys(rem).filter(k => rem[k] > 0), left, rem); if (!k) break; rem[k] -= 10; left--; if (rem[k] <= 0) { pz += cx.pz(cx.opB[k]); delete rem[k]; } }
    return pz;
  }
  function spreadPick(cx, ks, left, rem) {
    let bk = null, bs = -1e9; const pot = curseMax(cx);
    for (const k of ks) { const p = cx.opB[k], r = rem ? rem[k] : cx.rem(p), nd = Math.ceil(r / 10); let sc;
      if (r <= 0) continue;
      if (nd <= left) sc = 1000 + cx.pz(p) * 100 / nd; else { const gap = r - 10 * left; sc = cx.pz(p) * 30 - Math.max(0, gap - pot) / 5 + (pot > 0 && gap <= pot ? 200 : 0); }
      if (sc > bs) { bs = sc; bk = k; } }
    return bk;
  }
  function curseBest(cx, n, user) { // カースドボムn個の最良の置き先
    const me = cx.myB.battle, P = cx.P; let best = null, atk = 0;
    if (me && cx.T !== 1 && me.na !== cx.T) { const b = cx.myBest('battle', null, 1); atk = b.d; }
    for (const k of Object.keys(cx.opB)) { const p = cx.opB[k], rem = cx.rem(p), dc = 10 * n; let sc = -1e9, kind = '';
      if (rem <= dc) { sc = cx.pz(p) * 300; kind = 'ko'; }
      else if (k === 'battle' && rem - dc <= atk) { sc = cx.pz(p) * 300 - 40; kind = 'combo'; }
      else { sc = cx.pz(p) * 20 - rem / 10; kind = 'pile'; }
      if ((kind === 'ko' || kind === 'combo') && cx.me.prizeN <= cx.pz(p)) sc += 5000;
      if (!best || sc > best.sc) best = { k, sc, kind }; }
    if (best) best.net = best.sc - (user ? cx.pz(user) : 1) * P.curseLoss;
    return best;
  }

  R.register('dragapult', {
    label: 'クラハンドラパ', defaults, space,
    detect: cards => cards.some(c => nrm(c.name) === DP),
    setup(cx, bs) {
      const P = cx.P, sc = c => { const n = nrm(c.name); return n === BU ? P.setupBudew : n === NK ? 50 : n === YM ? 45 : n === DR ? 40 : n === MU ? 20 : n === FZ ? 12 : n === MW ? 10 : 25; };
      const s = bs.slice().sort((a, b) => sc(b) - sc(a)), act = s[0], bench = []; let d = 0, y = 0, k = 0;
      for (const c of s.slice(1)) { const n = nrm(c.name); if (n === DR && d < 3) { bench.push(c.u); d++; } else if (n === YM && y < 2) { bench.push(c.u); y++; } else if ((n === NK || n === BU) && k < 1) { bench.push(c.u); k++; } }
      return { active: act.u, bench };
    },
    evoScore(cx, c, k) { const n = nrm(c.name), P = cx.P; return n === DK ? P.sEvoDk : n === DP ? P.sEvoDp : n === SM ? P.sEvoSm : n === YN ? P.sEvoYn : n === NN ? P.sEvoNn : P.sEvo; },
    benchScore(cx, c) {
      const n = nrm(c.name), P = cx.P;
      switch (n) {
        case DR: return ip(cx, DR) + ip(cx, DK) + ip(cx, DP) < P.dreepyTarget ? P.sBenchDr : P.sBenchDr - 40;
        case YM: return ip(cx, YM) + ip(cx, SM) + ip(cx, YN) < P.duskTarget ? P.sBenchDusk : 0;
        case BU: return ip(cx, BU) < 1 ? P.sBenchBudew : 0;
        case NK: return ip(cx, NK) + ip(cx, NN) < 1 ? 45 : 0;
        case MU: return ip(cx, MU) < 1 ? P.sBenchMuni : 0;
        case FZ: return cx.me.koTurn === cx.T - 1 && cx.me.deckN > 10 ? 90 : 0;
        case MW: return !cx.fl.sup && cx.lg.sup && !cx.hand.some(h => h.t === 'sup') ? 85 : 25;
        default: return P.sBench;
      }
    },
    abScore(cx, b, p) {
      const n = nrm(p.name), P = cx.P;
      if (n === DK) return cx.me.deckN > 4 ? P.sDrakloak : 0;
      if (n === FZ) return cx.me.deckN > 12 ? 93 : 0;
      if (n === YN || n === SM) { const r = curseBest(cx, n === YN ? 13 : 5, p); if (!r || r.net < P.curseNet) return 0; if (cx.keys().length <= 1 && r.sc < 5000) return 0; return P.sCurse; }   // 自分の場が空になる自滅は、勝てる時だけ
      if (n === MU) { let mine = 0; cx.keys().forEach(k => { mine += Math.floor(cx.myB[k].dm / 10); }); const mv = Math.min(3, mine); if (!mv) return 0;
        const kill = Object.keys(cx.opB).some(k => cx.rem(cx.opB[k]) <= 10 * mv); return kill ? 88 : P.sAdren; }
      if (n === NN) return b.k !== 'battle' && cx.hand.length <= 4 && cx.me.deckN > 10 ? P.sDudu : 0;
      return P.sAbil;
    },
    trainerScore(cx, c) {
      const n = nrm(c.name), P = cx.P, hs = cx.hand.length - 1, me = cx.me, op = cx.op, nd = need(cx), nb = cx.bench().length;
      switch (n) {
        case 'なかよしポフィン': { const r = Math.min(2, cx.lg.room); const ex = ['ドラメシヤ', 'ヨマワル', 'ノコッチ'].reduce((s, x) => s + cx.expDeck(x), 0); return r && nb < P.benchCap && ex >= 0.5 ? P.sPoffin - 6 * nb : 0; }
        case 'ハイパーボール': return hs >= 3 ? P.sHyper * (0.4 + 0.6 * nd) - (hs <= 3 ? 15 : 0) : 0;
        case 'ポケパッド': return me.deckN > 3 ? P.sPad * (0.4 + 0.6 * nd) : 0;
        case 'ふしぎなアメ': { if (cx.T <= 2) return 0; const dp = ih(cx, DP) && cx.keys().some(k => nrm(cx.myB[k].name) === DR && cx.myB[k].pt !== cx.T && cx.myB[k].ev !== cx.T);
          const yn = ih(cx, YN) && cx.keys().some(k => nrm(cx.myB[k].name) === YM && cx.myB[k].pt !== cx.T && cx.myB[k].ev !== cx.T); return dp ? P.sCandy : yn ? 60 : 0; }
        case 'アンフェアスタンプ': return me.koTurn === cx.T - 1 ? P.sStamp : 0;
        case 'クラッシュハンマー': return Object.values(cx.opB).some(p => p.en.length) ? P.sHammer + (cx.op.board.battle && cx.op.board.battle.en.length ? 8 : 0) : 0;
        case '夜のタンカ': return hs <= 6 && (cx.C.unacc ? true : true) && cx.v.self.trash.some(t => [DP, DK, DR, YM, YN].includes(nrm(t.name)) || /^基本/.test(t.name)) ? P.sTanka : 0;
        case 'リーリエの決心': { if (me.deckN <= 8) return 0; if (cx.attachBest && cx.attachBest.s >= P.aLillie && cx.eneHand.length) return 40; return Math.max(0, P.sLillie - hs * P.lillieHand); }
        case 'アカマツ': return cx.fl.eat === false && me.deckN > 6 && hs <= 5 && (cx.expDeck('基本炎エネルギー') + cx.expDeck('基本超エネルギー')) >= 1 ? P.sAka : 0;
        case 'ヒカリ': return nd >= 0.6 ? P.sHikari : 30;
        case 'トウコ': return nd >= 0.6 ? P.sHikari - 4 : 28;
        case 'メイのはげまし': return me.prizeN > op.prizeN && cx.keys().some(k => cx.stage(cx.myB[k]) === '2進化') && cx.v.self.trash.some(t => /^基本/.test(t.name)) ? P.sMay : 0;
        default: return undefined;
      }
    },
    stadiumScore(cx, c) {
      const n = nrm(c.name), P = cx.P; if (n === 'ジャミングタワー') return Object.values(cx.opB).some(p => p.tl.length) ? P.sJam : 8;
      if (n === '危ない廃墟') return cx.v.stadium ? 0 : P.sRuins; return 0;
    },
    attachScore(cx, c, k, base) {
      const p = cx.myB[k], n = nrm(p.name);
      if (n === BU || n === NK || n === NN || n === FZ || n === MW) return base * 0.3;
      if (n === MU) return p.en.length === 0 ? base + 22 : base * 0.4;
      if (n === YM || n === SM || n === YN) return base * 0.5;
      // 炎と超を両方そろえる：足りない方を優先
      const t = (c.name.match(U.BE) || [, ''])[1], have = ty => p.eu.filter(x => x === ty).length; if (t && (n === DR || n === DK || n === DP)) { if (have(t) >= 1) base -= 12; }
      return base;
    },
    attackScore(cx, a, x) {
      const P = cx.P, d = cx.opB.battle; let s = x.dm + (x.ko ? 1000 + cx.pz(d) * 300 : x.koP ? 500 + cx.pz(d) * 150 : 0);
      if (a.n === 'ファントムダイブ') { s += 30 + P.spreadW * simSpread(cx, 6) * 250; }
      if (a.n === 'むずむずかふん') s += ITEMLOCK_OPP[cx.v.oppType] || cx.op.handN > 4 ? P.sLock : P.sLock * 0.3;
      if (a.n === 'むかえにいく') { const dz = cx.v.self.trash.filter(t => nrm(t.name) === YM).length; s = dz && cx.lg.room ? 40 + 15 * Math.min(dz, cx.lg.room, 3) : -50; }
      if (a.n === 'いれかわる') s = 5;
      return s;
    },
    promoteAdj(cx, k, p) { const n = nrm(p.name); return n === DP ? 25 : n === BU ? 10 : (n === DR || n === YM) ? -5 : 0; },
    /* 山札サーチ・手札捨ての価値づけ */
    want(cx, c) {
      const n = nrm(c.name), P = cx.P;
      if (c.t === 'ene') { const t = (n.match(U.BE) || [, ''])[1]; const cntT = ty => cx.hand.filter(h => (h.name.match(U.BE) || [, ''])[1] === ty).length + cx.keys().reduce((s, k) => s + cx.myB[k].eu.filter(x => x === ty).length, 0);
        if (/^ネオ/.test(n)) return 40; return 50 + (cntT(t) < (t === '炎' ? cntT('超') : cntT('炎')) ? 15 : 0) - Math.min(20, cx.eneHand.length * 6); }
      const nd = need(cx);
      switch (n) {
        case DP: return (ip(cx, DK) || ip(cx, DR) || ih(cx, 'ふしぎなアメ')) && !ih(cx, DP) ? 100 : 55 - ih(cx, DP) * 40;
        case DK: return ip(cx, DR) && !ih(cx, DK) && !ip(cx, DK) ? 92 : 40 - ih(cx, DK) * 20;
        case DR: return have(cx, DR) + ip(cx, DK) + ip(cx, DP) < 2 ? 85 : 25;
        case YM: return have(cx, YM) + ip(cx, SM) + ip(cx, YN) < 2 ? 55 : 18;
        case SM: return ip(cx, YM) && !ih(cx, SM) ? 45 : 15; case YN: return (ip(cx, SM) || ih(cx, 'ふしぎなアメ')) && !ih(cx, YN) ? 55 : 18;
        case BU: return ip(cx, BU) ? 10 : 40; case MU: return ip(cx, MU) ? 8 : 42; case FZ: return 30; case MW: return cx.fl.sup ? 20 : 52; case NK: return 28; case NN: return 30;
        case 'ふしぎなアメ': return have(cx, DR) && (ih(cx, DP) || nd > 0.5) ? 72 : 30;
        case 'なかよしポフィン': return cx.lg && cx.lg.room > 0 ? 62 : 25; case 'ボスの指令': return 66; case 'リーリエの決心': return 62; case 'アカマツ': return 45;
        case 'クラッシュハンマー': return 46; case 'アンフェアスタンプ': return 40; case 'ハイパーボール': return 44; case 'ポケパッド': return 48; case '夜のタンカ': return 36;
        case 'メイのはげまし': return 38; case 'ヒカリ': return 45; case 'トウコ': return 42; case 'ジャッジマン': return 30; case 'スペシャルレッドカード': return 30;
        default: return 30;
      }
    },
    junk(cx, c) { // 手札を捨てるときの「惜しさ」（低いほど先に捨てる）
      const n = nrm(c.name);
      if (c.t === 'ene') return cx.eneHand.length > 2 ? 8 : 34; if (n === DP) return 95 - ih(cx, DP) * 25; if (n === DK) return 70 - (ih(cx, DK) - 1) * 40; if (n === DR) return 45 - Math.max(0, ih(cx, DR) - 1) * 25;
      if (n === 'ボスの指令') return 60; if (n === 'リーリエの決心') return 50; if (n === 'ふしぎなアメ') return 68; if (c.t === 'sta') return 12; if (n === FZ || n === MW) return 22; if (n === YN) return 40;
      return 26;
    },
    pkH: {
      top2: (cx, q) => C.topBy(C.pool(q), c => R.strategies.dragapult.want(cx, c), 1).map(c => c.u),
      revive: (cx, q) => C.pool(q).slice(0, Math.min(3, cx.lg ? cx.lg.room : 3, q.n)).map(c => c.u),
      poffin: (cx, q) => { const r = c => { const n = nrm(c.name); return n === DR ? 90 - ip(cx, DR) * 15 : n === YM ? 60 - ip(cx, YM) * 15 : n === NK ? 40 : n === BU ? (ip(cx, BU) ? 5 : 45) : 10; }; return C.topBy(C.pool(q), r, q.n).filter(c => r(c) > 12 || q.n > 1).map(c => c.u); },
      pad: (cx, q) => C.topBy(C.pool(q), c => R.strategies.dragapult.want(cx, c), 1).map(c => c.u),
      candyEvo: (cx, q) => C.pool(q).slice(0, 1).map(c => c.u),
      hikari: (cx, q) => C.topBy(C.pool(q), c => R.strategies.dragapult.want(cx, c), 1).map(c => c.u),
      toukoEvo: (cx, q) => C.topBy(C.pool(q), c => R.strategies.dragapult.want(cx, c), 1).map(c => c.u),
      toukoEne: (cx, q) => C.topBy(C.pool(q), c => R.strategies.dragapult.want(cx, c), 1).map(c => c.u),
      mayEne: (cx, q) => C.pool(q).slice(0, 2).map(c => c.u),
      hammerEne: (cx, q) => { const cnt = {}; q.pool.forEach(c => cnt[c.name] = (cnt[c.name] || 0) + 1); return C.topBy(C.pool(q), c => -cnt[c.name], 1).map(c => c.u); },
    },
    askH: {
      spread: (cx, q) => { const m = q.title.match(/残り(\d+)個/), left = m ? +m[1] : 1; return spreadPick(cx, q.ks, left, null) || q.ks[0]; },
      curse: (cx, q) => { const m = q.title.match(/ダメカン(\d+)個/), n = m ? +m[1] : 5, r = curseBest(cx, n, null); return r && q.ks.includes(r.k) ? r.k : q.ks[0]; },
      adrenSrc: (cx, q) => C.topBy(q.ks, k => cx.myB[k].dm, 1)[0],
      adrenDst: (cx, q) => C.topBy(q.ks, k => { const p = cx.opB[k], r = cx.rem(p); return (r <= 30 ? 1000 + cx.pz(p) * 100 : 0) + cx.pz(p) * 10 - r / 10; }, 1)[0],
      candyTgt: (cx, q) => C.topBy(q.ks, k => cx.myB[k].en.length * 10 + (k === 'battle' ? 5 : 0), 1)[0],
    },
    menuH: { any: (cx, q) => /動かすダメカン/.test(q.title) ? q.items.length - 1 : undefined },
  });
})(typeof window !== 'undefined' ? window : globalThis);
