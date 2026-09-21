'use strict';
const D=require('./decks');
/* A,B: {deck:'dragapult'|'rayquaza', opt:{...}}。Aが座席0/1を交互に担当。戻り値: {a,b,draw,to,n,turns,why}*/
async function evalMatch(sim,A,B,N,seed0,extra){
  const r={a:0,b:0,draw:0,to:0,n:N,turns:0,whyA:{},whyB:{}};
  for(let i=0;i<N;i++){const sa=i%2;const seat=[sa?B:A,sa?A:B];
    const res=await sim.play({decks:[D[seat[0].deck],D[seat[1].deck]],opt:[seat[0].opt||{},seat[1].opt||{}],seed:seed0+i,maxTurn:(extra&&extra.maxTurn)||80});
    r.turns+=res.turn;
    if(res.win===-1)r.draw++;else if(res.win<0)r.to++;else{const aw=(res.win===sa?0:1)===0;if(aw)r.a++;else r.b++;const w=res.why[res.win].join('+');const t=aw?r.whyA:r.whyB;t[w]=(t[w]||0)+1}}
  r.rate=(r.a+0.5*(r.draw+r.to))/N;return r}
module.exports={evalMatch};
