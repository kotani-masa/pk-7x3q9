const {Sim}=require('./headless');const {evalMatch}=require('./evalm');
(async()=>{const s=new Sim();const N=+process.argv[2]||10;const SR=JSON.parse(process.argv[3]||'{"K":5,"S":3,"S2":4,"T":3,"prior":2}');
 for(const d of (process.argv[4]||'dragapult,rayquaza').split(',')){const t0=Date.now();const r=await evalMatch(s,{deck:d,opt:{search:SR}},{deck:d},N,130000);const se=Math.sqrt(r.rate*(1-r.rate)/N)*196;
  console.log(`${d}ミラー 深い探索あり vs なし: ${(r.rate*100).toFixed(1)}% ±${se.toFixed(1)} (${r.a}勝${r.b}敗${r.draw+r.to}分) ${((Date.now()-t0)/N/1000).toFixed(2)}s/試合`)}
})().catch(e=>console.log('ERR',e.stack));
