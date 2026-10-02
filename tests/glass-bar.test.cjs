const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const source=read('glass-bar.js'),reference=read('reference/claude-tabbar.html'),html=read('index.html');
test('reference shader equations and spring constants are preserved',()=>{
  const lines=reference.match(/var FS=\[([\s\S]*?)\]\.join/)[1].split('\n').filter(s=>s.trim());
  for(const line of lines){if(line.includes('uniform vec2 u_res')||line.includes('vec3 bg('))continue;assert.ok(source.includes(line.trim()),'Missing reference shader line: '+line);}
  assert.ok(source.includes('K=160,D=15,KJ=300,DJ=12,GJ=0.002'));
  assert.ok(source.includes('(c.cw/2+4)*(1+e)'));
  assert.ok(source.includes('(r.height/2+5)/(1+e*0.7)'));
});
test('old dock removed, finance pages and entry flows retained',()=>{
  assert.doesNotMatch(html,/dockCompact|dockIndicator|bottomZone|quickEntryInput|glassRefraction|\.dock[\s{.-]/);
  for(const id of ['home','goals','insights','debts','people','person','balanceAnalysis','accountDetail','flowDetail','marketDetail'])assert.ok(html.includes('id="'+id+'"'));
  for(const id of ['manualBackdrop','saveTx','voiceTestInput','addFinanceOperation','openFinanceInput'])assert.ok(html.includes('id="'+id+'"'));
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  new vm.Script(source);new vm.Script(read('glass-background.js'));
});
test('spring retargets continuously and settles without invalid geometry',()=>{
  const step=source.match(/function step\(h,target\)\{[\s\S]*?\n\}/)[0];
  const sim=vm.createContext({});
  vm.runInContext('var x=0,v=0,j=0,jv=0,dir=1,drag=null,K=160,D=15,KJ=300,DJ=12,GJ=.002;'+step,sim);
  for(let i=0;i<60;i++)vm.runInContext('step(1/180,300)',sim);
  const before=sim.x;assert.ok(before>100);
  vm.runInContext('dir=-1',sim);assert.equal(sim.x,before);
  for(let i=0;i<1000;i++)vm.runInContext('step(1/180,70)',sim);
  assert.ok(Math.abs(sim.x-70)<.001);assert.ok(Math.abs(sim.v)<.001);
  assert.ok(Number.isFinite(sim.j));
});
test('tap vs drag is based on movement, and initial selection follows actual page',()=>{
  assert.ok(source.includes('Math.abs(e.clientX-drag.start)>5'));
  assert.ok(source.includes(':drag.index'));
  assert.ok(source.includes('notifyGlassNavigation();'));
});
test('native page scroll moves the cached texture instead of freezing the top image',async()=>{
  const calls=[],dataset={};let top=0,captures=0,page='home',clock=1000;
  const app={id:'',offsetWidth:400,offsetHeight:1500,scrollHeight:1500,addEventListener(){},querySelector(){return{id:page};},getBoundingClientRect(){return{left:0,top,width:400,height:1500};}};
  const context={setTransform(){},fillRect(){},save(){},restore(){},drawImage(...args){calls.push(args);}};
  const document={documentElement:{dataset},body:{classList:{contains(){return false;}}},querySelector(selector){return selector==='.app'?app:null;},createElement(){return{getContext(){return context;}};},addEventListener(){}};
  const gl={activeTexture(){},bindTexture(){},texImage2D(){},texParameteri(){}};
  const scheduled=[];
  const sandbox={window:{},document,setTimeout(fn){scheduled.push(fn);},performance:{now(){return clock;}},devicePixelRatio:1,MutationObserver:class{observe(){}},html2canvas:async()=>{captures++;return{};},console};
  vm.createContext(sandbox);vm.runInContext(read('glass-background.js'),sandbox);
  const bg=sandbox.window.WebGLBackground(gl,{}, {clientWidth:400,clientHeight:874});
  bg.resize(400,874);bg.draw(400,874,true);assert.equal(scheduled.length,0);assert.equal(captures,0);
  bg.draw(400,874,false);assert.equal(captures,0);scheduled.shift()();await new Promise(setImmediate);bg.draw(400,874);
  assert.equal(bg.textureSize()[1],192);
  top=-300;bg.draw(400,874);
  assert.equal(captures,1);assert.equal(calls.at(-1)[2],-300);assert.equal(dataset.glassUploads,'3');
  page='debts';clock+=1000;bg.draw(400,874,true);assert.equal(captures,1);
  bg.draw(400,874,false);scheduled.shift()();await new Promise(setImmediate);assert.equal(captures,2);
  page='home';bg.draw(400,874,false);assert.equal(scheduled.length,0);assert.equal(captures,2);
});
test('PWA cache and storage do not modify the main application namespace',()=>{
  assert.ok(html.includes("const STORAGE_KEY='webgl-glass-bar-v01'"));
  assert.ok(read('sw.js').includes("k.startsWith('webgl-glass-bar-')"));
});
