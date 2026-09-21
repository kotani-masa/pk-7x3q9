const {Sim}=require('./headless');const D=require('./decks');
(async()=>{const s=new Sim();const [da,db,seed]=[process.argv[2]||'dragapult',process.argv[3]||'rayquaza',+process.argv[4]||5001];
 const oa=process.argv[5]==='L'?{legacy:1}:{},ob=process.argv[6]==='L'?{legacy:1}:{};
 const r=await s.play({decks:[D[da],D[db]],opt:[oa,ob],seed,log:1});
 console.log(r.log.join('\n'));console.log(JSON.stringify({...r,log:undefined}))})();
