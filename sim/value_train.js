'use strict';
/* 価値関数の学習：ロジスティック回帰（L2正則化・ニュートン法）。デッキタイプ別（相手タイプは特徴量）。
   使い方: node value_train.js train.json[,train2.json] test.json  → 検証してから全データで再学習し ai/value_model.js を出力 */
const fs=require('fs'),path=require('path');
const NAMES=['先頭:サイド差','自サイド残','相手サイド残','自サイド≤2','相手サイド≤2','自場数','相手場数','自バトル残HP率','自バトル賞金','相手バトル残HP率','相手バトル賞金','自ダメカン計','相手ダメカン計','自エネ計','相手エネ計','自バトルエネ','相手バトルエネ','即戦力1','即戦力2','即戦力数','被ダメ見込','KO危険','KO危険×賞金','ベンチ露出賞金','次KO可','次KO可×賞金','自手札','相手手札','自山札少','自山札','ターン','先攻','自ベンチ賞金','相手ベンチ賞金','相手=レックウザ','相手=ドラパ'];
const load=fs.existsSync?f=>f.split(',').flatMap(x=>JSON.parse(fs.readFileSync(x,'utf8'))):null;
const EXB=[0,1,2,7,9,17,20,21,24,26,29,30];   // 交互作用を取る特徴（サイド差・KO危険・即戦力など）
const expand=f=>{const o=f.slice();for(let i=0;i<EXB.length;i++)for(let j=i;j<EXB.length;j++)o.push(f[EXB[i]]*f[EXB[j]]);return o};
const sig=z=>1/(1+Math.exp(-z));
function fit(X,y,lam){const n=X.length,d=X[0].length,mu=new Array(d).fill(0),sd=new Array(d).fill(0);
 for(const r of X)for(let j=0;j<d;j++)mu[j]+=r[j]/n;for(const r of X)for(let j=0;j<d;j++)sd[j]+=(r[j]-mu[j])**2/n;for(let j=0;j<d;j++)sd[j]=Math.sqrt(sd[j])||1;
 const Z=X.map(r=>r.map((v,j)=>(v-mu[j])/sd[j]));let w=new Array(d).fill(0),b=0;
 for(let it=0;it<25;it++){const g=new Array(d+1).fill(0),H=Array.from({length:d+1},()=>new Array(d+1).fill(0));
  for(let i=0;i<n;i++){const z=Z[i];let s=b;for(let j=0;j<d;j++)s+=w[j]*z[j];const p=sig(s),e=p-y[i],h=p*(1-p);
   for(let j=0;j<d;j++){g[j]+=e*z[j];for(let k=j;k<d;k++)H[j][k]+=h*z[j]*z[k];H[j][d]+=h*z[j]}g[d]+=e;H[d][d]+=h}
  for(let j=0;j<=d;j++)for(let k=0;k<j;k++)H[j][k]=H[k][j];for(let j=0;j<d;j++){g[j]+=lam*w[j];H[j][j]+=lam}
  // 解く（ガウス消去）
  const A=H.map((r,i)=>[...r,g[i]]);const m=d+1;for(let i=0;i<m;i++){let p=i;for(let r=i+1;r<m;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];for(let r=i+1;r<m;r++){const f=A[r][i]/A[i][i];for(let c=i;c<=m;c++)A[r][c]-=f*A[i][c]}}
  const st=new Array(m);for(let i=m-1;i>=0;i--){let s=A[i][m];for(let c=i+1;c<m;c++)s-=A[i][c]*st[c];st[i]=s/A[i][i]}
  let mx=0;for(let j=0;j<d;j++){w[j]-=st[j];mx=Math.max(mx,Math.abs(st[j]))}b-=st[d];if(mx<1e-6)break}
 return{mu,sd,w,b}}
const pred=(m,x)=>{let s=m.b;for(let j=0;j<x.length;j++)s+=m.w[j]*(x[j]-m.mu[j])/m.sd[j];return sig(s)};
function auc(ps,ys){const a=ps.map((p,i)=>[p,ys[i]]).sort((u,v)=>u[0]-v[0]);let r=0,np=0,nn=0;const rk=[];for(let i=0;i<a.length;){let j=i;while(j<a.length&&a[j][0]===a[i][0])j++;const mr=(i+j+1)/2;for(let k=i;k<j;k++)rk.push(mr);i=j}
 a.forEach((x,i)=>{if(x[1]>0.75){r+=rk[i];np++}else if(x[1]<0.25)nn++});return(r-np*(np+1)/2)/(np*nn)}
const ll=(ps,ys)=>-ps.reduce((s,p,i)=>s+ys[i]*Math.log(Math.max(1e-9,p))+(1-ys[i])*Math.log(Math.max(1e-9,1-p)),0)/ps.length;
if(require.main===module){const [tr,te]=[process.argv[2],process.argv[3]];const A=load(tr),B=load(te);const out={};if(process.env.BASE36){for(const r of A.concat(B))r[2]=r[2].slice(0,36)}
 for(const ty of['dragapult','rayquaza']){const a=A.filter(r=>r[0]===ty),b=B.filter(r=>r[0]===ty);
  const m=fit(a.map(r=>expand(r[2])),a.map(r=>r[3]),10),ps=b.map(r=>pred(m,expand(r[2]))),ys=b.map(r=>r[3]);
  const base=ys.reduce((s,y)=>s+y,0)/ys.length;const pm=ps.map(()=>base);
  const m0=fit(a.map(r=>[r[2][0]]),a.map(r=>r[3]),3),p0=b.map(r=>pred(m0,[r[2][0]]));
  console.log(`${ty}: 学習${a.length}局面 / 検証${b.length}局面  logloss ${ll(ps,ys).toFixed(4)} (定数 ${ll(pm,ys).toFixed(4)}, サイド差のみ ${ll(p0,ys).toFixed(4)})  AUC ${auc(ps,ys).toFixed(3)} (サイド差のみ ${auc(p0,ys).toFixed(3)})  正解率 ${(100*ps.reduce((s,p,i)=>s+((p>.5)===(ys[i]>.5)&&ys[i]!==.5?1:0),0)/ys.filter(y=>y!==.5).length).toFixed(1)}%`);
  const idx=m.w.slice(0,36).map((w,i)=>[Math.abs(w),i,w]).sort((u,v)=>v[0]-u[0]).slice(0,6);console.log('   影響の大きい特徴:',idx.map(([_,i,w])=>`${NAMES[i]}(${w>0?'+':''}${w.toFixed(2)})`).join(' '));
  const all=[...a,...b];out[ty]=Object.assign(fit(all.map(r=>expand(r[2])),all.map(r=>r[3]),10),{ex:EXB})}
 if(process.argv[4]==='--write'){fs.writeFileSync(path.join(__dirname,'../ai/value_model.js'),`/* 自動生成：sim/value_train.js（自己対戦${A.length+B.length}局面から学習した勝率予測。ロジスティック回帰） */\n(function (G) { const R = G.CPUAI = G.CPUAI || {}; R.value = ${JSON.stringify(out)}; })(typeof window !== 'undefined' ? window : globalThis);\n`);console.log('→ ai/value_model.js を出力')}}
module.exports={fit,pred,auc,ll,NAMES};
