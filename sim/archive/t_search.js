const {Sim}=require('./headless');const {evalMatch}=require('./evalm');
(async()=>{const s=new Sim();const N=+process.argv[2]||40,K=+process.argv[3]||4,S=+process.argv[4]||2,pr=+(process.argv[5]??3);
 const SR={search:{K,S,prior:pr}};
 for(const [a,b] of [['dragapult','rayquaza'],['rayquaza','dragapult'],['dragapult','dragapult'],['rayquaza','rayquaza']]){
  const t0=Date.now();const r=await evalMatch(s,{deck:a,opt:SR},{deck:b},N,90000);
  console.log(`探索あり ${a} vs 探索なし ${b}: 勝率 ${(r.rate*100).toFixed(1)}% (${r.a}勝${r.b}敗${r.draw+r.to}分)  ${((Date.now()-t0)/N/1000).toFixed(2)}s/試合`)}
})().catch(e=>console.log('ERR',e.stack));
