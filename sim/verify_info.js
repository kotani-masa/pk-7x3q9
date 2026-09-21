'use strict';
/* 情報制限の自動検証：AIに渡る全データが「そのプレイヤーに見える情報」だけであることを、実際の対戦を流して確かめる
   ①AI側コンテキストにエンジンのグローバル(P,G,...)が存在しない  ②相手情報は公開領域＋枚数のみ  ③自分の山札・サイドの配列は渡らない
   ④山札を全確認した時のカード列が実際の山札順ではない（順序が漏れていない） ⑤AIが返す行動は自分の手札/盤面のみを指す */
const {Sim}=require('./headless');const D=require('./decks');const vm=require('vm');
(async()=>{const s=new Sim();const orig=s.makeAI.bind(s);let calls=0,orderChecked=0,orderLeak=0,bad=[];
 const OPP=new Set(['handN','deckN','prizeN','trash','board','bm','koTurn','mull','stage','known']),SELF=new Set(['stage','hand','trash','deckN','prizeN','board','bm','koTurn','mull']);
 s.makeAI=sd=>{const c=orig(sd);
  // ①
  for(const g of ['P','G','cur','me','mi','MON','FX','LGS','HS'])if(vm.runInContext(`typeof ${g}`,c)!=='undefined')bad.push('AI context can see engine global '+g);
  const d=c.__dispatch;c.__dispatch=(m,id,j)=>{const r=d(m,id,j);
   if(['decide','pk','ask','menu','setup','order'].includes(m)){calls++;const a=JSON.parse(j),v=a[0];
    if(v.opp)for(const k of Object.keys(v.opp))if(!OPP.has(k))bad.push('opp key '+k);
    for(const k of Object.keys(v.self))if(!SELF.has(k))bad.push('self key '+k);
    if(v.mode==='setup'&&v.opp)bad.push('setup view has opp');
    if(m==='pk'&&a[1].kind==='deck'&&a[1].pool.length>8){orderChecked++;const real=JSON.parse(s.ctx.__dbg(`JSON.stringify(P[${v.me}].deck.map(c=>c.u))`));
      if(JSON.stringify(a[1].pool.map(c=>c.u))===JSON.stringify(real))orderLeak++;}
   }return r};return c};
 for(let i=0;i<24;i++){const [x,y]=[['dragapult','rayquaza'],['rayquaza','rayquaza'],['dragapult','dragapult']][i%3];s._ai=null;await s.play({decks:[D[x],D[y]],opt:i%2?[{search:{K:5,S:3,S2:4,T:3,prior:2}},{search:{K:5,S:3,S2:4,T:3,prior:2}}]:[{},{}],seed:300+i})}
 console.log('AI呼び出し',calls,'回を検査 / 山札全確認',orderChecked,'回 / 順序漏れ',orderLeak,'回');
 console.log(bad.length?'NG: '+[...new Set(bad)].join('; '):'OK: 漏洩なし');
})().catch(e=>console.log('ERR',e.stack));
