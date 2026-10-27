'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="(ai\/[^\"]+)"/g)].map(m=>m[1]);
assert.equal(scripts.length,10);for(const file of scripts){assert(fs.existsSync(path.join(root,file)),file);new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});}
function check(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){if(f.name==='archive')continue;const full=path.join(dir,f.name);if(f.isDirectory())check(full);else if(f.name.endsWith('.js')){const s=fs.readFileSync(full,'utf8');new vm.Script(s,{filename:full});for(const m of s.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)){const p=path.resolve(path.dirname(full),m[1]);assert(fs.existsSync(p)||fs.existsSync(p+'.js'),'missing import: '+p);}}}}
check(path.join(root,'sim'));check(path.join(root,'debug'));for(const file of ['debug/build_info.js','debug/match_recorder.js'])assert(html.includes('src="'+file+'"'),'diagnostics asset not loaded');const{Sim}=require('../lib/headless');const sim=new Sim();const expected=sim.aiFiles.map(f=>'ai/'+f).concat('ai/legacy/legacy_cpu.js');assert.deepEqual(new Set(scripts),new Set(expected));
console.log('PASS layout: browser assets, simulation imports, syntax, and AI load lists');
