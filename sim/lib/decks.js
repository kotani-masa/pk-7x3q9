'use strict';
/* 代表デッキ（エミュレータ実装済みカードのみ）。実際のデッキコードの中身と違う場合は、
   ブラウザで読込済みのデッキを export_decks.txt の手順で書き出して decks/*.json を差し替えてください。 */
const T = { pke: 'pke', tr: 'tr', sup: 'sup', sta: 'sta', tool: 'tool', ene: 'ene' };
const mk = (list) => list.map(([name, n, t, extra], i) => ({ id: 'X' + String(i + 1).padStart(2, '0'), name, n, t, img: '', full: '', ...(extra || {}) }));
const dragapult = [ // あなたの実際のリスト（クラッシュハンマー型ドラパルト。ふしぎなアメ・ヨマワル系統・ネオアッパーなし、ファイヤー1枚）
  ['ドラパルトex', 3, 'pke'], ['ドロンチ', 4, 'pke'], ['ドラメシヤ', 4, 'pke'], ['スボミー', 2, 'pke'], ['ノココッチex', 1, 'pke'], ['ノココッチ', 1, 'pke'], ['ノコッチ', 1, 'pke', { var: 0 }],
  ['マシマシラ', 2, 'pke'], ['ニャースex', 1, 'pke'], ['キチキギスex', 1, 'pke'], ['ファイヤー', 1, 'pke'],
  ['なかよしポフィン', 4, 'tr'], ['ポケパッド', 4, 'tr'], ['ハイパーボール', 3, 'tr'], ['夜のタンカ', 2, 'tr'], ['クラッシュハンマー', 4, 'tr'], ['スペシャルレッドカード', 1, 'tr'], ['アンフェアスタンプ(ACE SPEC)', 1, 'tr'],
  ['リーリエの決心', 4, 'sup'], ['アカマツ', 2, 'sup'], ['メイのはげまし', 1, 'sup'], ['ボスの指令', 3, 'sup'], ['危ない廃墟', 2, 'sta'],
  ['基本超エネルギー', 3, 'ene'], ['基本炎エネルギー', 3, 'ene'], ['基本悪エネルギー', 2, 'ene'],
];
const rayquaza = [ // 標準のメガレックウザ（2026-10-28、エミュレータの組み込みデッキ std:mrayquaza-lava と同じ60枚。ゼロの大空洞→伝説の溶岩洞）
  ['ヒビキのホウオウex', 2, 'pke'], ['ラティアスex', 2, 'pke'], ['キチキギスex', 1, 'pke'], ['ニャースex', 1, 'pke'], ['ファイアローex', 3, 'pke'], ['メガガルーラex', 4, 'pke'], ['メガレックウザex', 2, 'pke'],
  ['エネルギーつけかえ', 4, 'tr'], ['スペシャルレッドカード', 1, 'tr'], ['ハイパーボール', 4, 'tr'], ['ぼうけんのランタン', 1, 'tr'], ['ポケモンいれかえ', 2, 'tr'], ['ヒーローマント(ACE SPEC)', 1, 'tool'],
  ['アカマツ', 3, 'sup'], ['シアノ', 4, 'sup'], ['ジャッジマン', 2, 'sup'], ['ボスの指令', 2, 'sup'], ['リーリエの決心', 2, 'sup'],
  ['伝説の溶岩洞', 4, 'sta'], ['基本炎エネルギー', 10, 'ene'], ['基本雷エネルギー', 5, 'ene'],
];
const D = { dragapult: mk(dragapult), rayquaza: mk(rayquaza), zoroark: require('../decks/zoroark.json') };
/* sim/decks/<type>.json があればそちらを優先（実際のデッキを import_decks.js で取り込んだ場合） */
if (require.main !== module) { const fs = require('fs'); for (const k in D) { const f = __dirname + '/../decks/' + k + '.json'; if (fs.existsSync(f)) D[k] = JSON.parse(fs.readFileSync(f, 'utf8')); } }
for (const k in D) { const n = D[k].reduce((s, c) => s + c.n, 0); if (n !== 60) throw new Error(k + ' = ' + n); }
if (require.main === module) { const fs = require('fs'); for (const k in D) fs.writeFileSync(__dirname + '/../decks/' + k + '.json', JSON.stringify(D[k], null, 1)); console.log('written'); }
module.exports = D;
