'use strict';
/* 調整済みパラメータ(ai/params_*.js) と 初期値の比較（新しい乱数シード）。誤差を見るために試合数を多めに */
const fs=require('fs'),path=require('path'),vm=require('vm');const {Sim}=require('./headless');const {evalMatch}=require('./evalm');
const deck=process.argv[2]||'rayquaza',N=+process.argv[3]||200;
const s=new Sim({aiFiles:['ai_core.js','ai_dragapult.js','ai_rayquaza.js','ai_refs.js']});const ctx=s.makeAI(1);
const DEF=JSON.parse(vm.runInContext(`JSON.stringify(window.CPUAI.strategies.${deck}.defaults)`,ctx));
const f=path.join(__dirname,`../ai/params_${deck}.js`);const m=fs.readFileSync(f,'utf8').match(/=\s*(\{[\s\S]*?\});/);const TUN={...DEF,...JSON.parse(m[1])};
const other=deck==='rayquaza'?'dragapult':'rayquaza';const ci=(r)=>{const p=r.rate,se=196*Math.sqrt(p*(1-p)/N);return `${(p*100).toFixed(1)}% ±${se.toFixed(1)}`};
(async()=>{for(const [lab,P] of [['初期値',DEF],['調整後',TUN]]){
  const a=await evalMatch(s,{deck,opt:{params:P}},{deck:other},N,77000),b=await evalMatch(s,{deck,opt:{params:P}},{deck:other,opt:{legacy:1}},N,78000),c=await evalMatch(s,{deck,opt:{params:P}},{deck,opt:{legacy:1}},N,79000);
  console.log(`${deck} ${lab}: vs 新AI(${other}) ${ci(a)} | vs 旧CPU(${other}) ${ci(b)} | vs 旧CPU(${deck}) ${ci(c)}`)}})();
