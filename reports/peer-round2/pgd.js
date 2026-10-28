'use strict';
const path=require('path'),fs=require('fs');
const [root,opp,n,seed,out]=process.argv.slice(2);
const {Sim}=require(path.join(root,'sim/lib/headless'));const D=require(path.join(root,'sim/lib/decks'));
(async()=>{const s=new Sim();const w=[];
for(let i=0;i<+n;i++){const seat=i%2,decks=seat?[D[opp],D.dragapult]:[D.dragapult,D[opp]];
 const x=await s.play({decks,opt:[{},{}],seed:+seed+i,maxTurn:80});
 w.push(x.win===seat?'W':x.win===1-seat?'L':'X');}
fs.writeFileSync(out,w.join(''));})().catch(e=>{console.error(e);process.exit(1)});
