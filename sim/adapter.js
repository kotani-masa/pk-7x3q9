/* ---------- CPU対戦：プレイアルゴリズムは外部ファイル（ai/*.js）。ここは盤面⇔AIの橋渡しだけ ----------
   ・AIには「そのプレイヤーに見える情報」だけを渡す（相手の手札・山札の中身と順序・サイドの中身は渡さない）
   ・AIからは「行動（play/ab/hab/retreat/attack/end）」と「選択結果」だけを受け取り、実処理はこの盤面のルール処理が行う
   ・AIは常にJSONの複製を受け取る（盤面オブジェクトそのものには触れない）
   ・未対応デッキは ai/legacy_cpu.js（旧アルゴリズム）にフォールバック */
const isBas=c=>c.t==='pke'&&(!mi(c)||stageOf(c)==='たね');
const AIR=()=>(typeof window!=='undefined'&&window.CPUAI)||null;
const CPUX={ctl:[null,null],type:['',''],opt:[{},{}],err:'',sh:[null,null],sent:[null,null],kn:[[],[]],rvn:0};   // kn: 各プレイヤーが山札から手札に加えた(＝相手に公開された)カードのu   // sent: AIに送信済みのカードデータ(差分だけ送る)
const cj=o=>{const r=AIR();return r&&r.__marshal?o:JSON.parse(JSON.stringify(o))};   // 橋渡し側でJSON化する環境(ヘッドレス)では二重に複製しない
const NKC={},mkey=c=>{const k=NKC[c.name]||(NKC[c.name]=nk(c.name));return VARS[k]?k+'#'+VMAP[c.id]:k},PUBC={};
const unitsL=pl=>ens(pl).flatMap(c=>unitsOf(c,lastOf(pl)));
function cpuPub(c){const M=mi(c);if(!M)return null;return{st:M.st||'たね',ev:EVO[nk(c.name)]||'',hp:M.hp,type:M.type,rc:M.rc,weak:M.weak||'',res:M.res||'',tera:M.tera?1:0,bnc:M.bnc?1:0,
 at:(M.at||[]).map(a=>({n:a.n,dt:a.dt,cost:a.cost})),ab:M.ab?{n:M.ab.n,key:M.ab.key||'',passive:M.ab.passive?1:0,onBench:M.ab.onBench?1:0}:null,hab:M.hab?{n:M.hab.n}:null}}
/* そのプレイヤー視点の盤面。mode: 'setup'(相手情報なし) / 'turn'(合法手つき) / 'ask'(選択中) */
function cpuView(i,mode){const p=P[i],o=P[1-i],T=G.turn,cd={};
 const add=c=>{const k=mkey(c);if(!(k in cd))cd[k]=k in PUBC?PUBC[k]:(PUBC[k]=cpuPub(c));return k};
 const cc=c=>({u:c.u,id:c.id,name:c.name,t:c.t,mk:add(c)});
 const bd=q=>{const r={};for(const k of['battle',...BN]){const pl=q.piles[k];if(!pl.length)continue;const t=lastOf(pl),a=pl.slice(0,-1);
  r[k]={...cc(t),dm:t.dm||0,hp:hpOf(pl)||0,cf:t.cf?1:0,na:t.na||0,nr:t.nr||0,dg:t.dg||0,sh:t.sh||0,pt:t.pt||0,ev:t.ev||0,
   en:a.filter(x=>x.t==='ene').map(x=>x.name),eu:unitsL(pl),tl:a.filter(x=>x.t==='tool').map(x=>x.name),un:a.filter(x=>x.t==='pke').map(x=>x.name)}}return r};
 const v={me:i,turn:T,first:G.fp===undefined?0:G.fp,mode,oppType:CPUX.type[1-i],
  deck:p.cards.map(c=>({id:c.id,name:c.name,t:c.t,n:c.n,mk:add(c)})),
  self:{hand:p.hand.map(cc),stage:p.piles.staging.map(cc),trash:p.trash.map(cc),deckN:p.deck.length,prizeN:p.side.length,board:bd(p),bm:benchMax(i),koTurn:p.koTurn,mull:p.mull||0},
  stadium:stadName()?{name:stadName(),own:P[i].piles.stadium.length?i:1-i}:null,
  fl:{sup:G.sup===T,eat:G.eat===T,stp:G.stp===T,atk:G.atk===T,noGoods:G.noGoods===T,plus30:G.plus30===T,
   abU:[...p.hand,...OWN(p).map(k=>lastOf(p.piles[k]))].filter(c=>G.ab[c.u]===T).map(c=>c.u),nm:Object.keys(G.nm).filter(k=>G.nm[k]===T)}};
 if(mode!=='setup'){v.opp={handN:o.hand.length,deckN:o.deck.length,prizeN:o.side.length,stage:o.piles.staging.map(cc),known:o.hand.filter(c=>CPUX.kn[1-i].includes(c.u)).map(c=>c.name),trash:o.trash.map(cc),board:bd(o),bm:benchMax(1-i),koTurn:o.koTurn,mull:o.mull||0};
  const sh=CPUX.sh[i];v.pz=[];if(sh){v.pz=p.hand.filter(c=>sh.has(c.u)).map(c=>c.name);CPUX.sh[i]=new Set(p.side.map(c=>c.u))}}
 if(mode==='turn'){const at=lastOf(p.piles.battle),M=at&&mi(at),ks=OWN(p),bk=ks.filter(k=>k!=='battle'),lg={evo:[],bench:[],att:{},stad:[],abil:[],habs:[],sup:T!==1&&G.sup!==T,goods:G.noGoods!==T,retreat:null,atk:[],room:room(p)};
  for(const c of p.hand){const m=mi(c);
   if(c.t==='pke'&&m){if(stageOf(c)==='たね'){if(lg.room>0)lg.bench.push(c.u)}
    else if(EVO[nk(c.name)])for(const k of ks)if(nk(lastOf(p.piles[k]).name)===EVO[nk(c.name)]&&evoCheck(p,c,k,false)==='')lg.evo.push({u:c.u,k});
    if(m.hab&&G.ab[c.u]!==T&&!m.hab.ok({p,o,c}))lg.habs.push(c.u)}
   else if(c.t==='ene'&&(isBE(c)||/^ネオアッパー/.test(c.name))){if(G.eat!==T)lg.att[c.u]=ks.slice()}
   else if(c.t==='tool'&&/^ヒーローマント/.test(c.name)){lg.att[c.u]=ks.filter(k=>!p.piles[k].some(y=>y.t==='tool'))}
   else if(c.t==='sta'&&G.stp!==T&&stadName()!==c.name.replace(/\(ACE SPEC\)$/,''))lg.stad.push(c.u)}
  for(const k of ks){const t=lastOf(p.piles[k]),m=mi(t),A=m&&m.ab;if(A&&!A.passive&&!A.onBench&&!abWhy(t,k,p))lg.abil.push({u:t.u,k,n:A.n})}
  if(at&&M){const rc=retreatCost(p,at);lg.retreat=at.nr!==T&&eunits(p.piles.battle)>=rc&&bk.length?{cost:rc,ks:bk}:null;
   if(T!==1&&G.atk!==T&&at.na!==T)for(const a of(M.at||[]))lg.atk.push({n:a.n,ok:canPay(a.cost,p.piles.battle)&&!(a.chk&&a.chk({p,o,c:at,msg:[],k:'battle'}))})}
  v.lg=lg}
 const sn=CPUX.sent[i]||(CPUX.sent[i]={deck:0,cd:new Set()});if(sn.deck)delete v.deck;else sn.deck=1;
 for(const k in cd)if(sn.cd.has(k))delete cd[k];else sn.cd.add(k);
 v.cd=cd;return v}
function cpuPoolKind(p,pool){if(!pool.length)return'none';const has=(a,c)=>a.includes(c);
 if(pool.every(c=>has(p.deck,c)))return pool.length===p.deck.length?'deck':'topN';if(pool.every(c=>has(p.hand,c)))return'hand';if(pool.every(c=>has(p.trash,c)))return'trash';
 if(pool.every(c=>OWN(p).some(k=>has(p.piles[k],c))))return'board';return'other'}
const cpuShuf=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]]}return b};
const mkp=(v,x,i)=>{const k=mkey(x),sn=CPUX.sent[i];if(!(k in v.cd)&&!(sn&&sn.cd.has(k))){v.cd[k]=k in PUBC?PUBC[k]:(PUBC[k]=cpuPub(x));if(sn)sn.cd.add(k)}return k};
function cpuPk(t,pool,n,min,ok,who){const c=CPUX.ctl[who];if(!c)return typeof legacyPk==='function'?legacyPk(t,pool,n,min,ok,who):pool.filter(ok).slice(0,n);
 const p=P[who],kind=cpuPoolKind(p,pool),v=cpuView(who,'ask'),src=kind==='deck'?cpuShuf(pool):pool;
 const q={title:t,n,min,kind,pool:src.map(x=>({u:x.u,id:x.id,name:x.name,t:x.t,mk:mkp(v,x,who),ok:!!ok(x)}))};
 let r=c.pk(cj(v),cj(q))||[];const okU=new Set(pool.filter(ok).map(x=>x.u));r=[...new Set(r)].filter(u=>okU.has(u)).slice(0,n);
 if(r.length<Math.min(min,okU.size))for(const x of pool)if(okU.has(x.u)&&!r.includes(x.u)&&r.length<Math.min(min,okU.size))r.push(x.u);
 return pool.filter(x=>r.includes(x.u))}
function cpuAsk(ks,q,ttl,must,who,cd){const c=CPUX.ctl[who];if(!c)return typeof legacyAsk==='function'?legacyAsk(ks,q,ttl,must,who):ks[0];
 const v=cpuView(who,'ask'),r=c.ask(cj(v),cj({title:ttl,ks,owner:P.indexOf(q)===who?'me':'opp',must:!!must,card:cd?{name:cd.name,t:cd.t}:null}));
 return ks.includes(r)?r:(must||r===undefined?ks[0]:null)}
function cpuMenu(items,ttl,card,who){const c=CPUX.ctl[who];if(!c)return typeof legacyMenu==='function'?legacyMenu(items,ttl,who):items[0][1]();
 const v=cpuView(who,'ask');let r=c.menu(cj(v),cj({title:ttl||'',items:items.map(x=>x[0]),card:card?{name:card.name,t:card.t}:null}));
 if(!(r>=0&&r<items.length))r=0;return items[r][1]()}
function cpuOrder(w){const c=CPUX.ctl[w];return c&&c.order?!!c.order(cj(cpuView(w,'setup'))):false}
async function cpuDo(i,a){const p=P[i],hc=u=>p.hand.find(x=>x.u===u);
 if(a.t==='play'){const c=hc(a.u);if(!c)return;let k=a.k;if(k==='bench')k=freeBench(p);return playCard(c,k||null,true)}
 if(a.t==='ab'){const t=lastOf(p.piles[a.k]);if(t)return runAb(t,a.k)}
 if(a.t==='hab'){const c=hc(a.u);if(c)return runHab(c)}
 if(a.t==='retreat')return retreat()}
async function cpuTurn(i){const c=CPUX.ctl[i];cur=i;
 if(!c){if(typeof legacyTurn==='function')return legacyTurn(i);log('AIファイル（ai/*.js）が読み込まれていません');return turnSwitch()}
 const p=P[i];await sleep(CPU.d);
 for(let it=0;it<70&&!G.over&&G.act===i&&p.piles.battle.length;it++){
  let a=null;const sc=cpuSearchCfg(i,c);if(sc){const C=c.candidates(cj(cpuView(i,'turn')),sc.K);if(C&&C.length>1){a=await cpuSearchPick(i,C,sc);if(a)c.commit(a)}}
  if(!a)a=c.decide(cj(cpuView(i,'turn')));if(!a||a.t==='end')break;
  if(a.t==='attack'){const m=mi(lastOf(p.piles.battle)),at=m&&m.at&&m.at.find(x=>x.n===a.n);if(at){await sleep(CPU.d*.6);await useAttack(at);if(G.over||G.act!==i)return}break}
  const b4=ACTN;CPUX.err='';try{await cpuDo(i,a)}catch(e){console.error(e);log('CPUでエラー：'+e.message)}
  await sleep(0);c.result&&c.result(a,ACTN>b4,CPUX.err);await sleep(CPU.d*.8);if(G.revEv&&G.revEv.n!==CPUX.rvn){CPUX.rvn=G.revEv.n;await sleep(CPU.d*.9)}}
 if(!G.over&&G.act===i){await sleep(CPU.d*.5);await turnSwitch()}}
async function cpuSetup(i){const p=P[i],c=CPUX.ctl[i];cur=i;if(!c&&typeof legacySetup==='function')return legacySetup(i);await sleep(CPU.d);
 for(let g=0;g<12;g++){const bs=p.hand.filter(isBas);let r=bs.length?(c?c.setup(cj(cpuView(i,'setup'))):{}):{mull:true};
  if(!bs.length||(r&&r.mull&&!bs.length)){act(()=>{p.deck.push(...p.hand);p.hand=[];shuffle(p.deck);p.hand=p.deck.splice(0,7);p.mull=(p.mull||0)+1;log(`P${i+1}（CPU）がマリガン（${p.mull}回目）`)});await sleep(CPU.d);continue}
  const av=bs.find(x=>x.u===(r&&r.active))||bs[0];act(()=>mv(av.u,'battle'));await sleep(CPU.d*.6);
  for(const u of((r&&r.bench)||[]).slice(0,5)){const x=p.hand.find(y=>y.u===u&&isBas(y));if(x&&freeBench(p)){act(()=>mv(x.u,freeBench(p)));await sleep(CPU.d*.4)}}break}
 act(()=>{p.side=p.deck.splice(0,6);p.phase='wait';CPUX.sh[i]=new Set(p.side.map(x=>x.u));log(`P${i+1}（CPU）がサイドをセットしました`);finishSetup()})}
function cpuBind(){const R=AIR();[0,1].forEach(i=>{CPUX.type[i]='';CPUX.ctl[i]=null;CPUX.sh[i]=null;CPUX.sent[i]=null;CPUX.kn=[[],[]];if(R&&P[i].cards.length)CPUX.type[i]=R.detect(P[i].cards.map(c=>({name:c.name,t:c.t,n:c.n})))||''});
 [0,1].forEach(i=>{if(!isCpu(i))return;const o=CPUX.opt[i]||{},ty=CPUX.type[i];if(R&&ty&&!o.legacy)CPUX.ctl[i]=R.create(ty,{me:i,opp:CPUX.type[1-i]||'unknown',...o})})}
function cpuCheck(){if(!CPU.on||CPU.busy||G.over||TE||NET.on||HOLD||SEL)return;const w=CTRL();if(!isCpu(w))return;const ph=P[w].phase;if(ph!=='setup'&&!(ph==='play'&&G.act===w))return;CPU.busy=1;cur=w;cpuStep(w)}
async function cpuStep(w){try{if(P[w].phase==='setup')await cpuSetup(w);else await cpuTurn(w)}catch(e){console.error(e);log('CPUでエラー：'+e.message);try{if(G.act===w&&!G.over&&P[w].phase==='play')await turnSwitch()}catch(_){}}finally{CPU.busy=0;render()}}
async function coinToss(){log('先攻・後攻をコインで決めます（オモテ：あなたが選ぶ／ウラ：CPUが選ぶ）');const h=await coin();let first;
 if(h)first=await new Promise(r=>menu(null,[['先攻にする',()=>r(0)],['後攻にする',()=>r(1)]],'コインはオモテ！先攻・後攻を選んでください',1));
 else{first=cpuOrder(1)?1:0;log(`コインはウラ：CPUは${first?'先攻':'後攻'}を選びました`)}
 G.fp=first;log(`先攻：P${first+1}${first?'（CPU）':'（あなた）'}`)}
async function cpuBegin(code){cur=0;if(code){let d=null;try{d=JSON.parse(localStorage['dk2_'+code])}catch(_){}if(!d)return err('そのデッキのデータがありません');P[1].cards=d;P[1].code=code}
 if(!P[1].cards.length)return err('CPUのデッキがありません');CPU.on=1;CPU.who=[0,1];cpuSpd();NET.on=0;G.mode='play';HS=[];await askVars();
 [0,1].forEach(z=>{cur=z;start()});cur=0;cpuBind();G.mode='play';render();await showMissing([1]);
 if(!AIR())log('注意：ai/ フォルダのAIファイルが読み込まれていません（CPUは最低限の動きになります）');
 else log(`CPUのデッキタイプ：${CPUX.type[1]||'未対応（旧アルゴリズム）'} ／ あなたのデッキ：${CPUX.type[0]||'未判定'}`);
 await coinToss();clearInterval(CPU.iv);CPU.iv=setInterval(cpuCheck,600);render()}
function cpuStart(){if(!P[0].cards.length)return err('先に、あなた（P1）のデッキを読み込んでください');
 const items=hist().filter(x=>{try{return!!localStorage['dk2_'+x.c]}catch(_){return false}}).map(x=>[x.n,()=>cpuBegin(x.c)]);
 if(P[1].cards.length)items.unshift(['P2に読み込み済みのデッキを使う',()=>cpuBegin(null)]);
 if(!items.length)return err('CPUのデッキがありません（デッキ読込でP2に読み込むか、保存済みのデッキを用意してください）');
 menu(null,items,'CPUのデッキを選択（保存済みのものが表示されます）')}

/* ---------- ルール処理の補助（マリガン強制・使用待機・CPU速度） ---------- */
let ERRN=0,ATTACHHOOK=null,SIMQ=0,SIMEND=0,SIMSTOP=1,TURNEND=null;   // SIMQ: 先読み(シミュレーション)中。画面・ログ・待ち時間を止める
const STG={c:null,commit:0,done:0};
const stgPause=()=>sleep(isCpu(cur)?CPU.d*.5:350);
/* グッズ・サポート：手札から離して盤面(使用待機)に置く → 効果処理 → 終了後にトラッシュ。
   条件を満たさない／取り消した場合は手札に戻す。コスト支払い済み(commit)や効果実行済み(done)なら取り消せない */
async function runFX(c){const p=me(),idx=p.hand.indexOf(c),n0=ERRN;STG.c=c;STG.commit=0;STG.done=0;
 const back=()=>{const z=p.piles.staging.indexOf(c);if(z>=0){p.piles.staging.splice(z,1);p.hand.splice(Math.min(idx,p.hand.length),0,c)}};
 act(()=>{p.hand.splice(idx,1);p.piles.staging.push(c)});
 let pr;try{pr=FX[c.name](c)}catch(e){pr=Promise.reject(e)}
 if(ERRN!==n0){HS.pop();back();render();return pr}
 try{await pr}catch(e){console.error(e)}
 if(p.piles.staging.includes(c)){
  if(STG.done||STG.commit){await stgPause();act(()=>mv(c.u,'trash'))}
  else{act(back)}}}
/* 強制マリガン：たねポケモンがいなければ、手札を相手に公開して引き直す（いれば行えない） */
const MULLQ=[];
function autoMull(p,i){for(let g=0;g<30&&!p.hand.some(isBas);g++){const cs=p.hand.slice();p.mull=(p.mull||0)+1;
  log(`P${i+1}：たねポケモンがいないため強制マリガン（${p.mull}回目）。手札を公開：${cs.map(c=>c.name).join('、')}`);MULLQ.push({i,cs});
  p.deck.push(...p.hand);p.hand=[];shuffle(p.deck);p.hand=p.deck.splice(0,7)}
 if(CPU.d>0)setTimeout(showMull,0);else MULLQ.length=0}
function showMull(){if(!MULLQ.length||$('#ov').className==='on')return;const m=MULLQ.shift();
 list(`P${m.i+1}のマリガン（手札を公開）`,m.cs,()=>{},[['次へ',()=>{closeAll();showMull()}]],0,null,()=>{closeAll();MULLQ.length=0})}
/* CPUの動作速度（2段階）。立て続けに処理せず、行動の間に間を入れる */
const CPUSPD=[['ゆっくり',2000],['ふつう',1100]];let CPULV=0;try{CPULV=+localStorage.cpulv||0}catch(_){}
const cpuSpd=()=>{CPU.d=CPUSPD[CPULV][1]};
try{CPU.srch=localStorage.cpusrch==='0'?0:1}catch(_){CPU.srch=1}   // 先読み探索（既定ON。価値関数ファイルが無ければ自動で無効）
function cpuSrchToggle(){CPU.srch=CPU.srch?0:1;try{localStorage.cpusrch=CPU.srch}catch(_){}render()}
function cpuSpdToggle(){CPULV=(CPULV+1)%CPUSPD.length;try{localStorage.cpulv=CPULV}catch(_){}cpuSpd();render()}
/* 使用待機スロット。枠・背景は付けない（盤面と同化させる）。
   ひとり回し（視点が手番に反転する）／自分の番：ターン終了ボタンの下。CPU・オンライン戦で相手の番：ボタンは出さず、相手盤面寄りの上側に置く */
const stgSlot=()=>{const i=P.findIndex(x=>x.piles.staging&&x.piles.staging.length);if(i<0)return'';const z=lastOf(P[i].piles.staging),opp=MP()&&i!==VW();
 return`<div class="slot f" style="${at(669,opp?640:868,150,false)};border:0;background:none;outline:0;${opp?'z-index:4':''}" data-a="stg" data-p="${i}" data-u="${z.u}">${cardH(z)}</div>`};

/* ---------- サーチの公開／相手の動作モーション ----------
   ・デッキからサーチして手札に加えたカードは相手に見せる（公開情報。AIにも view.opp.known として渡す）
   ・相手（CPU/オンライン）が手札から出したカード・付けたエネルギーは、手札の位置から飛んでいくモーションで見せる */
let REVSEEN=0,NOFLY=0,LS={loc:{},tr:new Set()};
const revPending=t=>!!(G.revEv&&G.revEv.n!==REVSEEN&&G.revEv.p===t);
function onSearch(i,c){CPUX.kn[i].push(c.u);if(!MP()||i===VW())return;const o={name:c.name,t:c.t,img:c.img},e=G.revEv;
 if(e&&e.n!==REVSEEN&&e.p===i){if(e.cs.length<6)e.cs.push(o)}else G.revEv={n:(G.revN=(G.revN||0)+1),p:i,cs:[o]}}
function snapLoc(){const loc={},tr=new Set();P.forEach((p,i)=>{for(const k of['battle',...BN])p.piles[k].slice(0,-1).forEach(c=>{loc[i+':'+c.u]=k});p.trash.forEach(c=>tr.add(i+':'+c.u))});return{loc,tr}}
function revPlay(){const e=G.revEv;if(!e||e.n===REVSEEN)return;REVSEEN=e.n;if(!MP()||e.p===VW()||!CPU.d)return;
 const mat=$('#mat').getBoundingClientRect(),dk=document.querySelector(`#mat [data-a=deck][data-p="${e.p}"]`),oh=document.querySelector('#mat .oh'),n=e.cs.length,
  w=Math.min(mat.width*.28,140),h=w*88/63,gap=8,x0=mat.left+(mat.width-(n*w+(n-1)*gap))/2,y0=mat.top+mat.height*.30,dur=Math.max(2000,CPU.d*1.4);
 const sr=dk?dk.getBoundingClientRect():{left:mat.left+mat.width*.8,top:mat.top+mat.height*.1,width:w*.5},dr=oh?oh.getBoundingClientRect():{left:mat.left+mat.width/2,top:mat.top,width:20};
 const cap=document.createElement('div');cap.className='bn';cap.style.cssText='font-size:min(3.6vw,18px);padding:6px 14px;top:'+((y0-mat.top)/mat.height*100-6)+'%;z-index:76';cap.textContent=`P${e.p+1}が山札から手札に加えました：${e.cs.map(c=>c.name).join('、')}`;document.body.append(cap);
 A(cap,[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}],{duration:dur},()=>cap.remove());
 e.cs.forEach((c,j)=>{const x=x0+j*(w+gap),g=document.createElement('div');g.className='fl';g.style.cssText=`left:${x}px;top:${y0}px;width:${w}px;height:${h}px;z-index:75;box-shadow:0 0 12px #000`;g.innerHTML=cardH(c);document.body.append(g);
  A(g,[{transform:`translate(${sr.left-x}px,${sr.top-y0}px) scale(${(sr.width||w*.5)/w})`,opacity:.9},{transform:'translate(0,0) scale(1)',opacity:1,offset:.22},{transform:'translate(0,0) scale(1)',opacity:1,offset:.78},
   {transform:`translate(${dr.left+dr.width/2-w*.15-x}px,${dr.top-y0}px) scale(.3)`,opacity:.25}],{duration:dur,delay:j*150,easing:'ease-in-out',fill:'both'},()=>g.remove())})}
function oppFly(el,c,n,pv,hc,d){const i=+n.p,oh=document.querySelector('#mat .oh');if(!oh)return 0;const r=n.r,ohr=oh.getBoundingClientRect();let src;
 if(LS.tr.has(i+':'+c.u)){const z=document.querySelector(`#mat [data-a=trash][data-p="${i}"]`);src=z&&z.getBoundingClientRect()}   // トラッシュから出たカード
 else if(hc[i]<LASTHC[i])src={left:ohr.left+ohr.width/2-r.width/2,top:ohr.top,width:r.width,height:r.height};                       // 手札から出たカード
 else src=pv.z[i];                                                                                                                    // 山札から出たカード（なかよしポフィン等）
 if(!src||!src.width)return 0;hideFly(el,cardH(c),src,r,d);return 1}
function oppAttachFly(pv,hc,d){if(!MP())return;const i=1-VW(),oh=document.querySelector('#mat .oh');if(!oh||!pv.z[i])return;const ohr=oh.getBoundingClientRect();
 for(const k of['battle',...BN])P[i].piles[k].slice(0,-1).forEach(c=>{if(c.t==='pke'||(i+':'+c.u) in LS.loc)return;
  const s=document.querySelector(`#mat [data-a=pile][data-p="${i}"][data-k="${k}"]`);if(!s)return;const b=s.getBoundingClientRect(),w=b.width*.8,h=w*88/63;if(!b.width)return;
  const src=hc[i]<LASTHC[i]?{left:ohr.left+ohr.width/2-w/2,top:ohr.top,width:w,height:h}:pv.z[i];
  fly(cardH(c),src,{left:b.left+b.width*.1,top:b.top+b.height*.35,width:w,height:h},{fade:1,delay:d++*90})})}

/* ---------- 先読み探索 ----------
   ・候補：通常のAIの上位＋エネルギーの付け先全部＋技ごと＋「攻撃しない」
   ・評価：実際のルール処理で「その行動→(残りは通常のAIで)自分の番→相手の番→自分の次の番」まで進め、終了局面を価値関数(勝率予測)で採点
     段階1＝この番の終わりまで(全候補・安価) → 段階2＝上位候補だけ2ターン先まで(相手の番を含む)
   ・隠れた情報は使わない：自分の山札・サイドは混ぜ直す。相手の手札・山札・サイドは、デッキタイプの標準リスト
     （− 場・トラッシュ・公開済みのカード）から仮定して作り直す（実際の中身は見ない）。標準リストが無いタイプは段階1のみ */
const prngF=seed=>{let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
function cpuSearchCfg(i,c){if(SIMQ||!c||!c.candidates||!c.hasValue||!c.hasValue())return null;const o=CPUX.opt[i]&&CPUX.opt[i].search;if(o)return o;return CPU.srch?{K:5,S:3,S2:4,T:3,prior:2}:null}
async function simTurn(i,ctl,forced){
 for(let it=0;it<60&&!G.over&&G.act===i&&!SIMEND&&P[i].piles.battle.length;it++){
  let a;if(forced){a=forced;forced=null}else a=ctl.decide(cj(cpuView(i,'turn')));
  if(!a||a.t==='end')break;
  if(a.t==='attack'){const m=mi(lastOf(P[i].piles.battle)),at=m&&m.at&&m.at.find(x=>x.n===a.n);if(at)await useAttack(at);break}
  const b4=ACTN;CPUX.err='';try{await cpuDo(i,a)}catch(e){}
  ctl.result&&ctl.result(a,ACTN>b4,CPUX.err)}}
/* 相手の隠れた領域（手札・山札・サイド）を、標準リスト−見えているカード から仮定して作り直す */
function detOpp(i,ref,knownU){const o=P[1-i],cnt={},add=n=>cnt[n]=(cnt[n]||0)+1;
 for(const k in o.piles)o.piles[k].forEach(c=>add(c.name));o.trash.forEach(c=>add(c.name));
 const keep=o.hand.filter(c=>knownU.has(c.u));keep.forEach(c=>add(c.name));
 const pool=[];for(const[n,c]of ref)for(let j=0;j<c-(cnt[n]||0);j++)pool.push(n);
 const nh=o.hand.length-keep.length,nd=o.deck.length,ns=o.side.length,need=nh+nd+ns;shuffle(pool);
 while(pool.length<need)pool.push(ref[Math.random()*ref.length|0][0]);pool.length=need;
 const tm=n=>{const c=o.cards.find(x=>x.name===n);return c?{id:c.id,img:c.img,t:c.t}:{id:'ref_'+n,img:'',t:(ref.find(r=>r[0]===n)||[0,0,'tr'])[2]}};let q=0;const mk=n=>({u:'s'+(q++),name:n,...tm(n)});
 o.hand=[...keep,...pool.splice(0,nh).map(mk)];o.side=pool.splice(0,ns).map(mk);o.deck=pool.map(mk)}
async function cpuSearchPick(i,C,sc){
 const R=AIR();if(!R)return null;const P0=P,G0=G,cur0=cur,snap=JSON.stringify([P,G,cur]),sv={sh:CPUX.sh,sent:CPUX.sent,kn:CPUX.kn,ctl:CPUX.ctl,who:CPU.who,HS,TE,rnd:Math.random,ah:ATTACHHOOK,te:TURNEND,rv:REVSEEN,stg:{...STG},actn:ACTN};
 const seed0=(G.turn*7919+ACTN*31+i)>>>0,ty=[CPUX.type[0],CPUX.type[1]],o=CPUX.opt,ref=R.ref?R.ref(ty[1-i]):null,knownU=new Set(CPUX.kn[1-i]);
 const terminal=()=>G.win===i?1:G.win===-1?.5:0;
 const run=async(cand,deep,s)=>{
  [P,G,cur]=JSON.parse(snap);SIMEND=0;Math.random=prngF(seed0+s*101);
  const me=P[i],pool=me.deck.concat(me.side);shuffle(pool);me.side=pool.splice(0,me.side.length);me.deck=pool;   // 自分の山札とサイドの中身は分からない→混ぜ直す
  if(deep)detOpp(i,ref,knownU);
  CPUX.sh=[null,null];CPUX.sent=[null,null];CPUX.kn=[[],[]];const ctl=[null,null];
  for(const z of[0,1]){if(ty[z]&&!(o[z]&&o[z].legacy))ctl[z]=R.create(ty[z],{me:z,opp:ty[1-z]||'unknown',...(o[z]||{}),search:null})}
  CPUX.ctl=ctl;cur=i;SIMSTOP=deep?0:1;
  try{await simTurn(i,ctl[i],cand.a);
   if(deep){
    if(!G.over&&G.act===i)await turnSwitch();                                             // 自分の番を終える
    if(!G.over&&ctl[G.act]){const w=G.act;await simTurn(w,ctl[w],null);if(!G.over&&G.act===w)await turnSwitch()}   // 相手の番（標準AI）
    if(!G.over&&G.act===i){SIMSTOP=1;SIMEND=0;await simTurn(i,ctl[i],null)}                  // 自分の次の番（終わりまで）
   }
   return G.over?terminal():ctl[i].value(cj(cpuView(i,'turn')))}catch(e){return .5}};
 let best=null;
 try{SIMQ=1;HS={push(){},pop(){},shift(){},length:0};ATTACHHOOK=null;TURNEND=null;CPU.who=[1,1];
  for(const c of C){let sum=0;for(let s=0;s<sc.S;s++)sum+=await run(c,0,s);c.v=sum/sc.S}                                  // 段階1
  if(ref&&sc.T){const top=[...C].sort((x,y)=>y.v-x.v).slice(0,sc.T);if(!top.includes(C[0]))top.push(C[0]);
   for(const c of top){let sum=0;for(let s=0;s<sc.S2;s++)sum+=await run(c,1,s);c.v2=sum/sc.S2}}                              // 段階2（相手の番を含む）
 }finally{P=P0;G=G0;cur=cur0;Object.assign(STG,sv.stg);SIMQ=0;SIMEND=0;SIMSTOP=1;HS=sv.HS;CPUX.sh=sv.sh;CPUX.sent=sv.sent;CPUX.kn=sv.kn;CPUX.ctl=sv.ctl;CPU.who=sv.who;TE=sv.TE;Math.random=sv.rnd;ATTACHHOOK=sv.ah;TURNEND=sv.te;REVSEEN=sv.rv;ACTN=sv.actn}
 const deepOn=C.some(c=>c.v2!==undefined);let bs=-1e9;
 C.forEach((c,j)=>{if(deepOn&&c.v2===undefined)return;const t=(deepOn?c.v2*.7+c.v*.3:c.v)*100+(j===0?sc.prior:0);if(t>bs){bs=t;best=c}});
 return best&&best.a}
