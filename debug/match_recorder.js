/* One-match diagnostics. Full information stays outside CPUAI observations. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x,(k,v)=>k==='img'||k==='full'?undefined:v));
const ordered=x=>Array.isArray(x)?x.map(ordered):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])])):x;
const checksum=x=>{const s=JSON.stringify(ordered(x));let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');};
function diff(a,b,path=[],out=[]){
 if(JSON.stringify(a)===JSON.stringify(b))return out;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b)||(Array.isArray(a)&&a.length!==b.length)){out.push({op:'set',path,value:b});return out;}
 for(const k of Object.keys(a))if(!Object.hasOwn(b,k))out.push({op:'remove',path:path.concat(k)});
 for(const k of Object.keys(b))if(!Object.hasOwn(a,k))out.push({op:'set',path:path.concat(k),value:b[k]});else diff(a[k],b[k],path.concat(k),out);
 return out;
}
function apply(state,patch){for(const p of patch){if(p.path.some(k=>['__proto__','prototype','constructor'].includes(String(k))))throw Error('Invalid replay path');if(!p.path.length){if(p.op!=='set')throw Error('Invalid root operation');state=clone(p.value);continue;}let at=state;for(const k of p.path.slice(0,-1))at=at[k];const k=p.path[p.path.length-1];if(p.op==='remove')delete at[k];else if(p.op==='set')at[k]=clone(p.value);else throw Error('Invalid replay operation');}return state;}
function states(record){if(record?.format!=='pokeca-match'||record.schema!==1)throw Error('Unsupported match log');let state=clone(record.initial),out=[{seq:-1,state:clone(state)}];if(checksum(state)!==record.initialHash)throw Error('Initial state checksum mismatch');for(const e of record.events){if(e.kind!=='state')continue;state=apply(state,e.patch);if(checksum(state)!==e.hash)throw Error('State checksum mismatch at event '+e.seq);out.push({seq:e.seq,state:clone(state)});}return out;}
class Recorder{
 constructor(){this.serial=0;this.clear();}
 clear(){this.data=null;this.previous=null;this.started=new Set();this.token=null;this.getState=null;}
 begin(player,token,meta,getState){if(!this.data||this.token!==token||this.started.has(player)||this.previous?.G?.over){this.clear();this.token=token;this.getState=getState;const initial=clone(getState());this.previous=initial;this.data={format:'pokeca-match',schema:1,id:'match-'+Date.now().toString(36)+'-'+(++this.serial),createdAt:new Date().toISOString(),meta:clone(meta),initial,initialHash:checksum(initial),events:[],complete:false};}this.started.add(player);}
 event(kind,payload){if(!this.data)return;this.data.events.push({seq:this.data.events.length,kind,payload:clone(payload===undefined?null:payload)});}
 checkpoint(label){if(!this.data||!this.getState)return;const next=clone(this.getState()),patch=diff(this.previous,next);if(patch.length){this.data.events.push({seq:this.data.events.length,kind:'state',label,patch,hash:checksum(next)});this.previous=next;}this.data.complete=!!next.G?.over;}
 wrapController(controller,player,enabled){if(!controller||controller.__matchWrapped)return controller;const recorder=this;
 for(const method of ['order','setup','bench','decide','pk','ask','menu','attach','result','candidates','commit','features','value','hasValue']){if(typeof controller[method]!=='function')continue;const original=controller[method];controller[method]=function(...args){if(!enabled())return original.apply(this,args);recorder.checkpoint('before-ai');const input=clone(args);let result;try{result=original.apply(this,args);}catch(error){recorder.event('ai-error',{player,method,args:input,message:String(error.message)});throw error;}recorder.event('ai',{player,method,args:input,result:result===undefined?null:result,reason:method==='decide'?this.last?.why||this.explain?.()||null:null});return result;};}
 Object.defineProperty(controller,'__matchWrapped',{value:true});return controller;}
 export(){if(!this.data)throw Error('No match recorded');this.checkpoint('export');return clone(this.data);}
 async download(){const record=this.export(),blob=new Blob([JSON.stringify(record)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=record.id+'.pokeca.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
const api={Recorder,clone,checksum,apply,states};root.PokecaDiagnostics=api;root.PokecaMatchRecorder=new Recorder();if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
