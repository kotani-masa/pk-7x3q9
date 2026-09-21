#!/usr/bin/env python3
"""index.orig.html -> index.html (外部AI対応版) + ai/legacy_cpu.js（旧CPUアルゴリズム）
盤面ルール処理は変更せず、次の4点だけを差し替える。
  1. 勝利条件3種＋同時勝利判定（judge）
  2. CPU操作の一般化（P1/P2どちらもCPU化できる）
  3. 旧CPUアルゴリズムを外部ファイルへ切り出し、外部AI(ai/*.js)への橋渡し層に置換
  4. 非同期処理の完了待ち（AIが途中状態で次の判断をしないため）
"""
import re, sys
src = open('index.orig.html', encoding='utf-8').read()
L = src.split('\n')

def rep(s, old, new, cnt=1):
    assert s.count(old) >= 1, 'pattern not found: ' + old[:80]
    if cnt == 1:
        assert s.count(old) == 1, 'pattern not unique: ' + old[:80]
    return s.replace(old, new)

# ---- 旧CPUアルゴリズム部分（631〜727行）を切り出す ----
legacy = L[630:727]
assert legacy[0].startswith('const isBas'), legacy[0][:40]
assert legacy[-1].strip().endswith('items[i][1]()}'), legacy[-1][-40:]
lg = '\n'.join(legacy)
lg = lg.replace('P[1]', 'P[LW]').replace('P[0]', 'P[1-LW]')      # 操作プレイヤーを可変に
lg = lg.replace('G.act===1', 'G.act===LW').replace('G.act!==1', 'G.act!==LW').replace('own=P.indexOf(q)===1', 'own=P.indexOf(q)===LW')
lg = lg.replace("const isBas=c=>c.t==='pke'&&(!mi(c)||stageOf(c)==='たね'),knownBas=", "const knownBas=")   # isBasは橋渡し層側に移動
for n in ['cpuTurn', 'cpuSetup', 'cpuPk', 'cpuAsk', 'cpuMenu', 'cpuPick']:
    lg = re.sub(r'\b' + n + r'\b', 'legacy' + n[3:], lg)
for a_, b_ in [('async function legacyTurn(){', 'async function legacyTurn(i){LW=i;'), ('async function legacySetup(){', 'async function legacySetup(i){LW=i;'),
               ('function legacyPk(t,pool,n,min,ok){', 'function legacyPk(t,pool,n,min,ok,w){LW=w;'), ('function legacyAsk(ks,q,ttl,must){', 'function legacyAsk(ks,q,ttl,must,w){LW=w;'),
               ('function legacyMenu(items,ttl){', 'function legacyMenu(items,ttl,w){LW=w;')]:
    assert a_ in lg, a_
    lg = lg.replace(a_, b_)
legacy_js = ('/* 旧CPUアルゴリズム（比較用ベースライン／新AI未対応デッキ用のフォールバック）。\n'
             '   盤面の内部状態を直接読む「エミュレータ結合型」で、新AI（ai_core.js ほか）とは別物です。 */\n'
             'let LW=1;\n' + lg + '\n')
open('ai/legacy_cpu.js', 'w', encoding='utf-8').write(legacy_js)

# ---- index.html 本体 ----
head = L[:629]          # 〜629行（0-index 628）
old_cpu_head = L[629]   # 630行: コメント
assert 'CPU対戦（P2をプログラムが操作）' in old_cpu_head
tail = L[742:]          # 743行〜（surrender 以降）
assert tail[0].startswith('function surrender')
mid_old = '\n'.join(L[727:742])  # 728〜742行（cpuCheck, cpuStep, coinToss, cpuBegin, cpuStart）

adapter = open('adapter.js', encoding='utf-8').read().rstrip('\n')
s = '\n'.join(head) + '\n' + adapter + '\n' + '\n'.join(tail)

# 1) 勝利判定
s = rep(s, "p.phase='setup';p.koTurn=-9;p.mull=0;G.turn=1;G.drawn=0;G.ab={};G.nm={};G.atk=0;G.stp=0;G.over=0;",
           "p.phase='setup';p.koTurn=-9;p.mull=0;p.dko=0;G.turn=1;G.drawn=0;G.ab={};G.nm={};G.atk=0;G.stp=0;G.over=0;G.win=undefined;G.why=undefined;G.defer=0;")
old_ko = "\n".join(L[524:529])
assert old_ko.startswith("async function doKO")
new_ko = """/* ---- 勝利条件（3つ）：①サイドを取り切る ②相手が自分の番の開始時に山札を引けない ③相手の場にポケモンが1匹もいない
   同時に満たしたら「満たした条件が多い方」の勝ち。同数なら両者敗北（引き分け）。G.win = 0 / 1 / -1(両者敗北) ---- */
const winCond=i=>{const q=P[i],o=P[1-i],w=[],on=x=>x.phase==='wait'||x.phase==='play';
 if(on(q)&&!q.side.length)w.push('サイド');if(o.dko)w.push('山札切れ');if(on(o)&&!OWN(o).length)w.push('場にポケモンなし');return w};
function judge(){if(G.over||G.defer)return 0;const a=winCond(0),b=winCond(1);if(!a.length&&!b.length)return 0;
 G.over=1;G.win=a.length>b.length?0:b.length>a.length?1:-1;G.why=[a,b];
 const t=G.win<0?'両者が同時に勝利条件を満たしたため、両者敗北（引き分け）':`P${G.win+1}の勝利！（${(G.win?b:a).join('・')}）`;log(t);banner(G.win<0?'両者敗北（引き分け）':`P${G.win+1}の勝利！`);return 1}
async function doKO(i,k,np){const q=P[i],t=lastOf(q.piles[k]);if(!t)return;const n=prize(t),m=P[1-i];
  act(()=>{q.trash.push(...q.piles[k].splice(0));q.koTurn=G.turn;m.hand.push(...m.side.splice(0,n))});
  log(`${t.name}がきぜつ。P${2-i}がサイドを${n}枚とりました（残り${m.side.length}枚）`);
  if(judge()||G.over)return;
  if(k==='battle'&&!np)await promote(i)}"""
s = rep(s, old_ko, new_ko)
s = rep(s, "if(!ks.length){G.over=1;banner(`P${2-i}の勝利！`);return log(`P${i+1}の場にポケモンがいません。P${2-i}の勝利！`)}",
           "if(!ks.length){log(`P${i+1}の場にポケモンがいません`);judge();return}")
s = rep(s, "for(const k of ks.filter(k=>k!=='battle'))await doKO(i,k,1);if(ks.includes('battle'))await doKO(i,'battle')}",
           "for(const k of ks.filter(k=>k!=='battle')){if(G.over)break;await doKO(i,k,1)}if(!G.over&&ks.includes('battle'))await doKO(i,'battle');judge()}")
s = rep(s, "t.dm=(t.dm||0)+10*n;render();log(`カースドボム：${t.name}にダメカン${n}個`);await sleep(800);await doKO(P.indexOf(x.p),x.k);await koScan(x.o)}",
           "t.dm=(t.dm||0)+10*n;render();log(`カースドボム：${t.name}にダメカン${n}個`);await sleep(800);G.defer=1;try{await doKO(P.indexOf(x.p),x.k);await koScan(x.o)}finally{G.defer=0}judge()}")
s = rep(s, "act(()=>{if(!draw1(me()))err('山札がありません');else log(`${lb}ターン：P${cur+1}が1枚引きました`)})}",
           "act(()=>{if(!draw1(me())){me().dko=1;log(`P${cur+1}は山札が0枚で引けません`)}else log(`${lb}ターン：P${cur+1}が1枚引きました`)});judge()}")
s = rep(s, "const m=MYS();G.over=1;log(`P${m+1}が投了。P${2-m}の勝利！`)", "const m=MYS();G.over=1;G.win=1-m;log(`P${m+1}が投了。P${2-m}の勝利！`)")
s = rep(s, "else if(m.t==='sur'){G.over=1;", "else if(m.t==='sur'){G.over=1;G.win=1-m.i;")

# 2) CPU操作の一般化
s = rep(s, "const CPU={on:0,busy:0,tried:new Set(),sug:0,d:700,iv:0},MP=",
           "const CPU={on:0,busy:0,tried:new Set(),sug:0,d:700,iv:0,who:[0,1]},isCpu=i=>!!CPU.on&&!!CPU.who[i],MP=")
s = rep(s, "const err=t=>{if(CPU.on&&cur===1)return;", "const err=t=>{if(isCpu(cur)){CPUX.err=t;return}")
s = rep(s, "function menu(c,items,ttl,must,cx){if(CPU.on&&cur===1&&items.length){cpuMenu(items,ttl);return}",
           "function menu(c,items,ttl,must,cx){if(isCpu(cur)&&items.length)return cpuMenu(items,ttl,c,cur);")
s = rep(s, "if(CPU.on&&cur===1)return r(cpuPk(t,pool,n,min,ok));", "if(isCpu(cur))return r(cpuPk(t,pool,n,min,ok,cur));")
s = rep(s, "if(CPU.on&&(who!==undefined?who:cur)===1)return r(cpuAsk(ks,q,ttl,must));",
           "{const w=who!==undefined?who:cur;if(isCpu(w))return r(cpuAsk(ks,q,ttl,must,w,c))}")

# 4) 完了待ち
s = rep(s, "function act(fn,re){HS.push(", "let ACTN=0;function act(fn,re){ACTN++;HS.push(")
s = rep(s, "menu(c,[[`特性「${a.n}」を使う`,()=>runAb(c,k)],['使わない',()=>{}]],`${c.name}をベンチに出しました`,1)}",
           "return menu(c,[[`特性「${a.n}」を使う`,()=>runAb(c,k)],['使わない',()=>{}]],`${c.name}をベンチに出しました`,1)}")
s = rep(s, "if(isB&&was&&p.phase==='play')afterBench(own,c)}", "if(isB&&was&&p.phase==='play')return afterBench(own,c)}")
s = rep(s, "act(()=>{G.stp=G.turn;mv(c.u,'stadium')});(async()=>{await koScan(P[0]);await koScan(P[1])})()}",
           "act(()=>{G.stp=G.turn;mv(c.u,'stadium')});return (async()=>{await koScan(P[0]);await koScan(P[1])})()}")

# 外部スクリプトの読み込み（本体スクリプトの後）
s = rep(s, "</script></body></html>",
        "</script>\n<!-- CPUのプレイアルゴリズム（外部ファイル）。順番：core → 各デッキ用AI → 調整済みパラメータ → 価値関数(先読み用) → 旧CPU(未対応デッキ用) -->\n"
        "<script src=\"ai/ai_core.js\"></script>\n<script src=\"ai/ai_dragapult.js\"></script>\n<script src=\"ai/ai_rayquaza.js\"></script>\n<script src=\"ai/params_dragapult.js\"></script>\n<script src=\"ai/params_rayquaza.js\"></script>\n<script src=\"ai/value_model.js\"></script>\n<script src=\"ai/ai_refs.js\"></script>\n"
        "<script src=\"ai/legacy_cpu.js\"></script>\n</body></html>")

# ================= ルール微調整（マリガン強制／セットアップ裏向き／使用待機／CPU速度） =================
# A) 使用待機スロット
s = rep(s, "stadium:[]}});", "stadium:[],staging:[]}});")
# B) マリガンは強制（たねがいれば不可、いなければ強制）。手札は相手に公開
s = rep(s, "delete G.act;delete G.fp}", "delete G.act;delete G.fp;autoMull(p,cur)}")
s = rep(s, '<button data-a="mull">マリガン</button><button class="pri" data-a="side">', '<button class="pri" data-a="side">')
mm = re.search(r"else if\(a==='mull'\)\{.*?log\(`P\$\{cur\+1\}がマリガン（\$\{p\.mull\}回目）`\)\}\)\}", s, re.S)
assert mm, 'mull handler'
s = s.replace(mm.group(0), "else if(a==='mull')err('マリガンは自動です（たねポケモンがいなければ強制、いれば行えません）')")
# C) 開始時：置いたポケモンは裏向き→スタートと同時に表にする
s = rep(s, "function board(i,f){const p=P[i],o=[],cn=n=>", "function board(i,f){const p=P[i],o=[],hid=f&&P.some(x=>x.phase==='setup'||x.phase==='wait'),cn=n=>")
s = rep(s, 'data-u="${t?t.u:\'\'}" data-dm="${t&&t.dm||0}"', 'data-u="${t&&!hid?t.u:\'\'}" data-dm="${t&&t.dm||0}"')
s = rep(s, "t?cardH(t)+att(pl)+dmB(t,pl)+abB(t,i,k):'')}", "t?(hid?back():cardH(t)+att(pl)+dmB(t,pl)+abB(t,i,k)):'')}")
s = rep(s, "P.forEach(x=>{if(x.phase==='wait')x.phase='play'});G.turn=1;", "P.forEach(x=>{if(x.phase==='wait')x.phase='play'});log('バトル場・ベンチのポケモンを一斉に表にしました');G.turn=1;")
# D) グッズ・サポートは効果処理が終わるまで盤面（使用待機）に置く
s = rep(s, "const fin=(c,fn)=>act(()=>{mv(c.u,'trash');if(c.t==='sup')G.sup=G.turn;fn&&fn()});",
           "const fin=(c,fn)=>{STG.done=1;act(()=>{if(c.t==='sup')G.sup=G.turn;fn&&fn()})};   // 使用カードは runFX が効果終了後にトラッシュへ送る")
s = rep(s, "if(FX[c.name])return FX[c.name](c);else{act(()=>{mv(c.u,'trash')", "if(FX[c.name])return runFX(c);else{act(()=>{mv(c.u,'trash')")
i0 = s.index("'ハイパーボール':async c=>{"); i1 = s.index("log('ハイパーボールを使用')},", i0) + len("log('ハイパーボールを使用')},")
s = s[:i0] + """'ハイパーボール':async c=>{const p=me(),o=p.hand.filter(x=>x.u!==c.u);if(o.length<2)return err('手札が足りません');
   const d=await pk('トラッシュする手札を2枚選択',o,2);if(!d)return;
   act(()=>{d.forEach(x=>mv(x.u,'trash'));STG.commit=1});log('ハイパーボール：手札2枚をトラッシュ（コスト）');await stgPause();   // コストは選択直後にトラッシュへ
   const t=await pk('山札からポケモンを1枚選択',p.deck,1,0,x=>x.t==='pke');
   fin(c,()=>{(t||[]).forEach(x=>mv(x.u,'hand'));shuffle(p.deck)});log('ハイパーボールを使用')},""" + s[i1:]
s = rep(s, "const err=t=>{if(isCpu(cur)){CPUX.err=t;return}", "const err=t=>{ERRN++;if(isCpu(cur)){CPUX.err=t;return}")
# E) CPUの間（立て続けに処理しない）
s = rep(s, "if(isCpu(cur))return r(cpuPk(t,pool,n,min,ok,cur));", "if(isCpu(cur)){const w0=cur;return sleep(CPU.d*.4).then(()=>r(cpuPk(t,pool,n,min,ok,w0)))}")
s = rep(s, "{const w=who!==undefined?who:cur;if(isCpu(w))return r(cpuAsk(ks,q,ttl,must,w,c))}", "{const w=who!==undefined?who:cur;if(isCpu(w))return sleep(CPU.d*.4).then(()=>r(cpuAsk(ks,q,ttl,must,w,c)))}")
s = rep(s, '`<button data-a="sur">投了</button>`):\'\')', '`<button data-a="sur">投了</button>`+(CPU.on?`<button data-a="cpuspd">速度：${CPUSPD[CPULV][0]}</button>`:\'\')):\'\')')
s = rep(s, "if(a==='sur'){surrender();return}if(a==='cpuend'){", "if(a==='cpuspd'){cpuSpdToggle();return}if(a==='sur'){surrender();return}if(a==='cpuend'){")
s = rep(s, "else if(a==='trash')openTrash(+t.dataset.p);else if(a==='logs')openLog();", "else if(a==='stg'){const z=lastOf(P[+t.dataset.p].piles.staging);if(z)menu(z,[])}\nelse if(a==='trash')openTrash(+t.dataset.p);else if(a==='logs')openLog();")
s = rep(s, "else if(a==='cpu')cpuStart();else if(a==='sur')surrender();", "else if(a==='cpu')cpuStart();else if(a==='cpuspd')cpuSpdToggle();else if(a==='sur')surrender();")
s = rep(s, "else if(a==='stad')stadMenu(i);", "else if(a==='stad')stadMenu(i);\nelse if(a==='stg'){const z=lastOf(P[i].piles.staging);if(z)menu(z,[])}")

# F) ログを左側へ移動／使用待機スロットはターン終了ボタンの下（山札と同じ大きさ。1枚ずつしか出ないので双方共通の1スロット）
s = rep(s, 'return`<div id="hud">${h}<div id="log" data-a="logs">${lgH()}</div><div id="err">${e(ERR)}</div></div>`}',
           'return`<div id="hud">${h}<div id="err">${e(ERR)}</div></div><div id="log" data-a="logs" style="position:absolute;z-index:3;color:#111;${at(6,945,340,false)}">${lgH()}</div>`}')
s = rep(s, "+hud();setTimeout(fixBench,0)}", "+stgSlot()+hud();setTimeout(fixBench,0)}")

# G) 相手のサーチ公開／相手の手札から出るカードのモーション
s = rep(s, "function mv(u,d){const p=me(),c=find(p,u);if(!c)return;", "function mv(u,d){const p=me(),wd=d==='hand'&&p.deck.some(x=>x.u===u),c=find(p,u);if(!c)return;if(wd)onSearch(P.indexOf(p),c);")
s = rep(s, "function animate(pv,hc,sd){const CI={},LOC={};", "function animate(pv,hc,sd){if(NOFLY){NOFLY=0;return}const CI={},LOC={};")
s = rep(s, "hideFly(el,back(),src,n.r,d++)}}\n for(const u in pv.m)", "hideFly(el,back(),src,n.r,d++)}\n  else if(MP()&&+n.p===1-VW()&&n.a!=='hand'&&oppFly(el,c,n,pv,hc,d))d++}\n for(const u in pv.m)")
s = rep(s, "for(let j=0;j<Math.min(3,hc[t]-LASTHC[t]);j++)if(oh&&pv.z[t]){", "for(let j=0;j<Math.min(3,hc[t]-LASTHC[t]);j++)if(oh&&pv.z[t]&&!revPending(t)){")
s = rep(s, "DROPR=null}\nfunction render(){", "oppAttachFly(pv,hc,d);DROPR=null}\nfunction render(){")
s = rep(s, "LASTSC=sn;DROPR=null;netSend()}", "LASTSC=sn;DROPR=null;LS=snapLoc();revPlay();netSend()}")
s = rep(s, "log('バトル場・ベンチのポケモンを一斉に表にしました');", "NOFLY=1;log('バトル場・ベンチのポケモンを一斉に表にしました');")
s = rep(s, "G.over=0;G.win=undefined;G.why=undefined;G.defer=0;", "G.over=0;G.win=undefined;G.why=undefined;G.defer=0;G.revEv=undefined;G.revN=0;REVSEEN=0;")

# H) 監査フック（エネルギーを付けた直後に呼ぶ。通常は何もしない）
s = rep(s, "act(()=>{mv(c.u,own);if(c.t==='ene')G.eat=G.turn});log(`P${cur+1}が${c.name}を${lastOf(p.piles[own]).name}につけました`)}",
           "act(()=>{mv(c.u,own);if(c.t==='ene')G.eat=G.turn});if(ATTACHHOOK)ATTACHHOOK(cur,c,own);log(`P${cur+1}が${c.name}を${lastOf(p.piles[own]).name}につけました`)}")

# I) 先読み（探索）用：先読み中(SIMQ)は画面更新・ログ・待ち時間・ターン切替を止める。ターン終了の記録フック
s = rep(s, "const sleep=ms=>new Promise(r=>setTimeout(r,ms));", "const sleep=ms=>SIMQ?Promise.resolve():new Promise(r=>setTimeout(r,ms));")
s = rep(s, "function render(){const hs=$('.hand')", "function render(){if(SIMQ)return;const hs=$('.hand')")
s = rep(s, "log=t=>{LGS.push(t);", "log=t=>{if(SIMQ)return;LGS.push(t);")
s = rep(s, "function banner(t){const b=document.createElement('div')", "function banner(t){if(SIMQ)return;const b=document.createElement('div')")
s = rep(s, "function coinAnim(head){return new Promise(res=>{", "function coinAnim(head){if(SIMQ)return Promise.resolve();return new Promise(res=>{")
s = rep(s, "async function turnSwitch(){if(G.over)return;act(()=>{const a0=", "async function turnSwitch(){if(G.over)return;if(SIMQ&&SIMSTOP){SIMEND=1;return}if(!SIMQ&&TURNEND)TURNEND(cur);act(()=>{const a0=")

# J) 「先読み」ON/OFFボタン
s = rep(s, "`<button data-a=\"cpuspd\">速度：${CPUSPD[CPULV][0]}</button>`:'')", "`<button data-a=\"cpuspd\">速度：${CPUSPD[CPULV][0]}</button><button data-a=\"cpusrch\">先読み：${CPU.srch?'ON':'OFF'}</button>`:'')")
s = rep(s, "if(a==='cpuspd'){cpuSpdToggle();return}", "if(a==='cpuspd'){cpuSpdToggle();return}if(a==='cpusrch'){cpuSrchToggle();return}")
s = rep(s, "else if(a==='cpuspd')cpuSpdToggle();", "else if(a==='cpuspd')cpuSpdToggle();else if(a==='cpusrch')cpuSrchToggle();")

open('index.html', 'w', encoding='utf-8').write(s)
print('ok', len(s), 'legacy', len(legacy_js))
