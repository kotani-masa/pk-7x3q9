'use strict';
const assert=require('node:assert/strict'),{Sim}=require('../lib/headless'),D=require('../lib/decks');
(async()=>{const s=new Sim();const startup=await s.play({decks:[D.zoroark,D.dragapult],seed:42,maxTurn:2,log:true});assert(startup.turn>=3,'startup must proceed after mulligan');assert(startup.log.some(l=>/バトルスタート.*1枚引きました/.test(l.t)),'first player must draw after startup');console.log('PASS engine: mulligan startup completes and first player draws');
const prepare=()=>s.ctx.__dbg(`(()=>{P=[newP(),newP()];P[0].cards=${JSON.stringify(D.zoroark)};P[1].cards=${JSON.stringify(D.dragapult)};G={mode:'play',turn:5,act:0,fp:0,sup:0,eat:5,ab:{},nm:{},atk:0,stp:0};cur=0;CPU.on=1;CPU.who=[1,1];CPU.d=0;TE=0;LGS.length=0;
const c=(id,name,t='pke',more={})=>({id,u:id+'test',name,t,img:'',dm:0,pt:1,...more});
for(let i=0;i<2;i++){P[i].phase='play';P[i].myTurn=3;P[i].koTurn=-9;P[i].deck=Array.from({length:20},(_,j)=>c('deck'+i+j,'基本悪エネルギー','ene'));P[i].side=Array.from({length:i?6:2},(_,j)=>c('side'+i+j,'基本悪エネルギー','ene'));}
P[0].piles.battle=[c('en1','基本悪エネルギー','ene'),c('en2','基本悪エネルギー','ene'),c('tool','くさりもち','tool'),c('48634','Nのゾロアークex','pke',{psn:1})];
P[0].piles.b0=[c('48651','Nのゼクロム')];P[0].piles.b1=[c('en3','基本悪エネルギー','ene'),c('45849','マシマシラ')];P[0].piles.b2=[c('47140','モモワロウex')];P[0].piles.b3=[c('47068','Nのゾロア')];P[0].piles.stadium=[c('47105','Nの城','sta')];P[1].piles.battle=[c('45772','ドラパルトex')];cpuBind();})()`);
prepare();s.ctx.__dbg("lastOf(P[0].piles.battle).dm=30");await s.ctx.__dbg('cpuTurn(0)');let r=JSON.parse(s.ctx.__dbg('JSON.stringify({win:G.win,side:P[0].side.length,log:LGS})'));
assert.equal(r.win,0);assert(r.log.some(l=>/290ダメージ/.test(l.t)));console.log('PASS engine: Adrena Brain 30 + poisoned Mochi Rampage 290 = Dragapult KO');
prepare();s.ctx.__dbg("lastOf(P[0].piles.battle).na=5;lastOf(P[1].piles.battle).dm=80;P[0].piles.b1=[]");await s.ctx.__dbg('cpuTurn(0)');r=JSON.parse(s.ctx.__dbg('JSON.stringify({win:G.win,side:P[0].side.length,log:LGS})'));
assert.equal(r.win,0);assert(r.log.some(l=>/にげました/.test(l.t)));assert(r.log.some(l=>/しはいのくさり/.test(l.t)));assert(r.log.some(l=>/ランページサンダーとして使用/.test(l.t)));console.log('PASS engine: Castle retreat + Pecharunt resets Rampage and attacks again');
})().catch(e=>{console.error(e);process.exitCode=1});
