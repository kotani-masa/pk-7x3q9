'use strict';
/* 価値関数の学習データ生成：自己対戦で「自分の番の終わりの局面(特徴量)」と「その番のプレイヤーが最終的に勝ったか」を記録 */
const fs=require('fs');const {Sim}=require('./headless');const D=require('./decks');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const SRCH=arg('search',0)==='1',N=+arg('games',600),SEED=+arg('seed',1),OUT=arg('out','data_a.json');
(async()=>{const s=new Sim({aiFiles:['ai_core.js','ai_dragapult.js','ai_rayquaza.js','params_dragapult.js','params_rayquaza.js','value_model.js']});
 const M=[['dragapult','rayquaza',0,0],['rayquaza','dragapult',0,0],['dragapult','dragapult',0,0],['rayquaza','rayquaza',0,0],['dragapult','rayquaza',0,1],['rayquaza','dragapult',0,1],['dragapult','rayquaza',1,0],['rayquaza','dragapult',1,0]];
 const rows=[];const t0=Date.now();
 for(let g=0;g<N;g++){const [a,b,la,lb]=M[g%M.length];
  const r=await s.play({decks:[D[a],D[b]],opt:[la?{legacy:1}:(SRCH?{search:{K:4,S:2,prior:3}}:{}),lb?{legacy:1}:(SRCH?{search:{K:4,S:2,prior:3}}:{})],seed:SEED*100000+g,rec:1});
  if(r.win<-1||r.win===undefined)continue;const ty=[a,b];
  for(const [i,f,t] of r.rec)rows.push([ty[i],ty[1-i],f.map(x=>+x.toFixed(4)),r.win===i?1:r.win===-1?0.5:0,t])}
 fs.writeFileSync(OUT,JSON.stringify(rows));console.log(`${N}試合 → ${rows.length}局面 (${((Date.now()-t0)/1000).toFixed(0)}s) → ${OUT}`)})().catch(e=>console.log('ERR',e.stack));
