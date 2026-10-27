'use strict';
// 1試合の通常ログを表示する。使い方: node sim/run.js showlog <先手側デッキ> <後手側デッキ> <seed> [L|N] [L|N]（Lは旧CPU）
const {Sim}=require('../lib/headless');const D=require('../lib/decks');
(async()=>{const s=new Sim();const [da,db,seed]=[process.argv[2]||'dragapult',process.argv[3]||'rayquaza',+process.argv[4]||5001];
 const oa=process.argv[5]==='L'?{legacy:1}:{},ob=process.argv[6]==='L'?{legacy:1}:{};
 const r=await s.play({decks:[D[da],D[db]],opt:[oa,ob],seed,log:1,maxTurn:80});
 console.log(r.log.map(l=>l.t).join('\n'));console.log(JSON.stringify({win:r.win,firstPlayer:r.fp,turn:r.turn,prizesLeft:r.side,why:r.why}))})();
