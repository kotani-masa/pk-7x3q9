'use strict';
/* 代表デッキ（エミュレータ実装済みカードのみ）。実際のデッキコードの中身と違う場合は、
   ブラウザで読込済みのデッキを export_decks.txt の手順で書き出して decks/*.json を差し替えてください。 */
const T = { pke: 'pke', tr: 'tr', sup: 'sup', sta: 'sta', tool: 'tool', ene: 'ene' };
const mk = (list) => list.map(([name, n, t, extra], i) => ({ id: 'X' + String(i + 1).padStart(2, '0'), name, n, t, img: '', full: '', ...(extra || {}) }));
const dragapult = [ // クラハンドラパ（ドラパルトex＋クラッシュハンマー＋ヨノワール／スボミーのグッズロック）
  ['ドラメシヤ', 4, 'pke'], ['ドロンチ', 4, 'pke'], ['ドラパルトex', 3, 'pke'], ['ヨマワル', 2, 'pke'], ['サマヨール', 1, 'pke'], ['ヨノワール', 1, 'pke'],
  ['スボミー', 1, 'pke'], ['マシマシラ', 1, 'pke'], ['キチキギスex', 1, 'pke'], ['ニャースex', 1, 'pke'], ['ノコッチ', 2, 'pke', { var: 0 }], ['ノココッチ', 2, 'pke'],
  ['なかよしポフィン', 4, 'tr'], ['ハイパーボール', 4, 'tr'], ['ポケパッド', 2, 'tr'], ['ふしぎなアメ', 2, 'tr'], ['夜のタンカ', 1, 'tr'], ['クラッシュハンマー', 3, 'tr'], ['アンフェアスタンプ(ACE SPEC)', 1, 'tr'],
  ['リーリエの決心', 4, 'sup'], ['ボスの指令', 2, 'sup'], ['アカマツ', 1, 'sup'],
  ['ジャミングタワー', 1, 'sta'], ['危ない廃墟', 1, 'sta'],
  ['基本超エネルギー', 4, 'ene'], ['基本炎エネルギー', 4, 'ene'], ['基本悪エネルギー', 2, 'ene'], ['ネオアッパーエネルギー', 1, 'ene'],
];
const rayquaza = [ // メガレックウザ（メガ2体＋ホウオウ/ファイアローでエネ加速）
  ['メガレックウザex', 3, 'pke'], ['メガガルーラex', 3, 'pke'], ['ファイアローex', 2, 'pke'], ['テラパゴスex', 2, 'pke'], ['ヒビキのホウオウex', 2, 'pke'],
  ['ニャースex', 2, 'pke'], ['ラティアスex', 1, 'pke'], ['キチキギスex', 1, 'pke'], ['パオジアン', 2, 'pke'],
  ['ハイパーボール', 4, 'tr'], ['ぼうけんのランタン', 3, 'tr'], ['エネルギーつけかえ', 4, 'tr'], ['ガラスのラッパ', 2, 'tr'], ['スペシャルレッドカード', 1, 'tr'], ['ヒーローマント(ACE SPEC)', 1, 'tool'],
  ['シアノ', 4, 'sup'], ['ボスの指令', 2, 'sup'], ['ジャッジマン', 2, 'sup'], ['アカマツ', 2, 'sup'],
  ['ゼロの大空洞', 3, 'sta'], ['基本炎エネルギー', 9, 'ene'], ['基本雷エネルギー', 5, 'ene'],
];
const D = { dragapult: mk(dragapult), rayquaza: mk(rayquaza) };
/* sim/decks/<type>.json があればそちらを優先（実際のデッキを import_decks.js で取り込んだ場合） */
if (require.main !== module) { const fs = require('fs'); for (const k in D) { const f = __dirname + '/decks/' + k + '.json'; if (fs.existsSync(f)) D[k] = JSON.parse(fs.readFileSync(f, 'utf8')); } }
for (const k in D) { const n = D[k].reduce((s, c) => s + c.n, 0); if (n !== 60) throw new Error(k + ' = ' + n); }
if (require.main === module) { const fs = require('fs'); for (const k in D) fs.writeFileSync(__dirname + '/decks/' + k + '.json', JSON.stringify(D[k], null, 1)); console.log('written'); }
module.exports = D;
