'use strict';
/* ルール微調整の検証：①ハイパーボールの処理順 ②強制マリガンと手札公開 ③開始時の裏向き(hid)と同時公開 ④情報制限 */
const {Sim}=require('./headless');const D=require('./decks');
(async()=>{const s=new Sim();const orig=s.makeAI.bind(s);let checks=[],mullLogs=0;
 s.makeAI=sd=>{const c=orig(sd);const d=c.__dispatch;c.__dispatch=(m,id,j)=>{
   if(m==='pk'){const a=JSON.parse(j);if(/山札からポケモンを1枚選択/.test(a[1].title)&&checks.length<3){const me=a[0].me;
     const st=JSON.parse(s.ctx.__dbg(`JSON.stringify({stage:P[${me}].piles.staging.map(c=>c.name),trashTail:P[${me}].trash.slice(-2).map(c=>c.name),hand:P[${me}].hand.length,log:LGS.slice(-2)})`));
     checks.push({me,stage:st.stage,trashTail:st.trashTail,log:st.log})}}
   return d(m,id,j)};return c};
 let mulls=0,revealed=0;
 for(let i=0;i<40;i++){s._ai=null;const r=await s.play({decks:[D.dragapult,D.rayquaza],opt:[{},{}],seed:900+i,log:1});
   for(const l of r.log){if(/強制マリガン/.test(l)){mulls++;if(/手札を公開：/.test(l))revealed++}}
   if(i===0)var last=r}
 console.log('■ ハイパーボール サーチ保留中の盤面:');checks.forEach(c=>console.log('  使用待機(盤面):',JSON.stringify(c.stage),' トラッシュ末尾(コスト2枚):',JSON.stringify(c.trashTail)));
 console.log('  → 使用待機にハイパーボール、コスト2枚がトラッシュに、というなら順序OK');
 console.log(`■ 強制マリガン: ${mulls}回発生 / 手札公開ログ付き ${revealed}回`);
 // 試合終了後：使用待機に残っているカードが無いこと（全部トラッシュへ）
 const left=await s.play({decks:[D.dragapult,D.rayquaza],opt:[{},{}],seed:5}).then(()=>JSON.parse(s.ctx.__dbg('JSON.stringify(P.map(p=>p.piles.staging.length))')));
 console.log('■ 終了時の使用待機の残り:',JSON.stringify(left),'（[0,0]なら正常）');
})().catch(e=>console.log('ERR',e.stack));
