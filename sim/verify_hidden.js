'use strict';
/* 隠れた情報の不変性テスト：相手の手札・山札・サイドの「並び」を入れ替えても、先読み（段階2：相手の手札を仮定して2ターン先まで）の評価が変わらないことを確認する */
const {Sim}=require('./headless');const D=require('./decks');
(async()=>{const s=new Sim();let same=0,diff=0,tot=0;const ex=[];
 for(let k=0;k<(+process.env.NC||8);k++){const [a,b]=[['dragapult','rayquaza'],['rayquaza','dragapult'],['dragapult','dragapult'],['rayquaza','rayquaza']][k%4];
  await s.play({decks:[D[a],D[b]],opt:[{},{}],seed:(+process.env.SB||700)+k,maxTurn:6+k%3});const d=s.ctx.__dbg;
  d("G.over=0;G.win=undefined");const i=d("G.act");
  const run=async tag=>JSON.parse(await d(`(async()=>{const i=${i};const C=CPUX.ctl[i].candidates(cj(cpuView(i,'turn')),5);const a=await cpuSearchPick(i,C,{K:5,S:3,S2:4,T:3,prior:2});return JSON.stringify(C.map(c=>[c.key,c.v===undefined?null:+c.v.toFixed(4),c.v2===undefined?null:+c.v2.toFixed(4)]))})()`));
  const r1=await run();
  // 相手の隠れた領域(手札・山札・サイド)の並びを入れ替える（公開済みカードは動かさない）
  d(`(()=>{const o=P[1-${i}],kn=new Set(CPUX.kn[1-${i}]);const mv=[...o.hand.filter(c=>!kn.has(c.u)),...o.deck,...o.side];const nh=o.hand.filter(c=>!kn.has(c.u)).length,nd=o.deck.length;
    for(let x=mv.length-1;x>0;x--){const y=(x*7919+13)%(x+1);[mv[x],mv[y]]=[mv[y],mv[x]]}o.hand=[...o.hand.filter(c=>kn.has(c.u)),...mv.slice(0,nh)];o.deck=mv.slice(nh,nh+nd);o.side=mv.slice(nh+nd)})()`);
  const r2=await run();
  const m2=new Map(r2.map(x=>[x[0],x]));for(const [key,v,v2] of r1){const y=m2.get(key);if(!y)continue;if(v2===null&&y[2]===null)continue;tot++;if(v2===y[2])same++;else{diff++;if(ex.length<3)ex.push(`${key}: ${v2} vs ${y[2]}`)}}}
 console.log(`段階2の評価値 ${tot}件のうち、相手の隠れた並びを入れ替えても一致: ${same}件 / 不一致: ${diff}件`);if(ex.length)console.log('不一致例:',ex.join(' ; '));
 console.log(diff===0?'OK: 相手の実際の手札・山札・サイドの内容に依存していない':'NG: 依存あり');
})().catch(e=>console.log('ERR',e.stack));
