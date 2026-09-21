'use strict';
const {Sim}=require('./headless');const {evalMatch}=require('./evalm');
const part=process.argv[2]||'a',N=+process.argv[3]||150;const s=new Sim();const L={legacy:1},SR={search:{K:4,S:2,prior:3}};
const ci=(r,n)=>{const p=r.rate,se=1.96*Math.sqrt(p*(1-p)/n)*100;return `${(p*100).toFixed(1)}% ±${se.toFixed(1)}`};
const SD={search:{K:5,S:3,S2:4,T:3,prior:2}};
const nm={dragapult:'ドラパ',rayquaza:'レックウザ'};
const P=async(label,A,B,seed,n)=>{const t0=Date.now();const r=await evalMatch(s,A,B,n,seed);console.log(label.padEnd(46),ci(r,n),`(勝${r.a}/負${r.b}/分${r.draw+r.to}) ${((Date.now()-t0)/n/1000).toFixed(2)}s/試合`)};
(async()=>{
 if(part==='a'){console.log('■ 旧CPU同士（左のデッキの勝率）');
  await P('旧CPU ドラパ vs レックウザ',{deck:'dragapult',opt:L},{deck:'rayquaza',opt:L},1000,200);await P('旧CPU ドラパ ミラー',{deck:'dragapult',opt:L},{deck:'dragapult',opt:L},1100,200);await P('旧CPU レックウザ ミラー',{deck:'rayquaza',opt:L},{deck:'rayquaza',opt:L},1200,200);
  console.log('\n■ 新AI（探索なし） vs 旧CPU');
  for(const d of['dragapult','rayquaza'])for(const o of['rayquaza','dragapult'])await P(`${nm[d]} 新AI vs 旧CPU(${nm[o]})`,{deck:d},{deck:o,opt:L},2000+(d==='dragapult'?0:100)+(o==='dragapult'?50:0),N);
  console.log('\n■ 新AI同士 ドラパ vs レックウザ');await P('探索なし同士',{deck:'dragapult'},{deck:'rayquaza'},3000,200)}
 if(part==='b'){console.log('■ 新AI（探索あり） vs 旧CPU');
  for(const d of['dragapult','rayquaza'])for(const o of['rayquaza','dragapult'])await P(`${nm[d]} 探索あり vs 旧CPU(${nm[o]})`,{deck:d,opt:SR},{deck:o,opt:L},2000+(d==='dragapult'?0:100)+(o==='dragapult'?50:0),N)}
 if(part==='c'){console.log('■ ドラパ vs レックウザ（左=ドラパの勝率）');await P('探索あり同士',{deck:'dragapult',opt:SR},{deck:'rayquaza',opt:SR},3000,60);
  await P('ドラパ探索あり vs レックウザ探索なし',{deck:'dragapult',opt:SR},{deck:'rayquaza'},3100,60);await P('ドラパ探索なし vs レックウザ探索あり',{deck:'dragapult'},{deck:'rayquaza',opt:SR},3200,60)}
if(part==='d'){console.log('■ 深い探索あり vs 旧CPU');await P('ドラパ 深い探索 vs 旧CPU(レックウザ)',{deck:'dragapult',opt:SD},{deck:'rayquaza',opt:L},2000,N);await P('ドラパ 深い探索 vs 旧CPU(ドラパ)',{deck:'dragapult',opt:SD},{deck:'dragapult',opt:L},2050,N)}
 if(part==='e'){console.log('■ 深い探索あり vs 旧CPU');await P('レックウザ 深い探索 vs 旧CPU(レックウザ)',{deck:'rayquaza',opt:SD},{deck:'rayquaza',opt:L},2100,N);await P('レックウザ 深い探索 vs 旧CPU(ドラパ)',{deck:'rayquaza',opt:SD},{deck:'dragapult',opt:L},2150,N)}
})().catch(e=>console.log('ERR',e.stack));
