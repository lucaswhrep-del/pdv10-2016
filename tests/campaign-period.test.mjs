import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../functions/campaign-period.js';
import {currentCampaignMonth} from '../domain.js';
import fs from 'node:fs';
import vm from 'node:vm';
const fail=(code,message)=>Object.assign(new Error(message),{code});
test('mês vigente segue Brasília na virada de novembro para dezembro',()=>{
 for(const [at,month] of [['2026-12-01T02:59:59Z','2026-11'],['2026-12-01T03:00:00Z','2026-12']]){
  const now=new Date(at);assert.equal(core.currentCampaignMonth(now),month);assert.equal(currentCampaignMonth(now),month);assert.equal(core.creationMonth(month,now,fail),month);
 }
});
test('servidor rejeita setembro, outubro e mês futuro mesmo com aplicativo antigo',()=>{
 for(const month of ['2026-09','2026-10','2026-12',undefined])assert.throws(()=>core.creationMonth(month,new Date('2026-11-17T15:00:00Z'),fail),/mês vigente/);
});
test('cadastro fica encerrado fora de novembro e dezembro de 2026',()=>{
 for(const at of ['2026-10-20T15:00:00Z','2027-01-01T03:00:00Z'])assert.throws(()=>core.creationMonth(core.currentCampaignMonth(new Date(at)),new Date(at),fail),/encerrado/);
});
test('callable valida o mês no servidor antes de criar qualquer conquista',async()=>{
 const writes=[],module={exports:{}};
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-11-17T15:00:00Z']));}}
 const db={doc:()=>({get:async()=>({exists:true,data:()=>({role:'promoter',active:true,supervisorId:'supervisor',name:'Loja'})})}),collection:()=>({doc:()=>({id:'new-conquest',create:async data=>writes.push(data)})})};
 const modules={'firebase-functions/v2/https':{onCall:(_options,handler)=>handler,HttpsError},'firebase-admin/auth':{getAuth:()=>({})},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'server-time'},Timestamp:{}},'firebase-admin/storage':{getStorage:()=>({bucket:()=>({})})},'./route-deletion':{},'./route-query':{},'./campaign-period':core};
 vm.runInNewContext(fs.readFileSync(new URL('../functions/campaign.js',import.meta.url),'utf8'),{module,require:name=>modules[name],Date:FixedDate});
 for(const month of ['2026-09','2026-10','2026-12'])await assert.rejects(module.exports.createConquest({auth:{uid:'p'},data:{month,clientCode:'1',title:'Teste'}}),/mês vigente/);
 assert.equal(writes.length,0);
 await module.exports.createConquest({auth:{uid:'p'},data:{month:'2026-11',clientCode:'1',title:'Teste'}});
 assert.equal(writes.length,1);assert.equal(writes[0].month,'2026-11');
});
