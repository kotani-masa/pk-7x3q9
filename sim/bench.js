'use strict';
/* このPCの速さを測る。結果（下の表示をそのままコピー）を Claude に送ってください。 */
const os=require('os');const {Sim}=require('./headless');const D=require('./decks');
(async()=>{
 const cpus=os.cpus();console.log('=== このPCの情報 ===');console.log('OS:',os.type(),os.release(),'| Node.js',process.version);console.log('CPU:',cpus[0].model.trim(),'| 論理コア数',cpus.length);console.log('メモリ: 合計',(os.totalmem()/2**30).toFixed(1)+'GB / 空き',(os.freemem()/2**30).toFixed(1)+'GB');
 const s=new Sim();const time=async(n,opt)=>{const t0=Date.now();for(let i=0;i<n;i++)await s.play({decks:[D.dragapult,D.rayquaza],opt:[opt,{}],seed:500+i});return(Date.now()-t0)/n};
 await time(3,{});                                  // ウォームアップ
 const a=await time(40,{});console.log('\n=== 速度（1コアあたり）===');console.log(`探索なし: ${a.toFixed(0)} ms/試合  (${(1000/a).toFixed(1)} 試合/秒)`);
 const b=await time(4,{search:{K:5,S:3,S2:4,T:3,prior:2}});console.log(`2ターン先読み(片側): ${b.toFixed(0)} ms/試合`);
 const procs=Math.max(1,Math.floor(cpus.length/2)-1);
 console.log('\n=== 見積もり（あくまで目安）===');console.log(`並列プロセス数の目安: ${procs}（論理コア/2 - 1。ノートPCは熱で遅くなるので控えめ）`);
 console.log(`探索なし: 1時間あたり約 ${Math.round(3600000/a*procs).toLocaleString()} 試合`);console.log(`2ターン先読み: 1時間あたり約 ${Math.round(3600000/b*procs).toLocaleString()} 試合`);
 console.log('\n(参考：Claudeの作業環境は 探索なし約60ms/試合、片側だけ2ターン先読み約1000〜4000ms/試合、1コア)');
})().catch(e=>{console.log('エラー:',e.stack)});
