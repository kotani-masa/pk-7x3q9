'use strict';
/* ヘッドレス自己対戦ハーネス
   ・index.html の本体スクリプト（＝エミュレータのルール処理そのもの）を画面なしで実行する
   ・AI（ai/*.js）は別の vm コンテキストに隔離。盤面オブジェクトには一切触れず、JSONで複製された「見える情報」だけを受け取る
     → AIが隠れた情報（相手の手札・山札の順序・サイドの中身）を読めないことを構造的に保証する */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..');

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const DRIVER = `
;(function(){
render=function(){};banner=function(){};coinAnim=function(){return Promise.resolve()};
act=function(fn,re){ACTN++;fn();re&&re()};
window.__AUD=[{att:0,ex:0},{att:0,ex:0}];
ATTACHHOOK=(i,c,k)=>{if(c.t!=='ene')return;const pl=P[i].piles[k],t=lastOf(pl),nm=nk(t.name),seen=new Set();let mx=0;const add=n=>{const m=MON[n]||MON[n+'#0'];if(m&&m.at)for(const a of m.at)mx=Math.max(mx,a.cost.length)};add(nm);
  const kids=n=>{for(const ch in EVO)if(nk(EVO[ch])===n&&!seen.has(nk(ch))){seen.add(nk(ch));add(nk(ch));kids(nk(ch))}};kids(nm);const m0=MON[nm]||MON[nm+'#0']||{};
  __AUD[i].att++;if(eunits(pl)>Math.max(mx,m0.rc||0)){__AUD[i].ex++;(__AUD[i].s=__AUD[i].s||[]).push(t.name+' 付属'+pl.slice(0,-1).filter(x=>x.t==='ene').map(x=>x.name.replace(/エネルギー/,'')).join('/')+' 上限'+Math.max(mx,m0.rc||0)+' '+(k==='battle'?'バトル':'ベンチ'))}};
window.__REC=null;
TURNEND=(i)=>{if(!window.__REC)return;const c=CPUX.ctl[i];if(c&&c.features&&P[i].phase==='play')__REC.push([i,c.features(cj(cpuView(i,'turn'))),G.turn])};
window.__run=async function(cfg){window.__REC=cfg.rec?[]:null;
  CPU.on=1;CPU.who=[1,1];CPU.srch=cfg.srch?1:0;NET.on=0;G.mode='play';CPU.d=cfg.simD!==undefined?cfg.simD:0;HS={push(){},pop(){},shift(){},length:0};
  P[0].cards=cfg.decks[0];P[1].cards=cfg.decks[1];
  for(const d of cfg.decks)for(const c of d)if(c.var!==undefined)VMAP[c.id]=c.var;
  CPUX.opt=cfg.opt||[{},{}];
  [0,1].forEach(z=>{cur=z;start()});cur=0;cpuBind();
  const w=Math.random()<.5?0:1;G.fp=cpuOrder(w)?w:1-w;
  let guard=0;
  while(!G.over&&guard++<6000){
    const c=CTRL();
    if(P[c].phase==='setup')await cpuSetup(c);
    else if(P[c].phase==='play'&&G.act===c)await cpuTurn(c);else break;
    if(G.turn>(cfg.maxTurn||90)){G.over=1;G.win=-2;break}
  }
  return {rec:__REC,aud:__AUD,over:G.over,g:guard,win:G.win,turn:G.turn,fp:G.fp,side:[P[0].side.length,P[1].side.length],why:G.why||null,deck:[P[0].deck.length,P[1].deck.length],log:cfg.log?LGS.slice():undefined};
};
window.CPUAI=window.__bridge;window.__dbg=function(s){return eval(s)};
})();
`;

class Sim {
  constructor(opts = {}) {
    const AIDIR = opts.aiDir || path.join(ROOT, 'ai');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const ms = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    let main = ms[ms.length - 1][1].replace(/\nrender\(\);\s*$/, '\n');
    const legacy = fs.readFileSync(path.join(AIDIR, 'legacy_cpu.js'), 'utf8');
    this.engine = new vm.Script(main + '\n' + legacy + '\n' + DRIVER, { filename: 'engine.js' });
    this.aiFiles = (opts.aiFiles || ['ai_core.js', 'ai_dragapult.js', 'ai_rayquaza.js', 'params_dragapult.js', 'params_rayquaza.js', 'value_model.js', 'ai_refs.js']).filter(f => fs.existsSync(path.join(AIDIR, f)));
    this.aiSources = this.aiFiles.map(f => fs.readFileSync(path.join(AIDIR, f), 'utf8'));
  }
  /* AIコンテキスト：盤面のグローバル(P,G,...)が存在しない空の世界で、AIコードだけを実行する */
  makeAI(seed) {
    const ctx = vm.createContext({ console });
    ctx.window = ctx; vm.runInContext('Math', ctx).random = mulberry32(seed ^ 0x9e3779b9);
    this.aiSources.forEach((s, i) => vm.runInContext(s, ctx, { filename: this.aiFiles[i] }));
    vm.runInContext(`window.__hold=[];window.__dispatch=function(m,id,j){const R=window.CPUAI,a=j?JSON.parse(j):null;let r;
      if(m==='detect')r=R.detect(a);else if(m==='ref')r=R.ref(a);else if(m==='create'){window.__hold.push(R.create(a.name,a.opts));r=window.__hold.length-1}
      else{const c=window.__hold[id];r=c[m]?c[m].apply(c,a):null}return JSON.stringify(r===undefined?null:r)}`, ctx);
    return ctx;
  }
  /* 1試合。cfg: {decks:[d0,d1], opt:[{...},{...}], seed, maxTurn, log} */
  async play(cfg) {
    const seed = cfg.seed >>> 0, rng = mulberry32(seed);
    const ai = this.aiSources.length ? (this._ai || (this._ai = this.makeAI(seed))) : null; if (ai) vm.runInContext('window.__hold.length=0', ai);
    const el = new Proxy({ style: {}, dataset: {}, classList: { add() { }, remove() { } }, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? function () { return el; } : undefined), set: (t, k, v) => (t[k] = v, true) });
    const ctx = vm.createContext({
      console, setTimeout: (f) => setImmediate(f), clearTimeout() { }, setInterval() { return 0; }, clearInterval() { },
      document: { querySelector: () => el, querySelectorAll: () => [], createElement: () => el, body: el, documentElement: el },
      localStorage: {}, navigator: {}, innerWidth: 400, innerHeight: 900, alert() { }, confirm: () => true, prompt: () => null,
      addEventListener() { }, RTCPeerConnection: function () { }, requestAnimationFrame: (f) => setImmediate(f),
    });
    ctx.window = ctx; vm.runInContext('Math', ctx).random = rng;
    ctx.__aiHost = (m, id, j) => ai.__dispatch(m, id, j);
    vm.runInContext(`window.__bridge=${ai ? `{__marshal:true,
      detect:cards=>JSON.parse(__aiHost('detect',-1,JSON.stringify(cards))),ref:t=>JSON.parse(__aiHost('ref',-1,JSON.stringify(t))),
      create:(name,opts)=>{const id=JSON.parse(__aiHost('create',-1,JSON.stringify({name,opts})));const call=(m,...a)=>JSON.parse(__aiHost(m,id,JSON.stringify(a)));
        return {setup:v=>call('setup',v),decide:v=>call('decide',v),pk:(v,q)=>call('pk',v,q),ask:(v,q)=>call('ask',v,q),menu:(v,q)=>call('menu',v,q),order:v=>call('order',v),result:(a,ok,e)=>call('result',a,ok,e),features:v=>call('features',v),value:v=>call('value',v),candidates:(v,K)=>call('candidates',v,K),commit:a=>call('commit',a),hasValue:()=>call('hasValue')}}}` : 'undefined'};`, ctx);
    this.engine.runInContext(ctx);
    this.ctx = ctx;
    const r = await ctx.__run({ decks: cfg.decks, opt: cfg.opt, maxTurn: cfg.maxTurn, log: cfg.log, rec: cfg.rec, srch: cfg.srch, simD: cfg.simD });
    return JSON.parse(JSON.stringify(r));
  }
}
module.exports = { Sim, mulberry32 };
