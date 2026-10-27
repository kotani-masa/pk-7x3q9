'use strict';
const assert=require('node:assert/strict'),{Sim}=require('../lib/headless'),D=require('../lib/decks');
(async()=>{const s=new Sim();await s.play({decks:[D.rayquaza,D.zoroark],seed:4,maxTurn:2});
function prepare(body){s.ctx.__dbg(`(()=>{P=[newP(),newP()];P[0].cards=${JSON.stringify(D.rayquaza)};P[1].cards=${JSON.stringify(D.zoroark)};G={mode:'play',turn:5,act:0,fp:0,sup:0,eat:0,ab:{},nm:{},atk:0,stp:0};cur=0;CPU.on=1;CPU.who=[1,1];CPU.d=0;TE=0;LGS.length=0;window.PokecaMatchRecorder=null;let serial=0;
const card=(name,t='pke')=>{const d=P[0].cards.concat(P[1].cards).find(c=>c.name===name);return{...d,t,u:'test-'+(++serial),dm:0,pt:1};};const fire=()=>card('基本炎エネルギー','ene'),light=()=>card('基本雷エネルギー','ene');
for(let i=0;i<2;i++){P[i].phase='play';P[i].myTurn=3;P[i].koTurn=-9;P[i].deck=Array.from({length:24},(_,j)=>j%2?fire():light());P[i].side=Array.from({length:i?6:2},fire);}
P[1].piles.battle=[card('Nのゾロアークex')];P[1].piles.b0=[card('Nのゼクロム')];${body};cpuBind();})()`);}
prepare(`P[0].piles.battle=[card('基本炎エネルギー','ene'),card('テラパゴスex')];P[0].piles.b0=[fire(),light(),card('ファイアローex')];P[0].piles.b1=[card('メガレックウザex')];P[0].hand=[card('ボスの指令','sup'),card('ハイパーボール','tr'),card('ゼロの大空洞','sta')];P[0].deck.push(card('ラティアスex'));G.eat=5`);
await s.ctx.__dbg('cpuTurn(0)');let r=JSON.parse(s.ctx.__dbg('JSON.stringify({log:LGS})'));assert(r.log.some(x=>/ハイパーボール：ラティアスex/.test(x.t)));assert(r.log.some(x=>/にげました/.test(x.t)));assert(r.log.some(x=>/かぎづめハント/.test(x.t)));console.log('PASS Ray engine: three-card hand finds Latias and releases the ready Talonflame');
prepare(`P[0].piles.battle=[fire(),light(),card('ファイアローex')];P[0].piles.b0=[card('メガレックウザex')];P[0].piles.b1=[card('ラティアスex')];P[0].piles.b2=[card('メガガルーラex')];G.ab[lastOf(P[0].piles.b2).u]=5;G.nm['おつかいダッシュ']=5;P[0].hand=[card('ヒビキのホウオウex'),fire(),fire(),card('アカマツ','sup'),card('エネルギーつけかえ','tr'),card('ボスの指令','sup')]`);
await s.ctx.__dbg('cpuTurn(0)');r=JSON.parse(s.ctx.__dbg('JSON.stringify({log:LGS,win:G.win})'));assert.equal(r.win,0);const logs=r.log.map(x=>x.t);for(const re of [/こんじきのほのお/,/アカマツ/,/つけ替え/,/300ダメージ/])assert(logs.some(t=>re.test(t)),String(re));assert(!logs.some(t=>/ボスの指令：/.test(t)));console.log('PASS Ray engine: Ho-Oh, Akamatsu, transfer and free retreat produce Storm 300 without spending Boss');
})().catch(e=>{console.error(e);process.exitCode=1});
