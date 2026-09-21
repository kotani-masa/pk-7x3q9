'use strict';
/* 自己対戦による最適化（ブラックボックス最適化：クロスエントロピー法 CEM）
   ・調整対象：各デッキ用AIの defaults にある数値パラメータ（探索範囲は各 ai_*.js の space）
   ・3つの組み合わせで対戦して評価：
       クロス（ドラパ × レックウザ）／ドラパ ミラー／レックウザ ミラー
     候補AI vs 「現在の最良AI」（相手側の最良AIも交互に更新＝共進化）。旧CPU(legacy)とのアンカー戦も少し混ぜて、
     共進化の循環（じゃんけん状態）を防ぐ
   ・全候補に同じ乱数シードを使う（共通乱数法）。世代ごとにシードを変えて過学習を防ぐ
   使い方: node optimize.js [--rounds 2] [--gens 8] [--pop 12] [--games 30] [--seed 1] */
const fs = require('fs'), path = require('path');
const { Sim, mulberry32 } = require('./headless');
const { evalMatch } = require('./evalm');
const ROOT = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const ROUNDS = arg('rounds', 2), GENS = arg('gens', 8), POP = arg('pop', 12), GAMES = arg('games', 30), SEED = arg('seed', 1);
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null, ROUND0 = arg('round0', 0);
const INT = new Set(['benchCap', 'dreepyTarget', 'duskTarget', 'cyanoMaxHand', 'judgeMine', 'judgeOpp', 'hoFire', 'first']);

/* 戦略定義（defaults/space）を取り出す：AIコンテキストで登録内容を読む */
const sim = new Sim({ aiFiles: ['ai_core.js', 'ai_dragapult.js', 'ai_rayquaza.js'] });
const vm = require('vm');
const ctx0 = sim.makeAI(1);
const DEF = {}, SPACE = {};
for (const n of ['dragapult', 'rayquaza']) { DEF[n] = JSON.parse(vm.runInContext(`JSON.stringify(window.CPUAI.strategies.${n}.defaults)`, ctx0)); SPACE[n] = JSON.parse(vm.runInContext(`JSON.stringify(window.CPUAI.strategies.${n}.space)`, ctx0)); }
const names = n => Object.keys(SPACE[n]);
const decode = (n, x) => { const o = { ...DEF[n] }; names(n).forEach((k, i) => { const [lo, hi] = SPACE[n][k]; let v = lo + Math.min(1, Math.max(0, x[i])) * (hi - lo); if (INT.has(k)) v = Math.round(v); o[k] = INT.has(k) ? v : Math.round(v * 100) / 100; }); return o; };
const encode = (n, o) => names(n).map(k => { const [lo, hi] = SPACE[n][k]; return Math.min(1, Math.max(0, ((o[k] === undefined ? DEF[n][k] : o[k]) - lo) / (hi - lo))); });
const load = n => { const f = path.join(ROOT, `ai/params_${n}.js`); if (!fs.existsSync(f)) return { ...DEF[n] }; const m = fs.readFileSync(f, 'utf8').match(/=\s*(\{[\s\S]*?\});/); return m ? { ...DEF[n], ...JSON.parse(m[1]) } : { ...DEF[n] }; };
const save = (n, o, note) => fs.writeFileSync(path.join(ROOT, `ai/params_${n}.js`), `/* 自動生成：sim/optimize.js（自己対戦で調整したパラメータ）${note || ''} */\n(function (G) { const R = G.CPUAI = G.CPUAI || {}; R.tuned = R.tuned || {}; R.tuned.${n} = ${JSON.stringify(o)}; })(typeof window !== 'undefined' ? window : globalThis);\n`);
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* 候補 cand（デッキ n）の適合度：3つの組み合わせでの平均勝率 */
async function fitness(n, cand, cur, seed) {
  const other = n === 'dragapult' ? 'rayquaza' : 'dragapult', A = { deck: n, opt: { params: cand } };
  const cross = await evalMatch(sim, A, { deck: other, opt: { params: cur[other] } }, GAMES, seed);
  const mirror = await evalMatch(sim, A, { deck: n, opt: { params: cur[n] } }, GAMES, seed + 100000);
  const anchor = await evalMatch(sim, A, { deck: other, opt: { legacy: 1 } }, Math.ceil(GAMES / 2), seed + 200000);
  return { f: (cross.rate + mirror.rate + 0.5 * anchor.rate) / 2.5, cross: cross.rate, mirror: mirror.rate, anchor: anchor.rate };
}

async function optimizeDeck(n, cur, round, log) {
  const D = names(n).length, rnd = mulberry32(SEED * 7919 + round * 131 + (n === 'dragapult' ? 1 : 2));
  let mu = encode(n, cur[n]), sigma = new Array(D).fill(0.22 - 0.05 * round), bestSoFar = null;
  for (let g = 0; g < GENS; g++) {
    const seed = 100000 * (round + 1) + 1000 * g + (n === 'dragapult' ? 0 : 500), pop = [];
    for (let i = 0; i < POP; i++) pop.push(i === 0 ? mu.slice() : mu.map((m, j) => Math.min(1, Math.max(0, m + sigma[j] * gauss(rnd)))));
    if (bestSoFar) pop[1] = bestSoFar.x.slice(); // 前世代の最良も同じシードで再評価（エリート）
    const res = [];
    for (const x of pop) { const c = decode(n, x); const r = await fitness(n, c, cur, seed); res.push({ x, ...r }); }
    res.sort((a, b) => b.f - a.f);
    const el = res.slice(0, Math.max(3, Math.ceil(POP / 3)));
    const nm = mu.map((_, j) => el.reduce((s, e) => s + e.x[j], 0) / el.length);
    const ns = sigma.map((s, j) => { const v = Math.sqrt(el.reduce((t, e) => t + (e.x[j] - nm[j]) ** 2, 0) / el.length); return Math.max(0.04, 0.5 * s + 0.5 * Math.max(v, 0.04)); });
    mu = mu.map((m, j) => 0.4 * m + 0.6 * nm[j]); sigma = ns;
    bestSoFar = { x: res[0].x, ...res[0] };
    const line = `[round ${round} ${n}] gen ${g + 1}/${GENS}  best=${res[0].f.toFixed(3)} (cross ${res[0].cross.toFixed(2)} mirror ${res[0].mirror.toFixed(2)} vs旧CPU ${res[0].anchor.toFixed(2)})  mean=${(res.reduce((s, r) => s + r.f, 0) / res.length).toFixed(3)}  σ̄=${(sigma.reduce((a, b) => a + b, 0) / D).toFixed(3)}`;
    console.log(line); log.push({ round, n, gen: g + 1, best: res[0].f, cross: res[0].cross, mirror: res[0].mirror, anchor: res[0].anchor });
    // 最良個体を暫定保存（途中で止めても使える）
    cur[n] = decode(n, mu); save(n, cur[n], `（round ${round}, gen ${g + 1}）`);
  }
  return cur[n];
}

(async () => {
  const cur = { dragapult: load('dragapult'), rayquaza: load('rayquaza') }, log = [];
  const t0 = Date.now();
  for (let r = ROUND0; r < ROUND0 + ROUNDS; r++) {
    if (!ONLY || ONLY === 'dragapult') await optimizeDeck('dragapult', cur, r, log);
    if (!ONLY || ONLY === 'rayquaza') await optimizeDeck('rayquaza', cur, r, log);
    fs.writeFileSync(path.join(__dirname, 'opt_log.json'), JSON.stringify(log, null, 1));
    console.log(`== round ${r + 1} 完了 (${((Date.now() - t0) / 60000).toFixed(1)}分) ==`);
  }
})().catch(e => { console.log('ERR', e.stack); });
