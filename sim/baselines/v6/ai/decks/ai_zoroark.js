/* Nのゾロアークex policy v5. Public observation only; no DOM/game globals. */
(function(root){
'use strict';
const Z='Nのゾロアークex', B='Nのゾロア', E='Nのゼクロム', R='Nのレシラム', P='モモワロウex', M='マシマシラ', Y='イベルタル';
const values=o=>Object.values(o||{}), entries=o=>Object.entries(o||{}), dark=c=>/^基本悪エネルギー/.test(c.name), base=n=>n.replace(/\(ACE SPEC\)$/,'');
const defaults={lineTarget:3,benchFloor:25,drawReserve:3},space={lineTarget:[2,3],benchFloor:[10,45],drawReserve:[2,6]};
const prize=c=>/^メガ.*ex$/.test(c.name)?3:/(ex|EX|GX|V|VSTAR)$/.test(c.name)?2:1;
class Policy{
 constructor(opt={}){this.opt=opt;this.prm={...defaults,...root.CPUAI.tuned?.zoroark,...opt.params};this.cd={};this.deck=[];this.seen=new Set();this.trace=[];this.plan=null;}
 ingest(v){if(this.lastDeckN!==undefined&&v.self.deckN>this.lastDeckN)this.knownAbsent=null;this.lastDeckN=v.self.deckN;Object.assign(this.cd,v.cd||{});if(v.deck)this.deck=v.deck;this.v=v;this.s=v.self;this.b=this.s.board;this.h=this.s.hand;this.o=v.opp||{board:{},prizeN:6,handN:0};this.ob=this.o.board;this.drag=values(this.ob).some(c=>/ドラパルト|ドロンチ|ドラメシヤ|ヨマワル|サマヨール|ヨノワール/.test(c.name));}
 meta(c){return c&&this.cd[c.mk]||{};}
 n(n){return values(this.b).filter(c=>c.name===n).length;}
 hand(n){return this.h.find(c=>base(c.name)===n);}
 energy(c){return(c.eu||[]).filter(x=>x==='悪'||x==='*').length;}
 countLine(){return this.n(Z)+this.n(B);}
 tool(c,n){return(this.v.stadium||{}).name!=='ジャミングタワー'&&(c.tl||[]).some(x=>x.startsWith(n));}
 canBench(c){
 const after=values(this.b).concat(c),cap=(this.s.bm||5)+1;
 if(after.length>cap)return false;
 const line=after.filter(x=>[Z,B].includes(x.name)).length;
 // Restore the core first. Reservations must never prevent the missing core card itself.
 if(c.name===B&&this.countLine()<2)return true;
 if(c.name===E&&!this.n(E)&&line)return true;
 const reserveLine=Math.max(0,2-line),reserveMove=after.some(x=>x.name===E)?0:1,reserveChain=after.some(x=>x.name===P)?0:1;
 return after.length+reserveLine+reserveMove+reserveChain<=cap;
 }
 // Count only known copies; never inspect hidden deck order or prizes.
 remaining(n){if(this.knownAbsent?.has(n))return 0;const total=this.deck.filter(c=>c.name===n).reduce((a,c)=>a+(c.n||1),0);if(!total)return 0;
 const visible=[...this.h,...this.s.trash,...(this.s.stage||[]),...values(this.b)];let used=visible.filter(c=>c.name===n).length;
 for(const c of values(this.b))used+=[...(c.un||[]),...(c.en||[]),...(c.tl||[])].filter(x=>x===n).length;
 return Math.max(0,total-used);}
 searchTargets(n){return this.deck.filter(c=>c.t==='pke'&&this.remaining(c.name)>0&&(n!=='なかよしポフィン'||(this.meta(c).st||'たね')==='たね'&&this.meta(c).hp<=70)&&(n!=='ポケパッド'||!/(ex|EX|GX|V|VSTAR)$/.test(c.name))).filter(c=>this.searchWant(c)>40);}
 recoveryScore(c){if(c.t!=='pke'&&!/^基本.+エネルギー$/.test(c.name))return -1000;
 if(this.h.some(x=>x.name===c.name))return -20;
 if(dark(c)){const need=entries(this.b).some(([k,x])=>this.attachScore(x,k)>90);return !this.v.fl.eat&&need?140:-20;}
 if(c.name===Z)return this.n(B)&&!this.hand(Z)?135:-20;
 if((this.meta(c).st||'たね')!=='たね'||!this.canBench(c))return -20;
 if(c.name===P)return !this.n(P)&&this.countLine()?155:-20;
 if(c.name===E)return !this.n(E)&&this.countLine()?145:-20;
 if(c.name===B)return this.countLine()<2?125:-20;
 return this.want(c)>75?this.want(c):-20;}
 // Compare next-turn attacks after each forced promotion, including bench acceleration.
 promotion(ks){const chainCard=this.n(P)||this.hand(P)||this.hand('夜のタンカ')&&this.s.trash.some(c=>c.name===P),chain=chainCard&&this.v.stadium?.name!=='サイレントラボ';
 const manual=!!this.h.find(dark)||!!this.hand('夜のタンカ')&&this.s.trash.some(dark),point=!!this.hand('Nのポイントアップ')&&this.s.trash.some(dark)&&!this.v.fl.noGoods;
 const anzu=!!this.hand('アンズの秘技')&&this.remaining('基本悪エネルギー')>0;
 const castle=this.v.stadium?.name==='Nの城'||!!this.hand('Nの城'),mochi=!!this.hand('くさりもち');
 const score=k=>{const active=this.b[k],rc=castle&&/^Nの/.test(active.name)?0:(this.meta(active).rc??2),retreat=rc===0||this.energy(active)>=rc;
 let best=-500;
 for(const[j,c]of entries(this.b)){if(c.name!==Z&&!(c.name===B&&this.hand(Z)))continue;
 const front=j===k,move=front||chain||retreat;if(!move)continue;
 const energy=this.energy(c)+(manual?1:0)+(point&&!front?1:0)+(anzu?1:0),ready=energy>=2;
 // A chain route both preserves Point Up and activates Mochi on arrival.
 let n=(ready?1000:0)+Math.min(energy,2)*100+(front&&ready?120:0);
 if(!front&&chain&&(mochi||this.tool(c,'くさりもち'))&&!c.psn)n+=110;
 if(!front&&point)n+=50;if(!front&&!chain&&retreat&&rc>0)n-=70;
 if(!front&&j===ks.find(x=>this.b[x].name===P))n-=30;
 best=Math.max(best,n);}
 if(chain&&active.name!==Z&&active.name!==B&&active.name!==P)best+=80;
 if(chain&&(active.name===Z||active.name===B)&&this.energy(active)<2)best-=100;
 if(!chain&&retreat)best+=45;
 best-=prize(active)*8;best+=(active.hp-active.dm)/100;return best;};
 return ks.slice().sort((a,b)=>score(b)-score(a))[0];}
 needDraw(){return !this.h.some(c=>['リーリエの決心','シアノ','ジャッジマン'].includes(c.name));}
 want(c,extra=[]){const n=c.name, count=x=>this.n(x)+extra.filter(y=>y.name===x).length, line=this.countLine()+extra.filter(y=>[Z,B].includes(y.name)).length;
 if(n===B&&!this.canBench(c))return -30;
 if(n===B)return line<2?110-line*10:line<Math.round(this.prm.lineTarget)&&this.s.prizeN>2?55:-30;
 if(n===Z)return this.n(B)>this.h.filter(x=>x.name===Z).length+extra.filter(x=>x.name===Z).length?115:line<2?65:10;
 if(n===E)return count(E)?-50:100;
 if(n===P)return count(P)?-80:(this.n(Z)||this.n(B))?65:10;
 if(n===M)return count(M)?-60:this.drag?68:values(this.b).some(x=>x.dm>=10)?50:5;
 if(n===R)return count(R)?-60:values(this.b).some(x=>x.name===Z&&x.dm>=80)?105:this.drag&&this.s.prizeN<6?35:-10;
 if(n==='シャリタツ')return count(n)?-60:this.needDraw()&&this.n(Z)<2?72:-35;
 if(n==='キチキギスex')return count(n)?-80:this.s.koTurn===this.v.turn-1&&this.s.deckN>4?85:-50;
 if(n===Y)return count(Y)?-60:!values(this.b).some(c=>c.name===Z&&this.energy(c)>=2)&&this.v.turn>2?42:-15;
 if(dark(c))return !this.v.fl.eat&&values(this.b).some(x=>[Z,B,M,Y].includes(x.name)&&this.energy(x)<(x.name===M||x.name===Y?1:2))?80:28;
 if(n==='ボスの指令')return !values(this.b).some(x=>x.name===Z&&this.energy(x)>=2)?25:this.s.prizeN<=2?92:60;
 if(n==='リーリエの決心')return !this.n(Z)||this.h.length<=3?120:this.needDraw()?90:45;
 if(n==='シアノ')return this.n(Z)<2&&this.n(B)>0?85:2;
 if(n==='Nのポイントアップ')return this.s.trash.some(dark)?75:25;
 if(n==='Nの城')return this.v.stadium?.name===n?3:60;
 if(n==='くさりもち')return values(this.b).some(c=>c.name===Z&&!c.tl.length)?65:10;
 if(n==='からておうの稽古')return this.s.prizeN<5?60:25;
 if(n==='夜のタンカ')return 65;
 if(n==='なかよしポフィン')return this.searchTargets(n).length?105:-55;
 if(n==='ポケパッド')return this.searchTargets(n).length?(this.n(E)?45:90):-55;
 return 20;
 }
 discard(c,chosen=[]){let val=this.want(c);const same=this.h.filter(x=>x.name===c.name&&!chosen.includes(x)).length;
 if(same>1)val-=22;
 if(dark(c)){const trash=this.s.trash.filter(dark).length;if(!trash&&this.hand('Nのポイントアップ')&&values(this.b).some(x=>x.name===B||x.name===Z))val=-60;else if(!this.v.fl.eat&&same===1)val+=65;}
 if(c.t==='sta'&&same===1&&this.stadiumKeep?.has(c.u))val+=180;
 if(c.name==='リーリエの決心'&&same===1)val+=35;
 if(c.name==='ボスの指令'){
 const otherBoss=this.remaining('ボスの指令')+Math.max(0,same-1);
 val+=same===1?(otherBoss===0?140:75):15;
 if(this.s.prizeN<=4)val+=50;if(this.s.prizeN<=2)val+=60;
 }
 if([E,P].includes(c.name)&&!this.n(c.name)&&same===1)val+=100;
 if(c.name==='夜のタンカ'&&same===1)val+=this.s.trash.some(x=>this.recoveryScore(x)>75)?120:25;
 if(c.name==='Nのポイントアップ'&&same===1&&this.s.trash.some(dark)&&entries(this.b).some(([k,x])=>k!=='battle'&&x.name===Z&&this.energy(x)===1))val+=160;
 return val;
 }
 setup(v){this.ingest(v);let bs=this.h.filter(c=>c.t==='pke'&&(this.meta(c).st||'たね')==='たね');const rank=c=>c.name===E?100:c.name===B?90:c.name===P?70:c.name==='シャリタツ'?65:c.name===M?40:c.name===Y?35:c.name==='キチキギスex'?20:10;
 bs.sort((a,b)=>rank(b)-rank(a));if(!bs.length)return{mull:true};let active=bs.shift(),bench=[];
 // A one-energy Zorua retreat can open Tatsugiri in a stalled opening.
 if(active.name===E&&this.needDraw()&&this.h.some(dark)&&bs.some(c=>c.name===B)&&bs.some(c=>c.name==='シャリタツ')){let j=bs.findIndex(c=>c.name===B);[active,bs[j]]=[bs[j],active];}
 const old=this.b;this.b={battle:active};for(const c of bs.sort((a,b)=>this.want(b)-this.want(a))){if(bench.length<4&&this.canBench(c)&&this.want(c)>25){bench.push(c.u);this.b['b'+bench.length]=c;}}this.b=old;return{active:active.u,bench};
 }
 bench(v){this.ingest(v);const out=[],old=this.b;this.b={...old};for(const c of this.h.filter(c=>c.t==='pke'&&(this.meta(c).st||'たね')==='たね').sort((a,b)=>this.want(b)-this.want(a))){if(this.want(c)>this.prm.benchFloor&&this.canBench(c)&&values(this.b).length<6){out.push(c.u);this.b['m'+out.length]=c;}}this.b=old;return out;}
 order(v){this.ingest(v);return true;}
 attachScore(c,k){const en=this.energy(c);if(c.name===Z)return en<2?150+en*20+(k==='battle'?12:0):-30;
 if(c.name===B)return en===0?120:en===1?(this.hand(Z)?145:25):-40;
 if(c.name===M)return en<1&&(this.drag||values(this.b).some(x=>x.dm))?(values(this.b).some(x=>x.dm>=30)&&values(this.b).some(x=>x.name===Z&&this.energy(x)>=2)?185:135):-50;
 if(c.name===Y)return en<1?(!values(this.b).some(x=>x.name===Z&&this.energy(x)>=2)&&!values(this.b).some(x=>x.name===Z&&this.energy(x)===1)?195:15):-50;
 if(c.name===P)return en<2&&this.o.prizeN<=2?70:-60;return -80;}
 damage(a,t,n,poison=a.psn,boost=this.v.fl.plus40ex){let d=n==='ひきさく'?70:n==='ランページサンダー'?250:n==='パワーレイジ'?2*a.dm:n==='イノセントフレイム'?170:n==='ひっかく'||n==='わしづかみ'?20:n==='イライラバースト'?60*(6-this.o.prizeN):Number((this.meta(a).at||[]).find(x=>x.n===n)?.dt)||0;
 if(d>0&&poison&&this.tool(a,'くさりもち'))d+=40;if(d>0&&boost&&/ex$/.test(t.name))d+=40;
 const am=this.meta(a),tm=this.meta(t);if(tm.weak===am.type)d*=2;if(tm.res===am.type)d-=30;return Math.max(0,d);}
 moves(a,k){if((k==='battle'&&a.na===this.v.turn)||a.slp||a.par===this.v.turn)return[];
 if(a.name===Z&&this.energy(a)>=2)return entries(this.b).filter(([j,c])=>j!==k&&(k!=='battle'||j!=='battle')&&/^Nの/.test(c.name)&&c.name!==Z).flatMap(([j,c])=>(this.meta(c).at||[]).filter(x=>x.n!=='ナイトジョーカー').map(x=>({n:x.n,src:j,outer:'ナイトジョーカー'})));
 return(this.meta(a).at||[]).filter(at=>{let u=(a.eu||[]).slice();for(let x of at.cost||[]){if(x==='無')continue;let i=u.indexOf(x);if(i<0)return false;u.splice(i,1);}return(a.eu||[]).length>=(at.cost||[]).length;}).map(x=>({n:x.n,outer:x.n}));}
 plans(){let out=[],lg=this.v.lg;if(!this.ob.battle||this.v.turn===1)return out;
 const chain=lg.abil.find(a=>a.n==='しはいのくさり'), boss=lg.sup&&this.hand('ボスの指令'), karate=lg.sup&&this.hand('からておうの稽古');
 for(const[k,a]of entries(this.b)){let switchAction=null,poison=!!a.psn;
 if(k==='battle'&&!poison&&this.tool(a,'くさりもち')&&chain&&lg.retreat?.cost===0){const pivot=lg.retreat.ks.find(j=>this.meta(this.b[j]).type==='悪'&&this.b[j].name!==P);if(pivot){switchAction={t:'retreat'};poison=true;}}
 if(k!=='battle'){if(chain&&this.meta(a).type==='悪'&&a.name!==P){switchAction={t:'ab',k:chain.k};poison=true;}
 else if(lg.retreat?.ks.includes(k))switchAction={t:'retreat'};else continue;}
 for(const move of this.moves(a,k).filter(m=>k!=='battle'||lg.atk.some(at=>at.ok&&at.n===m.outer)))for(const[j,t]of entries(this.ob)){if(j!=='battle'&&!boss)continue;
 for(const boost of[false,true]){if(boost&&(!karate||j!=='battle'))continue;
 const dmg=this.damage(a,t,move.n,poison,this.v.fl.plus40ex||boost),remain=t.hp-t.dm,ko=dmg>=remain;
 let score=ko?1100+prize(t)*200+(prize(t)>=this.s.prizeN?100000:0):dmg/Math.max(1,remain)*150;
 if(ko&&this.drag){score+=t.name==='ドラパルトex'?100:t.name==='ドロンチ'?100:t.name==='ドラメシヤ'&&t.en.length?90:/ヨマワル|サマヨール/.test(t.name)?70:0;}
 if(move.n==='ランページサンダー')score-=35+(this.n(P)&&this.v.stadium?.name==='Nの城'?0:35);
 if(move.n==='わしづかみ'&&!ko){score+=!t.en.length&&!/ドラパルト|ゾロアーク|ルカリオ/.test(t.name)?130:0;if(j!=='battle'&&!t.en.length)score+=80;}
 if(j!=='battle')score-=30;if(boost)score-=18;if(switchAction)score-=10; if(k==='battle'&&switchAction&&(!ko||this.damage(a,t,move.n,false,this.v.fl.plus40ex||boost)>=remain))continue;
 out.push({score,k,target:j,move,switchAction,pivot:switchAction?.t==='retreat'&&k==='battle'?lg.retreat.ks.find(j=>this.meta(this.b[j]).type==='悪'&&this.b[j].name!==P):null,boost,ko,dmg});}}}
 return out.sort((a,b)=>b.score-a.score);
 }
 // Evaluate both sides of a damage-counter transfer before choosing its source/target.
 adrenaPlan(){const oldB=this.b,oldO=this.ob;let best=null;
 try{for(const[src,c]of entries(oldB)){const amount=Math.min(30,Math.floor((c.dm||0)/10)*10);if(!amount)continue;
 for(const[target,t]of entries(oldO)){this.b={...oldB,[src]:{...c,dm:c.dm-amount}};this.ob={...oldO,[target]:{...t,dm:t.dm+amount}};
 const direct=t.hp-t.dm<=amount,p=direct?{score:1100+prize(t)*200+(prize(t)>=this.s.prizeN?100000:0),ko:true}:this.plans().find(p=>p.target===target&&p.ko);
 if(p&&(!best||p.score>best.score))best={...p,adrenaSource:src,adrenaTarget:target,amount};}}
 }finally{this.b=oldB;this.ob=oldO;}return best;}
 adrenaCanUnlock(c){if(c.name!==M||this.energy(c)||this.v.fl.abU.includes(c.u)||this.v.stadium?.name==='サイレントラボ')return false;
 // Common visible ability locks in supported and expanded lists.
 if(values(this.ob).some(x=>x.name==='ガラルマタドガス'&&x===this.ob.battle)||values(this.b).concat(values(this.ob)).some(x=>x.name==='ダストダス'&&(x.tl||[]).length))return false;
 return true;}
 // Re-evaluate attacks after replacing Jamming, including restored tools and Castle retreat.
 stadiumPlan(c){if(this.v.stadium?.name!=='ジャミングタワー'||!this.v.lg.stad.includes(c.u)||c.name==='ジャミングタワー')return null;
 const oldV=this.v,oldB=this.b,oldO=this.ob;
 const restored=board=>Object.fromEntries(entries(board).map(([k,x])=>{const tools=x.tl||[],basic=(this.meta(x).st||'たね')==='たね';const hp=100*tools.filter(n=>n.startsWith('ヒーローマント')).length+(basic&&tools.includes('勇気のおまもり')?50:0)+(!/(ex|EX|GX|V|VSTAR)$/.test(x.name)&&tools.includes('ゴージャスマント')?100:0);return[k,{...x,hp:x.hp+hp}];}));
 try{this.b=restored(oldB);this.ob=restored(oldO);const lg={...oldV.lg},a=this.b.battle;
 if(c.name==='Nの城'&&a&&/^Nの/.test(a.name)&&!a.slp&&a.par!==oldV.turn&&a.nr!==oldV.turn&&!oldV.fl.retreatUsed){const ks=entries(this.b).filter(([k])=>k!=='battle').map(([k])=>k);if(ks.length)lg.retreat={cost:0,ks};}
 this.v={...oldV,stadium:{name:base(c.name),own:oldV.me},lg};let p=this.plans()[0];
 const canAdrena=lg.abil.some(a=>a.n==='アドレナブレイン')||entries(this.b).some(([k,x])=>this.adrenaCanUnlock(x)&&entries(lg.att).some(([u,ks])=>ks.includes(k)&&dark(this.h.find(c=>String(c.u)===u)||{name:''})));
 if(canAdrena){const ap=this.adrenaPlan();if(ap&&(!p||ap.score>p.score))p=ap;}
 return p;
 }finally{this.v=oldV;this.b=oldB;this.ob=oldO;}}
 stateKey(v){return JSON.stringify([v.turn,v.self.hand.map(c=>c.u),v.self.board,v.self.deckN,v.self.trash.length,v.opp?.board,v.fl]);}
 decide(v){this.ingest(v);const lg=v.lg,actions=[],key=this.stateKey(v),add=(a,s,why,plan)=>actions.push({a,s,why,plan}),play=(c,s,why,k)=>c&&add({t:'play',u:c.u,...(k?{k}:{})},s,why);
 const plans=this.plans(),best=plans[0],adrena=this.n(M)?this.adrenaPlan():null,adrenaGain=adrena&&(!best?.ko||adrena.score>best.score);
 // Immediate winning line is executed before optional draws or resources.
 const enact=(p,priority)=>{if(!p)return;if(p.switchAction){add(p.switchAction,priority,'アタッカーを前へ',p);return;}
 if(p.target!=='battle'){play(this.hand('ボスの指令'),priority,'倒せるベンチを呼ぶ');actions[actions.length-1].plan=p;return;}
 if(p.boost&&!v.fl.plus40ex){play(this.hand('からておうの稽古'),priority,'打点を補ってきぜつ');return;}
 add({t:'attack',n:p.move.outer},p.score>90000?priority:150,'盤面の準備を終えて攻撃',p);};
 if(best?.score>90000)enact(best,10000);
 this.stadiumKeep=new Set();
 for(const c of this.h.filter(c=>c.t==='sta'&&lg.stad.includes(c.u))){const p=this.stadiumPlan(c),existing=Math.max(best?.score||0,adrenaGain?adrena.score:0);if(p?.ko&&p.score>existing){this.stadiumKeep.add(c.u);add({t:'play',u:c.u},p.score>90000?11500:950,'ジャミングタワーを貼り替えてどうぐ・入れ替えと攻撃のきぜつを成立',p);}}
 for(const ev of lg.evo)play(this.h.find(c=>c.u===ev.u),1300,'進化してとりひきの回数を増やす',ev.k);
 for(const u of lg.bench){const c=this.h.find(c=>c.u===u),w=this.want(c);if(w>this.prm.benchFloor&&this.canBench(c))play(c,700+w,'役割のあるポケモンを展開','bench');}
 // Ability damage first only if it helps a KO; preserve Power Rage otherwise.
 for(const ab of lg.abil){if(ab.n==='アドレナブレイン'){const amount=Math.min(30,Math.max(...values(this.b).map(x=>x.dm||0))),win=values(this.ob).some(t=>t.hp-t.dm<=amount&&prize(t)>=this.s.prizeN);
 if(adrenaGain)add({t:'ab',k:ab.k},adrena.score>90000?11000:940,'ダメカン移動と攻撃を合わせてきぜつ',adrena);
 else if(amount&&(!best||best.move.n!=='パワーレイジ'||win))add({t:'ab',k:ab.k},win?11000:920,'ダメカン移動で打点調整');}
 if(ab.n==='さかてにとる'&&this.s.deckN>4)add({t:'ab',k:ab.k},850,'きぜつ後の補充');
 if(ab.n==='きゃくよせ'&&this.needDraw()&&this.s.deckN>2)add({t:'ab',k:ab.k},845,'必要サポートを探す');}
 for(const[u,ks]of entries(lg.att)){const c=this.h.find(x=>String(x.u)===u);if(!c)continue;for(const k of ks){if(c.t==='ene'){if(dark(c)&&adrenaGain&&this.adrenaCanUnlock(this.b[k]))add({t:'play',u:c.u,k},adrena.score>90000?10500:935,'マシマシラへの手張りからダメカン移動＋攻撃のきぜつを成立',adrena);let s=this.attachScore(this.b[k],k);if(s>0)play(c,600+s,'攻撃と次のアタッカーを準備',k);}else if(c.t==='tool'&&!this.b[k].tl.length&&this.b[k].name===Z)play(c,730,'耐久を補う',k);}}
 for(const c of this.h){const n=base(c.name);if(c.t==='tool'&&n==='くさりもち')for(const[k,a]of entries(this.b))if(a.name===Z&&!a.tl.length)play(c,790+Math.min(this.energy(a),2)*20+(k==='battle'?5:0),'くさりもちで打点を確保',k);
 if(c.t==='tr'&&lg.goods){if(n==='なかよしポフィン'&&lg.room&&this.countLine()<Math.round(this.prm.lineTarget)&&this.searchTargets(n).length)play(c,900,'ゾロアを優先展開');
 if(n==='ポケパッド'&&this.searchTargets(n).length)play(c,865,'不足する非ルールを探す');
 if(n==='ハイパーボール'&&this.h.length>=3&&this.h.filter(x=>x!==c&&this.discard(x)<65).length>=2&&this.deck.some(x=>x.t==='pke'&&this.remaining(x.name)>0&&this.searchWant(x)>40)&&(this.n(B)&&!this.hand(Z)||!this.n(P)&&this.n(Z)))play(c,860,'進化・入れ替え役を確保');
 if(n==='Nのポイントアップ'&&this.s.trash.some(dark)&&entries(this.b).some(([k,x])=>k!=='battle'&&[B,Z].includes(x.name)&&this.energy(x)<2))play(c,825,'ベンチのNポケモンに加速');
 if(n==='夜のタンカ'&&this.s.trash.some(x=>this.recoveryScore(x)>75))play(c,815,'今使うポケモン・基本エネルギーを回収');
 if(n==='スペシャルレッドカード'&&this.o.prizeN<=3&&this.o.handN>3)play(c,840,'終盤の手札干渉');
 if(n==='シークレットボックス'&&this.h.length>=4&&this.h.filter(x=>x!==c&&this.discard(x)<65).length>=3)play(c,870,'必要なカードをまとめて確保');}
 if(c.t==='sta'&&lg.stad.includes(c.u)){if(n==='Nの城'&&this.n(B)+this.n(Z)>0)play(c,800,'無料にげると連続攻撃を準備');else if(n==='ロケット団の監視塔'&&(!this.needDraw()||this.n(Z)>=2)&&this.v.stadium?.name!=='Nの城'&&values(this.ob).some(x=>/ニャース|ノコッチ|ノココッチ|ミネズミ/.test(x.name)))play(c,750,'相手の展開を妨害');}
 if(c.t==='sup'&&lg.sup){if(n==='シアノ'&&this.n(B)>this.h.filter(x=>x.name===Z).length&&this.n(Z)<2)play(c,830,'複数ゾロアークの成立');
 if(n==='アンズの秘技'&&entries(this.b).some(([k,x])=>this.meta(x).type==='悪'&&this.attachScore(x,k)>90))play(c,810,'グッズロック下もエネルギー確保');
 if(n==='リーリエの決心'&&this.s.deckN+this.h.length>8&&(!best?.ko||this.h.length<4))play(c,680+(this.n(Z)?0:140),'必要札を引き込む');
 if(n==='ジャッジマン'&&this.s.deckN+this.h.length>5&&!best?.ko&&(this.h.length<=3||this.o.handN>=7&&this.n(Z)>=2))play(c,675,'手札回復・干渉');}}
 // Gather information before committing attachments, supporters or a non-winning attack.
 for(const ab of lg.abil)if(ab.n==='とりひき'&&this.s.deckN>this.prm.drawReserve&&this.h.length)add({t:'ab',k:ab.k},1200,'とりひきで先に情報を増やしてから手順を判断');
 // Free retreat resets Rampage. Use a dark pivot so Pecharunt can bring Zoroark back.
 const active=this.b.battle;if(active?.na===v.turn&&lg.retreat&&lg.abil.some(a=>a.n==='しはいのくさり')){const pivot=lg.retreat.ks.find(k=>this.meta(this.b[k]).type==='悪'&&this.b[k].name!==P);if(pivot)add({t:'retreat'},780,'ランページの使用制限を解除',{pivot});}
 if(active?.name!=='シャリタツ'&&this.needDraw()&&lg.sup&&lg.retreat?.cost===0){const pivot=lg.retreat.ks.find(k=>this.b[k].name==='シャリタツ');if(pivot&&!best?.ko)add({t:'retreat'},720,'シャリタツで展開を補う',{pivot});}
 enact(best,best?.ko?855:180);
 actions.sort((a,b)=>b.s-a.s);const chosen=actions.find(x=>!this.seen.has(key+'|'+JSON.stringify(x.a)));
 if(!chosen)return{t:'end'};this.seen.add(key+'|'+JSON.stringify(chosen.a));if(this.seen.size>3000)this.seen=new Set([...this.seen].slice(-1000));if(chosen.a.t==='play'&&this.h.find(c=>c.u===chosen.a.u)?.t==='sup')this.knownAbsent=null;this.plan=chosen.plan||null;this.last=chosen;this.trace.push({turn:v.turn,action:chosen.a,reason:chosen.why});if(this.trace.length>200)this.trace.shift();return chosen.a;
 }
 features(v){this.ingest(v);return [this.n(Z),this.countLine(),this.n(E),this.n(P),this.n(M),this.s.prizeN,this.o.prizeN,this.s.deckN,this.h.length];}
 explain(){return this.last?.why||null;}
 hasValue(){return false;}
 result(a,ok,err){if(this.last)this.last.result={ok,err};}
 searchWant(c,picked=[]){
 const held=n=>this.h.filter(x=>x.name===n).length+picked.filter(x=>x.name===n).length;
 if(c.t==='pke'){
  if(c.name===Z)return this.n(B)>held(Z)?130:-25;
  if(this.n(c.name)&&![B].includes(c.name))return -30;
  if(!this.canBench(c)||held(c.name)>=(c.name===B?Math.max(0,Math.round(this.prm.lineTarget)-this.countLine()):1))return -30;
 }
 return this.want(c,picked);
 }
 pk(v,q){this.ingest(v);if(q.kind==='deck'){const names=new Set(q.pool.map(c=>c.name));this.knownAbsent=new Set(this.deck.filter(c=>!names.has(c.name)).map(c=>c.name));}if(q.kind==='trash'&&/ポケモンまたは基本エネルギー/.test(q.title))return q.pool.filter(c=>c.ok).sort((a,b)=>this.recoveryScore(b)-this.recoveryScore(a)).slice(0,q.n).map(c=>c.u);let pool=q.pool.filter(c=>c.ok),picked=[],discard=/トラッシュする手札|手札.*トラッシュ|コスト/.test(q.title)&&q.kind==='hand';
 for(let i=0;i<q.n&&pool.length;i++){pool.sort((a,b)=>discard?this.discard(a,picked)-this.discard(b,picked):this.searchWant(b,picked)-this.searchWant(a,picked));let c=pool.shift();if(!discard&&picked.length>=q.min&&this.searchWant(c,picked)<0)break;picked.push(c);}return picked.map(c=>c.u);}
 ask(v,q){this.ingest(v);const ks=q.ks,t=q.title||'',p=this.plan;
 if(q.owner==='opp'){if(/ダメカンをのせる/.test(t)&&p?.adrenaTarget&&ks.includes(p.adrenaTarget))return p.adrenaTarget;if(/呼び出す/.test(t)&&p&&ks.includes(p.target))return p.target;
 const amount=Math.min(30,Math.max(...values(this.b).map(c=>c.dm||0)));
 const score=k=>{const c=this.ob[k];if(!c)return 0;let r=c.hp-c.dm;return r<=amount?2000+prize(c)*300+(prize(c)>=this.s.prizeN?100000:0):(k==='battle'?100:0)+prize(c)*20-r/10;};return ks.slice().sort((a,b)=>score(b)-score(a))[0];}
 if(!this.b.battle&&/バトル場に出す/.test(t))return this.promotion(ks);
 if(/借りるワザ/.test(t)&&p&&ks.includes(p.move?.src))return p.move.src;
 if(/ダメカンを取る/.test(t)&&p?.adrenaSource&&ks.includes(p.adrenaSource))return p.adrenaSource;
 if(/ダメカンを取る/.test(t))return ks.slice().sort((a,b)=>{const score=k=>Math.min(30,this.b[k].dm)+(this.b[k].name===Z?-10:20)+(this.b[k].hp-this.b[k].dm<60?50:0);return score(b)-score(a);})[0];
 if(/アンズ/.test(t))return ks.slice().sort((a,b)=>this.attachScore(this.b[b],b)-this.attachScore(this.b[a],a))[0];
 if(p?.pivot&&ks.includes(p.pivot))return p.pivot;if(p&&ks.includes(p.k)&&p.k!=='battle')return p.k;
 if(/にげる/.test(t)&&this.b.battle?.na===v.turn){const k=ks.find(k=>this.meta(this.b[k]).type==='悪'&&this.b[k].name!==P);if(k)return k;}
 const score=k=>{const c=this.b[k];if(!c)return-100;const ready=this.moves(c,k).length?400:0;return ready+this.attachScore(c,k)+(c.name===Z?70:0)-(c.na===v.turn?500:0);};return ks.slice().sort((a,b)=>score(b)-score(a))[0];
 }
 attach(v,q){this.ingest(v);return q.ks.slice().sort((a,b)=>this.attachScore(this.b[b],b)-this.attachScore(this.b[a],a))[0];}
 menu(v,q){this.ingest(v);if(/借りるワザ/.test(q.title)&&this.plan){const i=q.items.findIndex(x=>x.startsWith(this.plan.move.n));if(i>=0)return i;}
 if(/ダメカンの数/.test(q.title))return q.items.length-1;
 if(q.items.some(x=>/使わない/.test(x))){const c=q.card;if(c?.name==='キチキギスex'&&!(this.s.koTurn===v.turn-1&&this.s.deckN>4))return q.items.findIndex(x=>/使わない/.test(x));}
 return 0;}
}
const old=root.CPUAI;
if(old?.register)old.register('zoroark',{label:'Nのゾロアークex',defaults,space,detect:deck=>deck.some(c=>c.name===Z)});
const detectBase=old&&old.detect,createBase=old&&old.create;
root.CPUAI=old||{};Object.assign(root.CPUAI,{version:'zoroark-policy-5',detect(deck){if(deck.some(c=>c.name===Z))return'zoroark';return detectBase?detectBase(deck):'';},create(type,opt){return type==='zoroark'?new Policy(opt):createBase?createBase(type,opt):null;},ZoroarkPolicy:Policy});
})(typeof window==='undefined'?globalThis:window);
