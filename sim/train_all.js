'use strict';
/* parallel.js の出力を全部まとめて学習し、ai/value_model.js を更新する
   node sim/train_all.js runs/data1 [--max 400000]   （--max: デッキタイプごとの最大局面数。メモリ節約） */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const dir=process.argv[2];if(!dir){console.log('使い方: node sim/train_all.js <出力ディレクトリ> [--max 400000]');process.exit(1)}
const mi=process.argv.indexOf('--max'),MAX=mi>0?+process.argv[mi+1]:400000;
const files=fs.readdirSync(dir).filter(f=>/^c_\d+\.json$/.test(f)).sort();if(files.length<4){console.log('チャンクが少なすぎます（4つ以上）:',files.length);process.exit(1)}
const nTest=Math.max(1,Math.floor(files.length/10)),trF=files.slice(0,-nTest),teF=files.slice(-nTest);
const load=fl=>fl.flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
const cap=rows=>{const by={};for(const r of rows)(by[r[0]]=by[r[0]]||[]).push(r);return Object.values(by).flatMap(a=>{if(a.length<=MAX)return a;for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,MAX)})};
const tr=cap(load(trF)),te=load(teF);fs.writeFileSync(path.join(dir,'_train.json'),JSON.stringify(tr));fs.writeFileSync(path.join(dir,'_test.json'),JSON.stringify(te));
console.log(`学習 ${tr.length.toLocaleString()}局面 / 検証 ${te.length.toLocaleString()}局面`);
execFileSync(process.execPath,['--max-old-space-size=6000',path.join(__dirname,'value_train.js'),path.join(dir,'_train.json'),path.join(dir,'_test.json'),'--write'],{stdio:'inherit'});
