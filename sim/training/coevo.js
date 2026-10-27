'use strict';
/* 相互強化（共進化）：指定したデッキのAIパラメータを「現在の相手AI」に勝てるように調整する（クロスエントロピー法）。
   ・相手は ai/params/params_<相手>.js の現在値で固定し、候補だけを動かす。全候補に同じseedを使う（共通乱数法）
   ・調整用seedは 600000番台以降。評価用（40000・100000番台など）とは重ならない
   ・最後に「初期値 vs 調整後」を別seedで比べ、良くなった場合だけ params を書き換える（悪化させない）
   使い方: node sim/run.js coevo --deck dragapult --vs zoroark [--gens 8] [--pop 12] [--games 80] [--check 600] [--seed 1] [--keep]
           --vs は カンマ区切りで複数可（例 zoroark,rayquaza）。先頭の相手ほど重視（重み 1, 0.5, 0.5…） */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { Sim, mulberry32 } = require('../lib/headless');
const { evalMatch } = require('../lib/evalm');
const ROOT = path.resolve(__dirname, '../..');
const argS = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; }, arg = (k, d) => +argS(k, d);
const DECK = argS('deck', 'dragapult'), VS = argS('vs', 'zoroark').split(','), GENS = arg('gens', 8), POP = arg('pop', 12), GAMES = arg('games', 80), CHECK = arg('check', 600), SEED = arg('seed', 1);
const INT = new Set(['benchCap', 'dreepyTarget', 'duskTarget', 'cyanoMaxHand', 'judgeMine', 'judgeOpp', 'lineTarget', 'drawReserve', 'hoFire', 'first', 'curseKeep', 'boardMin']);
const sim = new Sim();
const ctx0 = sim.makeAI(1), DEF = {}, SPACE = {};
for (const n of ['dragapult', 'rayquaza', 'zoroark']) { DEF[n] = JSON.parse(vm.runInContext(`JSON.stringify(window.CPUAI.strategies.${n}.defaults)`, ctx0)); SPACE[n] = JSON.parse(vm.runInContext(`JSON.stringify(window.CPUAI.strategies.${n}.space)`, ctx0)); }
const names = n => Object.keys(SPACE[n]);
const decode = (n, x) => { const o = {}; names(n).forEach((k, i) => { const [lo, hi] = SPACE[n][k]; let v = lo + Math.min(1, Math.max(0, x[i])) * (hi - lo); o[k] = INT.has(k) ? Math.round(v) : Math.round(v * 100) / 100; }); return o; };
const encode = (n, o) => names(n).map(k => { const [lo, hi] = SPACE[n][k], v = o[k] === undefined ? DEF[n][k] : o[k]; return v === undefined ? 0.5 : Math.min(1, Math.max(0, (v - lo) / (hi - lo))); });
const pfile = n => path.join(ROOT, `ai/params/params_${n}.js`);
const load = n => { if (!fs.existsSync(pfile(n))) return {}; const m = fs.readFileSync(pfile(n), 'utf8').match(/=\s*(\{[\s\S]*?\});/); return m ? JSON.parse(m[1]) : {}; };
const save = (n, o, note) => fs.writeFileSync(pfile(n), `/* 自動生成：sim/training/coevo.js ${note} */\n(function (G) { const R = G.CPUAI = G.CPUAI || {}; R.tuned = R.tuned || {}; R.tuned.${n} = ${JSON.stringify(o)}; })(typeof window !== 'undefined' ? window : globalThis);\n`);
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const W = VS.map((_, i) => i ? 0.5 : 1), WS = W.reduce((a, b) => a + b, 0);
async function fitness(cand, N, seed) {   // 相手ごとの勝率の重み付き平均
  const rates = []; for (let i = 0; i < VS.length; i++) rates.push((await evalMatch(sim, { deck: DECK, opt: { params: cand } }, { deck: VS[i], opt: {} }, N, seed + i * 50000)).rate);
  return { f: rates.reduce((s, r, i) => s + r * W[i], 0) / WS, rates };
}
(async () => {
  const t0 = Date.now(), start = load(DECK), rnd = mulberry32(SEED * 7919 + 17), D = names(DECK).length;
  let mu = encode(DECK, { ...DEF[DECK], ...start }), sigma = new Array(D).fill(0.18), elite = null; const log = [];
  for (let g = 0; g < GENS; g++) {
    const seed = 600000 + SEED * 10000000 + g * 1000, pop = [];
    for (let i = 0; i < POP; i++) pop.push(i === 0 ? mu.slice() : mu.map((m, j) => Math.min(1, Math.max(0, m + sigma[j] * gauss(rnd)))));
    if (elite) pop[1] = elite.slice();
    const res = []; for (const x of pop) res.push({ x, ...(await fitness(decode(DECK, x), GAMES, seed)) });
    res.sort((a, b) => b.f - a.f); const el = res.slice(0, Math.max(3, Math.ceil(POP / 3)));
    const nm = mu.map((_, j) => el.reduce((s, e) => s + e.x[j], 0) / el.length);
    sigma = sigma.map((s, j) => Math.max(0.04, 0.5 * s + 0.5 * Math.max(0.04, Math.sqrt(el.reduce((t, e) => t + (e.x[j] - nm[j]) ** 2, 0) / el.length))));
    mu = mu.map((m, j) => 0.4 * m + 0.6 * nm[j]); elite = res[0].x;
    const line = `[${DECK} vs ${VS.join('+')}] gen ${g + 1}/${GENS} best=${res[0].f.toFixed(3)} (${res[0].rates.map(r => r.toFixed(2)).join(' / ')}) mean=${(res.reduce((s, r) => s + r.f, 0) / res.length).toFixed(3)} ${((Date.now() - t0) / 60000).toFixed(1)}分`;
    console.log(line); log.push(line);
  }
  // 採用判定：調整前と調整後を、調整に使っていないseedで比較
  const before = { ...start }, after = decode(DECK, mu), cs = 900000 + SEED * 10000000;
  const b = await fitness(before, CHECK, cs), a = await fitness(after, CHECK, cs);
  const msg = `check ${CHECK}試合/相手: 調整前 ${b.f.toFixed(3)} (${b.rates.map(r => r.toFixed(3)).join(' / ')}) → 調整後 ${a.f.toFixed(3)} (${a.rates.map(r => r.toFixed(3)).join(' / ')})`;
  console.log(msg); log.push(msg);
  if (a.f > b.f || process.argv.includes('--keep')) { save(DECK, after, `vs ${VS.join('+')} ${new Date().toISOString().slice(0, 10)}`); console.log('採用: ' + pfile(DECK)); }
  else console.log('不採用（調整前の方が良いか同等）');
  const lf = path.join(__dirname, '../results/coevo_log.json'); const all = fs.existsSync(lf) ? JSON.parse(fs.readFileSync(lf, 'utf8')) : [];
  all.push({ deck: DECK, vs: VS, date: new Date().toISOString(), gens: GENS, pop: POP, games: GAMES, check: CHECK, before: b, after: a, adopted: a.f > b.f, params: after, log }); fs.writeFileSync(lf, JSON.stringify(all, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });
