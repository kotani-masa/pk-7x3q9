'use strict';
// One entry point for the supported tools. All paths resolve from this file.
const path=require('node:path'),{spawnSync}=require('node:child_process');
const commands={
 test:['tests/test_layout.js','tests/test_zoroark.js','tests/test_zoroark_engine.js'],
 eval:['cli/eval_zoroark.js'],optimize:['training/optimize.js'],
 'verify-info':['tests/verify_info.js'],'verify-hidden':['tests/verify_hidden.js'],'test-rules':['tests/test_rules.js'],
 bench:['cli/bench.js'],report:['cli/report.js'],showlog:['cli/showlog.js'],
 'import-decks':['tools/import_decks.js'],'make-refs':['tools/make_refs.js'],
 collect:['training/value_data.js'],parallel:['training/parallel.js'],train:['training/value_train.js'],'train-all':['training/train_all.js']
};
const descriptions={test:'構成とゾロアークAIのテスト',eval:'ゾロアークの対戦評価',optimize:'行動パラメータの調整','verify-info':'AIへ渡す情報の検査','verify-hidden':'先読みと隠れた情報の検査','test-rules':'ルール処理の検査',bench:'処理速度の測定',report:'既存AIの比較',showlog:'対戦ログ表示','import-decks':'デッキ取込','make-refs':'想定デッキデータの更新',collect:'学習用データ収集',parallel:'並列データ収集',train:'価値関数学習','train-all':'収集データをまとめて学習'};
const name=process.argv[2];
if(!name||['help','--help','-h'].includes(name)){console.log('使い方: node sim/run.js <コマンド> [引数]\n');for(const k of Object.keys(commands))console.log(k.padEnd(16)+descriptions[k]);}
else if(!commands[name]){console.error('不明なコマンド: '+name);process.exitCode=1;}
else for(const file of commands[name]){const result=spawnSync(process.execPath,[path.join(__dirname,file),...process.argv.slice(3)],{stdio:'inherit'});if(result.error){console.error(result.error);process.exitCode=1;break;}if(result.status!==0){process.exitCode=result.status||1;break;}}
