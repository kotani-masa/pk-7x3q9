'use strict';
/* 価値関数の学習データ生成(v2)：指定デッキ(--deck)が複数の相手(--vs,カンマ区切り)と戦う自己対戦。探索OFF。席は交互。
   出力は value_data.js と同じ形式 [型, 相手型, 特徴量, 勝敗, ターン]。 */
const fs=require('fs');const {Sim}=require('../lib/headless');const D=require('../lib/decks');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const DECK=arg('deck','rayquaza'),VS=arg('vs','zoroark,dragapult,rayquaza').split(','),N=+arg('games',600),SEED=+arg('seed',1),OUT=arg('out');
(async()=>{const s=new Sim();const rows=[];const t0=Date.now();
 for(let g=0;g<N;g++){const vs=VS[g%VS.length],seat=(g>>1)%2,ty=seat?[vs,DECK]:[DECK,vs];
  const r=await s.play({decks:[D[ty[0]],D[ty[1]]],opt:[{},{}],seed:SEED*1000000+g,rec:1,maxTurn:80});
  if(r.win<-1||r.win===undefined)continue;
  for(const [i,f,t] of r.rec)if(ty[i]===DECK)rows.push([ty[i],ty[1-i],f.map(x=>+x.toFixed(4)),r.win===i?1:r.win===-1?0.5:0,t])}
 fs.writeFileSync(OUT,JSON.stringify(rows));console.log(`${N}試合 → ${rows.length}局面 (${((Date.now()-t0)/1000).toFixed(0)}s)`)})().catch(e=>console.log('ERR',e.stack));
