'use strict';
/* 監査：「技・進化先の技・にげるに必要な数を超えてエネルギーを付けた」回数を、1試合あたりで数える
   旧CPU／前バージョンの新AI／今のAI を比較（相手は旧CPU） */
const path=require('path');const {Sim}=require('./headless');const D=require('./decks');
const N=+process.argv[2]||60,prev=process.argv[3]||'/mnt/user-data/outputs/pokeca_cpu_ai/ai';
(async()=>{
 const cfgs=[['旧CPU',new Sim({aiFiles:[]}),{legacy:1}],['前の新AI',new Sim({aiDir:prev,aiFiles:['ai_core.js','ai_dragapult.js','ai_rayquaza.js']}),{}],['今の新AI',new Sim({aiFiles:['ai_core.js','ai_dragapult.js','ai_rayquaza.js']}),{}]];
 for(const deck of ['dragapult','rayquaza']){console.log(`■ ${deck==='dragapult'?'ドラパ':'レックウザ'}（相手：旧CPUのレックウザ／ドラパ）`);
  for(const [nm,sim,opt] of cfgs){let att=0,ex=0,w=0,n=0;
   for(let i=0;i<N;i++){const o=deck==='dragapult'?'rayquaza':'dragapult',seat=i%2;const dk=[seat?D[o]:D[deck],seat?D[deck]:D[o]],op=[seat?{legacy:1}:opt,seat?opt:{legacy:1}];
    const r=await sim.play({decks:dk,opt:op,seed:8000+i});att+=r.aud[seat].att;ex+=r.aud[seat].ex;n++;if(r.win===seat)w++}
   console.log(`  ${nm.padEnd(8)} エネルギーを付けた回数/試合 ${(att/n).toFixed(1)}  うち過剰 ${(ex/n).toFixed(2)}/試合 (${(100*ex/Math.max(1,att)).toFixed(1)}%)  勝率 ${(100*w/n).toFixed(0)}%`)}}
})().catch(e=>console.log('ERR',e.stack));
