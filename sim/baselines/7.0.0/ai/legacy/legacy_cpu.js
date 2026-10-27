/* 旧CPUアルゴリズム（比較用ベースライン／新AI未対応デッキ用のフォールバック）。
   盤面の内部状態を直接読む「エミュレータ結合型」で、新AI（ai_core.js ほか）とは別物です。 */
let LW=1;
const knownBas=c=>c.t==='pke'&&mi(c)&&stageOf(c)==='たね';
const remHp=pl=>{const t=lastOf(pl),h=hpOf(pl);return h?h-(t.dm||0):999},enCnt=(q,k)=>eunits(q.piles[k]);
const candyOpts=p=>G.turn<=2?[]:p.hand.filter(y=>y.t==='pke'&&BASE2[nk(y.name)]).filter(y=>['battle',...BN].some(k=>p.piles[k].length&&nk(lastOf(p.piles[k]).name)===BASE2[nk(y.name)]&&stageOf(lastOf(p.piles[k]))==='たね'&&lastOf(p.piles[k]).pt!==G.turn&&lastOf(p.piles[k]).ev!==G.turn));
function dmgVs(a,p,o,c,def){if(!def)return 0;const M=mi(c)||{},D=mi(def)||{},n=a.n;let b=parseInt(String(a.dt).replace(/[^\d]/g,''))||0;
 if(n==='マシンガンコンボ')b=250;else if(n==='ストームエメラルダ')b=50*OWN(p).reduce((s,k)=>s+eunits(p.piles[k]),0);else if(n==='ユニオンビート')b=30*(OWN(p).length-1);
 else if(n==='ぎゃっきょうテール')b=60*OWN(o).filter(k=>/ex$/.test(lastOf(o.piles[k]).name)).length;
 else if(n==='きあいタックル'&&stageOf(def)==='1進化')b+=90;else if(n==='とうしのつばさ'&&/ex$/.test(def.name))b+=90;
 if(b<=0)return 0;const drill=n==='ドリルブレイク';if(!drill&&(def.dg===G.turn||(def.sh===G.turn&&stageOf(c)==='たね'&&M.type!=='無')))return 0;
 if(G.plus30===G.turn&&/(ex|V)$/.test(def.name))b+=30;if(D.weak&&D.weak===M.type)b*=2;if(D.res&&D.res===M.type)b-=30;return Math.max(0,b)}
const estAtk=(a,p,o,c)=>dmgVs(a,p,o,c,lastOf(o.piles.battle));
function ready(p,k){const q=P[1-P.indexOf(p)],pl=p.piles[k],t=lastOf(pl),M=mi(t);if(!M||!M.at)return 0;let b=0;
 for(const a of M.at){if(canPay(a.cost,pl))b=Math.max(b,100+estAtk(a,p,q,t));else b=Math.max(b,60-Math.max(0,a.cost.length-eunits(pl))*12)}return b}
function bestAttack(p,o){const pl=p.piles.battle,t=lastOf(pl),M=mi(t),d=lastOf(o.piles.battle);if(!t||!M||!M.at||!d||G.turn===1||t.na===G.turn)return null;let best=null;
 for(const a of M.at){if(!canPay(a.cost,pl))continue;const x={p,o,c:t,msg:[],k:'battle'};if(a.chk&&a.chk(x))continue;const e=estAtk(a,p,o,t),ko=e>=remHp(o.piles.battle);
  let sc=e+(ko?1000+prize(d)*300:0);if(a.n==='ファントムダイブ')sc+=60;if(a.n==='げきりゅうポンプ')sc+=20;if(a.n==='いれかわる'||a.n==='むかえにいく')sc-=200;if(a.n==='しっぽをまく')sc-=40;
  if(!best||sc>best.sc)best={a,sc,ko,e}}
 return best}
function bossTarget(ks){const p=P[LW],o=P[1-LW],t=lastOf(p.piles.battle),M=mi(t);if(!t||!M||!M.at)return ks[0];let best=null,bs=-1e9;
 for(const k of ks){const def=lastOf(o.piles[k]);let e=0;for(const a of M.at)if(canPay(a.cost,p.piles.battle)&&!(a.chk&&a.chk({p,o,c:t,msg:[],k:'battle'})))e=Math.max(e,dmgVs(a,p,o,t,def));
  const r=remHp(o.piles[k]),sc=(e>=r?1000+prize(def)*100:0)+prize(def)*10-r/20;if(sc>bs){bs=sc;best=k}}return best}
function bossKO(){const p=P[LW],o=P[1-LW],ks=BN.filter(k=>o.piles[k].length);if(!ks.length||G.turn===1)return 0;const k=bossTarget(ks),t=lastOf(p.piles.battle),M=mi(t);if(!k||!M||!M.at)return 0;
 const def=lastOf(o.piles[k]);let e=0;for(const a of M.at)if(canPay(a.cost,p.piles.battle))e=Math.max(e,dmgVs(a,p,o,t,def));if(e<remHp(o.piles[k]))return 0;
 const ba=bestAttack(p,o);if(ba&&ba.ko&&prize(lastOf(o.piles.battle))>=prize(def))return 0;return 96}
function bestEnergyTarget(p,c){let bk=null,bs=0;const o=P[1-P.indexOf(p)];
 for(const k of OWN(p)){const pl=p.piles[k],t=lastOf(pl),M=mi(t);if(!M||!M.at)continue;const sim=[c,...pl];let s=0;
  for(const a of M.at){if(!canPay(a.cost,pl)&&canPay(a.cost,sim))s=Math.max(s,60+estAtk(a,p,o,t)/4+(k==='battle'?60:0))}
  const mx=Math.max(...M.at.map(a=>a.cost.length),1);if(s===0&&eunits(pl)<mx)s=8+(k==='battle'?6:0);if(s>0&&/ex$/.test(t.name))s+=3;if(s>bs){bs=s;bk=k}}
 return bk?{k:bk,s:bs}:null}
function trScore(c){const p=P[LW],o=P[1-LW],T=G.turn,hs=p.hand.length,n=c.name.replace(/\(ACE SPEC\)$/,''),ba=bestAttack(p,o);
 if(c.t==='sup'){if(T===1||G.sup===T)return 0;
  switch(n){case'ボスの指令':return bossKO();
   case'スグリ':{if(ba&&ba.ko)return 0;const sv=G.plus30;G.plus30=T;const b2=bestAttack(p,o);G.plus30=sv;if(b2&&b2.ko){CPU.sug=2;return 94}
    const bk=BN.filter(k=>p.piles[k].length&&ready(p,k)>=100);if((!ba||ba.e<=0)&&bk.length){CPU.sug=1;return 74}return 0}
   case'リーリエの決心':return Math.max(20,92-hs*13);case'博士の研究':return hs<=2?86:20;
   case'ジャッジマン':return hs<=o.hand.length-3?(hs<=3?72:45):(hs<=2?50:10);
   case'メイのはげまし':return(p.side.length>o.side.length&&OWN(p).some(k=>stageOf(lastOf(p.piles[k]))==='2進化')&&p.trash.some(isBE))?80:0;
   case'シアノ':return p.deck.some(isEx)?78:15;case'アカマツ':return p.deck.some(isBE)?82:20;case'トウコ':return 72;case'ヒカリ':return 70;case'暗号マニアの解読':return hs<=3?58:30;default:return 50}}
 if(c.t==='tr'){if(G.noGoods===T)return 0;
  switch(n){case'なかよしポフィン':return room(p)>0&&p.deck.some(y=>y.t==='pke'&&mi(y)&&stageOf(y)==='たね'&&mi(y).hp<=70)?76:0;
   case'ハイパーボール':return hs>=3&&p.deck.some(y=>y.t==='pke')?60:0;case'ポケパッド':return p.deck.some(y=>y.t==='pke'&&!isRule(y))?56:0;
   case'ふしぎなアメ':return candyOpts(p).length?93:0;case'夜のタンカ':return p.trash.some(y=>y.t==='pke'||isBE(y))&&hs<=6?46:0;
   case'アンフェアスタンプ':return p.koTurn===T-1?(o.hand.length>=5&&hs<=4?78:30):0;case'スペシャルレッドカード':return o.side.length<=3&&o.hand.length>=4?82:0;
   case'クラッシュハンマー':return lastOf(o.piles.battle)&&o.piles.battle.some(y=>y.t==='ene')?52:0;case'ぼうけんのランタン':return p.deck.filter(isBE).length>=2?44:0;
   case'ガラスのラッパ':return hasTera(p)&&BN.some(k=>p.piles[k].length)&&p.trash.some(isBE)?68:0;default:return 0}}
 return 0}
function legacyPick(){const p=P[LW],o=P[1-LW],T=G.turn,C=[],add=(key,score,run)=>{if(score>0&&!CPU.tried.has(key))C.push({key,score,run})},inPlay=OWN(p);
 for(const k of inPlay){const t=lastOf(p.piles[k]),M=mi(t),A=M&&M.ab;if(!A||A.passive||A.onBench||abWhy(t,k,p))continue;const nm=A.n;let sc=60;
  if(nm==='おつかいダッシュ'||nm==='ていさつしれい')sc=92;else if(nm==='さかてにとる')sc=93;else if(nm==='こんじきのほのお')sc=84;
  else if(nm==='アドレナブレイン')sc=inPlay.some(z=>(lastOf(p.piles[z]).dm||0)>0)?68:0;
  else if(nm==='カースドボム'){const n=nk(t.name)==='ヨノワール'?13:5,tg=OWN(o).filter(z=>remHp(o.piles[z])<=10*n);sc=tg.length&&prize(lastOf(o.piles[tg[0]]))>=prize(t)?89:0}
  else if(nm==='にげあしドロー')sc=(k!=='battle'&&p.hand.length<=5)?50:0;
  add('ab'+t.u,sc,()=>runAb(t,k))}
 for(const c of p.hand){const M=mi(c),tk='c'+c.u;
  if(M&&M.hab&&G.ab[c.u]!==T&&!M.hab.ok({p,o,c}))add('hab'+c.u,70,()=>runHab(c));
  if(c.t==='pke'&&M&&stageOf(c)==='たね'){if(room(p)>0&&BN.filter(z=>p.piles[z].length).length<4)add(tk,72+(/ex$/.test(c.name)?5:0)+(M.ab&&M.ab.onBench?9:0),()=>playCard(c,freeBench(p),true))}
  else if(c.t==='pke'&&M){for(const z of inPlay)if(evoCheck(p,c,z,false)===''&&EVO[nk(c.name)]&&nk(lastOf(p.piles[z]).name)===EVO[nk(c.name)])add(tk+z,88,()=>playCard(c,z,true))}
  else if(c.t==='tool'&&/^ヒーローマント/.test(c.name)&&stadName()!=='ジャミングタワー'){const z=inPlay.find(k=>!p.piles[k].some(y=>y.t==='tool')&&mi(lastOf(p.piles[k])));if(z)add(tk,56,()=>playCard(c,z,true))}
  else if(c.t==='sta'&&G.stp!==T&&stadName()!==c.name.replace(/\(ACE SPEC\)$/,'')){const n=c.name;let sc=0;if(n==='ゼロの大空洞')sc=hasTera(p)?74:0;else if(n==='危ない廃墟')sc=stadName()?0:34;else if(n==='ジャミングタワー')sc=OWN(o).some(z=>o.piles[z].some(y=>y.t==='tool'))?62:0;add(tk,sc,()=>playCard(c,null,true))}
  else if(c.t==='tr'||c.t==='sup')add(tk,trScore(c),()=>{trScore(c);return playCard(c,null,true)})}
 if(G.eat!==T){let best=null;for(const c of p.hand.filter(y=>y.t==='ene'&&(isBE(y)||/^ネオアッパー/.test(y.name)))){const r=bestEnergyTarget(p,c);if(r&&(!best||r.s>best.s))best={c,...r}}if(best)add('en'+best.c.u,86,()=>playCard(best.c,best.k,true))}
 const at=lastOf(p.piles.battle);if(at&&at.nr!==T){const ba=bestAttack(p,o);if(!ba||ba.e<=0){if(BN.some(k=>p.piles[k].length&&ready(p,k)>=100))add('retreat',64,()=>retreat())}}
 return C.sort((a,b)=>b.score-a.score)[0]}
async function legacyTurn(i){LW=i;const p=P[LW],o=P[1-LW];CPU.tried=new Set();await sleep(CPU.d);
 for(let it=0;it<40&&!G.over&&G.act===LW&&p.piles.battle.length;it++){const a=legacyPick();if(!a)break;CPU.tried.add(a.key);try{await a.run()}catch(e){console.error(e)}await sleep(CPU.d*.8)}
 if(G.over||G.act!==LW)return;const ba=bestAttack(p,o);if(ba&&ba.sc>0){await sleep(CPU.d*.6);await useAttack(ba.a)}
 if(!G.over&&G.act===LW){await sleep(CPU.d*.5);await turnSwitch()}}
function actScore(c){const M=mi(c);if(!M)return 0;const ch=Math.min(...(M.at||[{cost:[1,1,1]}]).map(a=>a.cost.length));return M.hp/10+(/ex$/.test(c.name)?-15:0)-ch*2+(M.ab&&M.ab.onBench?-10:0)}
async function legacySetup(i){LW=i;const p=P[LW];await sleep(CPU.d);
 for(let g=0;g<12&&!p.hand.some(isBas);g++){act(()=>{p.deck.push(...p.hand);p.hand=[];shuffle(p.deck);p.hand=p.deck.splice(0,7);p.mull=(p.mull||0)+1;log(`P2（CPU）がマリガン（${p.mull}回目）`)});await sleep(CPU.d)}
 const bs=p.hand.filter(isBas).sort((a,b)=>actScore(b)-actScore(a));if(bs.length){act(()=>mv(bs[0].u,'battle'));await sleep(CPU.d*.6);
  for(const c of bs.slice(1,5)){act(()=>mv(c.u,freeBench(p)));await sleep(CPU.d*.4)}}
 act(()=>{p.side=p.deck.splice(0,6);p.phase='wait';log('P2（CPU）がサイドをセットしました');finishSetup()})}
function cardVal(c,p){if(c.t==='ene'){if(/^ネオ/.test(c.name))return 55;const t=(c.name.match(/^基本(.)/)||[])[1],need=OWN(p).some(k=>{const pl=p.piles[k],M=mi(lastOf(pl));return M&&M.at&&M.at.some(a=>a.cost.includes(t)&&!canPay(a.cost,pl))});return 30+(need?25:0)}
 if(c.t==='pke'){const M=mi(c),inP=OWN(p).some(k=>nk(lastOf(p.piles[k]).name)===nk(c.name));return(M?M.hp/10:5)+(/ex$/.test(c.name)?12:0)+(M&&stageOf(c)!=='たね'?6:0)+(inP?-8:6)}
 return c.t==='sup'?55:c.t==='tr'?42:34}
function legacyPk(t,pool,n,min,ok,w){LW=w;const p=P[LW],v=x=>cardVal(x,p),disc=/トラッシュする手札|トラッシュするエネルギー|山札にもどすエネルギー|手札にもどすエネルギー/.test(t);
 let s=pool.filter(ok).sort((a,b)=>disc?v(a)-v(b):v(b)-v(a));if(/タイプの異なる/.test(t)){const seen=new Set();s=s.filter(x=>!seen.has(x.name)&&seen.add(x.name))}
 return s.slice(0,Math.max(Math.min(min,s.length),Math.min(n,s.length)))}
function legacyAsk(ks,q,ttl,must,w){LW=w;const p=P[LW],own=P.indexOf(q)===LW,rem=k=>remHp(q.piles[k]),pz=k=>prize(lastOf(q.piles[k]));
 if(!own){if(/呼び出す/.test(ttl))return bossTarget(ks)||ks[0];if(/エネルギーをトラッシュ/.test(ttl))return ks.slice().sort((a,b)=>enCnt(q,b)-enCnt(q,a))[0];
  const amt=/13個/.test(ttl)?130:/5個/.test(ttl)?50:/120ダメージ/.test(ttl)?120:/100ダメージ/.test(ttl)?100:/ベンチ/.test(ttl)?20:30;
  const sc=k=>(rem(k)<=amt?1000+pz(k)*100:0)+pz(k)*20-rem(k)/10;return ks.slice().sort((a,b)=>sc(b)-sc(a))[0]}
 if(/ダメカンを取る/.test(ttl))return ks.slice().sort((a,b)=>(lastOf(q.piles[b]).dm||0)-(lastOf(q.piles[a]).dm||0))[0];
 if(/バトル場に出す|にげる|入れ替え/.test(ttl))return ks.slice().sort((a,b)=>ready(p,b)-ready(p,a)||rem(b)-rem(a))[0];
 if(/つける|つけ替え先|進化/.test(ttl))return ks.slice().sort((a,b)=>ready(p,b)+(b==='battle'?20:0)-ready(p,a)-(a==='battle'?20:0))[0];
 if(/元のポケモン/.test(ttl))return ks.slice().sort((a,b)=>(a==='battle')-(b==='battle')||enCnt(q,b)-enCnt(q,a))[0];
 if(/トラッシュするポケモン/.test(ttl))return ks.slice().sort((a,b)=>rem(a)-rem(b))[0];
 return ks[0]}
const gekiryuOK=()=>BN.some(k=>P[1-LW].piles[k].length&&(remHp(P[1-LW].piles[k])<=120||/ex$/.test(lastOf(P[1-LW].piles[k]).name)));
function legacyMenu(items,ttl,w){LW=w;const L=items.map(x=>x[0]);let i=0;
 if(L.length===2&&L[0]==='はい')i=/120ダメージ/.test(ttl)?(gekiryuOK()?0:1):0;
 else if(/効果を1つ選んで/.test(ttl))i=CPU.sug===1?0:1;
 else if(/動かすダメカン/.test(ttl))i=L.length-1;
 else if(L.some(x=>/ゆきにしずめる/.test(x)))i=(stadName()&&!(stadName()==='ゼロの大空洞'&&hasTera(P[LW])))?0:1;
 else if(L.some(x=>/特性「/.test(x)))i=Math.max(0,L.findIndex(x=>!/使わない/.test(x)));
 else{i=L.findIndex(x=>!/使わない|ここまで|キャンセル|この中にない/.test(x));if(i<0)i=0}
 items[i][1]()}
