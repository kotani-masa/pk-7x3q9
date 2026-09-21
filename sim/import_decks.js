'use strict';
/* ブラウザから書き出したデッキ（export_decks.txt の手順）を sim/decks/*.json に変換する。
   デッキタイプは各 ai_*.js の detect() で自動判定。同じタイプが複数ある場合は、対象のデッキコードを --code で指定 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const f=process.argv[2];if(!f){console.log('使い方: node import_decks.js my_decks.json [--code XXXXXX-XXXXXX-XXXXXX]');process.exit(1)}
const ci=process.argv.indexOf('--code'),want=ci>0?process.argv[ci+1]:null;
const j=JSON.parse(fs.readFileSync(f,'utf8')),ROOT=path.resolve(__dirname,'..');
const ctx=vm.createContext({console});ctx.window=ctx;
for(const n of fs.readdirSync(path.join(ROOT,'ai')).filter(x=>/^ai_.*\.js$/.test(x)))vm.runInContext(fs.readFileSync(path.join(ROOT,'ai',n),'utf8'),ctx);
const out={};
for(const d of j.decks){if(want&&d.code!==want)continue;const cards=d.cards.map(c=>{const o={...c};if(j.dvar&&j.dvar[c.id]!==undefined&&j.dvar[c.id]>=0)o.var=j.dvar[c.id];return o});
  const t=vm.runInContext(`window.CPUAI.detect(${JSON.stringify(cards.map(c=>({name:c.name,t:c.t,n:c.n})))})`,ctx);
  if(!t){console.log('スキップ（対応するAIなし）:',d.code);continue}
  const n=cards.reduce((s,c)=>s+c.n,0);if(out[t]&&!want){console.log(`注意: ${t} が複数あります（${out[t].code} と ${d.code}）。--code で指定してください`);continue}
  out[t]={code:d.code,cards};console.log(`${t}: ${d.code} (${n}枚)`)}
for(const t in out){fs.writeFileSync(path.join(__dirname,'decks',t+'.json'),JSON.stringify(out[t].cards,null,1));console.log('書き込み: decks/'+t+'.json')}
