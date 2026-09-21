const {Sim}=require('./headless');const {evalMatch}=require('./evalm');
(async()=>{const s=new Sim();const N=+process.argv[2]||100,K=+process.argv[3]||4,S=+process.argv[4]||2,pr=+(process.argv[5]??3),decks=(process.argv[6]||'dragapult,rayquaza').split(',');
 for(const d of decks){const t0=Date.now();const r=await evalMatch(s,{deck:d,opt:{search:{K,S,prior:pr}}},{deck:d},N,120000);
  const se=Math.sqrt(r.rate*(1-r.rate)/N)*196;console.log(`[K${K} S${S} prior${pr}] ${d}ミラー 探索あり vs なし: ${(r.rate*100).toFixed(1)}% ±${se.toFixed(1)} (${r.a}勝${r.b}敗${r.draw+r.to}分) ${((Date.now()-t0)/N/1000).toFixed(2)}s/試合`)}
})().catch(e=>console.log('ERR',e.stack));
