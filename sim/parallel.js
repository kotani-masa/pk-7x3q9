'use strict';
/* 自己対戦データの並列生成（途中で止めても、もう一度同じコマンドで続きから再開できる）
   node sim/parallel.js --procs 5 --hours 8 --games 100 --search 2 --outdir runs/data1
     --procs  同時に動かすプロセス数（既定: 論理コア/2 - 1）   --hours  この時間で打ち切る（既定 1）
     --games  1チャンク(1ファイル)あたりの試合数              --search 0=探索なし 1=1ターン先読み 2=2ターン先読み
     --outdir 出力先（チャンクごとに c_<番号>.json）            --seed0  チャンク番号の開始値（別の実行と被らないように） */
const fs=require('fs'),os=require('os'),path=require('path'),{fork}=require('child_process');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const PROCS=+arg('procs',Math.max(1,Math.floor(os.cpus().length/2)-1)),HOURS=+arg('hours',1),GAMES=+arg('games',100),SEARCH=arg('search','2'),OUT=arg('outdir','runs/data1'),SEED0=+arg('seed0',1000),MAX=+arg('chunks',1e9);
fs.mkdirSync(OUT,{recursive:true});for(const f of fs.readdirSync(OUT))if(f.endsWith('.tmp'))fs.unlinkSync(path.join(OUT,f));   // 途中で切れたファイルは捨てる
const t0=Date.now(),end=t0+HOURS*3600e3;let next=0,running=0,done=0,pos=0,stop=false;const kids=new Set();
const have=f=>fs.existsSync(path.join(OUT,f));
function launch(){
 while(running<PROCS&&!stop&&Date.now()<end&&next<MAX){const seed=SEED0+next++,name=`c_${seed}.json`;if(have(name)){done++;continue}
  const tmp=path.join(OUT,name+'.tmp');running++;
  const k=fork(path.join(__dirname,'value_data.js'),['--games',String(GAMES),'--seed',String(seed),'--search',SEARCH,'--out',tmp],{silent:true});kids.add(k);
  k.on('exit',code=>{kids.delete(k);running--;if(code===0&&fs.existsSync(tmp)){fs.renameSync(tmp,path.join(OUT,name));done++;try{pos+=JSON.parse(fs.readFileSync(path.join(OUT,name),'utf8')).length}catch(_){}
    const el=(Date.now()-t0)/60000;console.log(`[${new Date().toLocaleTimeString()}] チャンク${name} 完了 | 合計 ${done}チャンク / 今回の局面 ${pos.toLocaleString()} | 経過 ${el.toFixed(1)}分`)}
   else if(!stop)console.log('チャンク失敗（再実行で続きから）',name,'code',code);
   if(running===0&&(stop||Date.now()>=end||next>=MAX)){console.log('終了。出力先:',OUT);process.exit(0)}launch()})}
 if(running===0){console.log('終了（対象なし）。出力先:',OUT);process.exit(0)}}
process.on('SIGINT',()=>{stop=true;console.log('\n中断します（実行中のチャンクは破棄。同じコマンドで続きから再開できます）');for(const k of kids)k.kill();setTimeout(()=>process.exit(0),500)});
console.log(`開始: ${PROCS}プロセス / ${HOURS}時間まで / 1チャンク${GAMES}試合 / 探索=${SEARCH} / 出力=${OUT}`);launch();
