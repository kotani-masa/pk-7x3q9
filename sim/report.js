'use strict';
/* 最終評価：旧CPU／新AI(調整前)／新AI(調整後) を、3つの組み合わせで総当たり比較（座席・先攻後攻は交互/ランダム） */
const fs=require('fs'),path=require('path'),vm=require('vm');
const {Sim}=require('./headless');const {evalMatch}=require('./evalm');
const N=+process.argv[2]||200,ROOT=path.resolve(__dirname,'..');
const sim=new Sim({aiFiles:['ai_core.js','ai_dragapult.js','ai_rayquaza.js']});
const ctx=sim.makeAI(1),DEF={},TUN={};
for(const n of ['dragapult','rayquaza']){DEF[n]=JSON.parse(vm.runInContext(`JSON.stringify(window.CPUAI.strategies.${n}.defaults)`,ctx));
  const f=path.join(ROOT,`ai/params_${n}.js`);TUN[n]=fs.existsSync(f)?{...DEF[n],...JSON.parse(fs.readFileSync(f,'utf8').match(/=\s*(\{[\s\S]*?\});/)[1])}:DEF[n]}
const L=d=>({deck:d,opt:{legacy:1}}),W=d=>({deck:d,opt:{params:DEF[d]}}),T=d=>({deck:d,opt:{params:TUN[d]}});
const ci=(a,n)=>{const p=a/n,se=Math.sqrt(p*(1-p)/n);return `${(p*100).toFixed(1)}% ±${(1.96*se*100).toFixed(1)}`};
(async()=>{const out=[];const P=async(label,A,B,seed)=>{const r=await evalMatch(sim,A,B,N,seed);const dec=r.a+r.b;out.push({label,rate:r.rate,a:r.a,b:r.b,draw:r.draw,to:r.to,turns:r.turns/N});
  console.log(label.padEnd(58),`${ci(r.a+0.5*(r.draw+r.to),N)}  (勝${r.a}/負${r.b}/分${r.draw+r.to})  平均${(r.turns/N).toFixed(1)}T`);return r};
 const DN={dragapult:'ドラパ',rayquaza:'レックウザ'};
 console.log(`\n■ 3つの組み合わせ（N=${N}/セル。数字は左側の勝率）`);
 await P('[旧CPU] ドラパ vs レックウザ',L('dragapult'),L('rayquaza'),31000);
 await P('[旧CPU] ドラパ vs ドラパ(ミラー)',L('dragapult'),L('dragapult'),32000);
 await P('[旧CPU] レックウザ vs レックウザ(ミラー)',L('rayquaza'),L('rayquaza'),33000);
 await P('[新AI 調整前] ドラパ vs レックウザ',W('dragapult'),W('rayquaza'),34000);
 await P('[新AI 調整後] ドラパ vs レックウザ',T('dragapult'),T('rayquaza'),35000);
 console.log(`\n■ 同じデッキで、旧CPUと新AIを戦わせる（相手は旧CPU）`);
 for(const d of ['dragapult','rayquaza'])for(const o of ['dragapult','rayquaza']){
  await P(`${DN[d]}: 新AI調整前 vs 旧CPU（相手=${DN[o]}）`,W(d),{deck:o,opt:{legacy:1}},40000+(d==='dragapult'?0:1000)+(o==='dragapult'?0:500));
  await P(`${DN[d]}: 新AI調整後 vs 旧CPU（相手=${DN[o]}）`,T(d),{deck:o,opt:{legacy:1}},40000+(d==='dragapult'?0:1000)+(o==='dragapult'?0:500));}
 console.log(`\n■ ミラー：調整後 vs 調整前（同じデッキ同士）`);
 for(const d of ['dragapult','rayquaza'])await P(`${DN[d]}: 調整後 vs 調整前`,T(d),W(d),50000+(d==='dragapult'?0:1000));
 fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(out,null,1));
})().catch(e=>console.log('ERR',e.stack));
