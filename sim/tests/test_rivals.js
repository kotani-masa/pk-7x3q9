'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..'),ctx=vm.createContext({});ctx.window=ctx;
for(const file of ['core/ai_core.js','decks/ai_rayquaza.js','decks/ai_dragapult.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'ai',file),'utf8'),ctx);
const R=ctx.CPUAI,card=(name,mk,u,extra={})=>({name,mk,u,t:'pke',hp:280,dm:0,eu:[],en:[],tl:[],un:[],...extra});
const cd={rq:{st:'たね',type:'無',rc:2,at:[{n:'ストームエメラルダ',dt:'50×',cost:['雷','炎','無']}]},tp:{st:'たね',type:'無',rc:2,tera:1,at:[{n:'ユニオンビート',dt:'30×',cost:['無','無']}]},tf:{st:'2進化',type:'無',rc:0,at:[{n:'かぎづめハント',dt:'150',cost:['無','無']}]},ho:{st:'たね',type:'炎',rc:2,at:[{n:'シャイニングフェザー',dt:'160',cost:['炎','炎','炎','炎']}]},z:{st:'1進化',type:'悪',rc:2,at:[{n:'ナイトジョーカー',dt:'',cost:['悪','悪']}]},zek:{st:'たね',type:'龍',at:[{n:'ランページサンダー',dt:'250',cost:['炎','雷','無','無']}]}};
function view(){return{me:0,turn:5,first:0,mode:'ask',oppType:'zoroark',cd,deck:[],self:{board:{battle:card('テラパゴスex','tp','tp',{eu:['炎','炎'],en:['基本炎エネルギー','基本炎エネルギー']}),b0:card('メガレックウザex','rq','rq')},hand:[],stage:[],trash:[],deckN:25,prizeN:6},opp:{board:{battle:card('Nのゾロアークex','z','z',{eu:['悪','悪'],psn:1,tl:['くさりもち']}),b0:card('Nのゼクロム','zek','zek')},prizeN:6,handN:4,trash:[]},stadium:null,fl:{sup:false,eat:false,abU:[],nm:[]},lg:{evo:[],bench:[],habs:[],abil:[],att:{},stad:[],atk:[],goods:true,sup:true,room:4,retreat:null}};}
for(const n of ['sHOab','sZero','sCape','sKG','sFezBench','aScale','hoFire'])assert(Number.isFinite(R.strategies.rayquaza.defaults[n]),n);
console.log('PASS rivals: Rayquaza ability and acceleration defaults are finite');
{const c=R.create('rayquaza',{}),v=view();assert.equal(c.attach(v,{ks:['battle','b0'],card:{name:'基本雷エネルギー',t:'ene'},title:'アカマツ：エネルギーをポケモンにドラッグ'}),'b0');}
console.log('PASS rivals: acceleration selects the Rayquaza missing its Lightning energy');
{const c=R.create('rayquaza',{}),v=view(),cx=c.ctx(v);assert.equal(cx.threat('battle',0).act,290);v.stadium={name:'ジャミングタワー'};assert.equal(c.ctx(v).threat('battle',0).act,250);}
console.log('PASS rivals: copied Rampage and Mochi are included in public threat estimates');
{const c=R.create('rayquaza',{}),v=view();v.self.board={battle:card('テラパゴスex','tp','tp')};const pool=[card('メガレックウザex','rq','r1'),card('メガレックウザex','rq','r2'),card('ファイアローex','tf','tf'),card('ヒビキのホウオウex','ho','ho')].map(c=>({...c,ok:true}));v.deck=pool.map(c=>({...c,n:1}));const before=JSON.stringify(v),picked=c.pk(v,{title:'山札から「ポケモンex」を3枚まで選ぶ',kind:'deck',pool,n:3,min:0});assert.equal(picked.filter(u=>/^r/.test(u)).length,1);assert(picked.includes('tf'));assert.equal(JSON.stringify(v),before);}
console.log('PASS rivals: Cyano selects complementary roles without mutating the observation');
{const d='ai/decks/ai_zoroark.js',sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert.equal(sha(path.join(ROOT,d)),sha(path.join(ROOT,'sim/baselines/v6',d)));}
console.log('PASS rivals: opponent Zoroark remains byte-identical to v6');
const{wilson,pairedP}=require('../cli/rivals');assert.equal(pairedP(0,0),1);assert(pairedP(10,0)<.01);assert(wilson(500,1000)[0]<.5);assert(wilson(500,1000)[1]>.5);
console.log('PASS rivals: paired statistics handle ties and uncertainty');
{const c=R.create('dragapult',{params:{readCopiedThreat:0,smartAttach:0}}),v=view();assert.equal(c.ctx(v).threat('battle',0).act,0);assert.equal(c.attach(v,{ks:['battle','b0'],card:{name:'基本雷エネルギー',t:'ene'}}),'battle');}
console.log('PASS rivals: ablation flags preserve original Dragapult threat and attachment behavior');
{const c=R.create('dragapult',{params:{readCopiedThreat:1,smartAttach:1}}),v=view();assert.equal(c.ctx(v).threat('battle',0).act,290);}
console.log('PASS rivals: experimental copied-threat feature is independently switchable');
{const c=R.create('rayquaza',{}),v=view();v.self.board.battle=card('ファイアローex','tf','tf',{eu:['炎','雷']});v.self.board.b0=card('メガレックウザex','rq','rq',{eu:['雷','炎','炎']});v.opp.board.battle.hp=280;v.lg.retreat={cost:0,ks:['b0']};const cx=c.ctx(v);assert.equal(R.strategies.rayquaza.retreatScore(cx),0);v.opp.board.battle.dm=40;assert(R.strategies.rayquaza.retreatScore(c.ctx(v))>0);}
console.log('PASS Ray patch: preserve Talonflame instead of exposing a nonlethal Mega; switch for a knockout');
{const version=fs.readFileSync(path.join(ROOT,'VERSION'),'utf8').trim();assert(/^\d+\.\d+\.\d+$/.test(version));}
console.log('PASS release: MAJOR.MINOR.PATCH version is explicit');
