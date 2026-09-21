const {Sim}=require('./headless');const D=require('./decks');
(async()=>{const s=new Sim({aiFiles:[]});const N=+process.argv[2]||100;
 for(const [a,b] of [['dragapult','rayquaza'],['dragapult','dragapult'],['rayquaza','rayquaza']]){
  const res={P0:0,P1:0,draw:0,timeout:0},why={},fpw=[0,0,0,0];let turns=0;const t0=Date.now();
  for(let i=0;i<N;i++){const r=await s.play({decks:[D[a],D[b]],opt:[{legacy:1},{legacy:1}],seed:1000+i});
   const k=r.win===0?'P0':r.win===1?'P1':r.win===-1?'draw':'timeout';res[k]++;turns+=r.turn;
   if(r.win>=0){fpw[(r.win===r.fp?0:1)]++;const w=r.why[r.win].join('+');why[w]=(why[w]||0)+1}}
  console.log(a.padEnd(10),'vs',b.padEnd(10),JSON.stringify(res),'先攻勝ち',fpw[0],'後攻勝ち',fpw[1],'avgTurn',(turns/N).toFixed(1),JSON.stringify(why),((Date.now()-t0)/N|0)+'ms');}
})();
