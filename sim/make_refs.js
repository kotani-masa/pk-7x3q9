'use strict';
/* 相手の隠れた手札を先読みで仮定するための「デッキタイプの標準リスト」を ai/ai_refs.js に書き出す（デッキ内容そのものではなく、タイプごとの想定）。 */
const fs=require('fs'),path=require('path');const D=require('./decks');
const R={};for(const k in D){const m={};for(const c of D[k]){const n=c.name.replace(/\(ACE SPEC\)$/,'');const e=m[c.name]||(m[c.name]=[c.name,0,c.t]);e[1]+=c.n}R[k]=Object.values(m)}
fs.writeFileSync(path.join(__dirname,'../ai/ai_refs.js'),`/* 自動生成：sim/make_refs.js。デッキタイプごとの標準的な想定リスト（先読みで相手の手札・山札を仮定するときの母集団） */\n(function (G) { const R = G.CPUAI = G.CPUAI || {}; R.refs = ${JSON.stringify(R)}; })(typeof window !== 'undefined' ? window : globalThis);\n`);console.log('ai_refs.js written');
