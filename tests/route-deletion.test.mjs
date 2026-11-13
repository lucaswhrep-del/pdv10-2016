import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../functions/route-deletion.js';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(count=3){
 const writes=[],queries=[];
 const docs=Array.from({length:count},(_,i)=>({id:`2026-11-09_p${i}`,ref:`ref${i}`,data:()=>({date:'2026-11-09',planned:4,valid:3})}));
 const query={where:(...args)=>{queries.push(args);return query;},limit:limit=>{assert.equal(limit,201);return query;}};
 const db={collection:name=>name==='routeDays'?query:{doc:()=> 'archive'},runTransaction:async callback=>callback({get:async q=>{assert.equal(q,query);return {docs};},create:(...args)=>writes.push(['create',...args]),delete:ref=>writes.push(['delete',ref])})};
 const run=(input={date:'2026-11-09',confirmationDate:'2026-11-09',expectedCount:3})=>core.deleteRouteDate({db,adminUid:'admin',input,timestamp:()=> 'server-time',fail:(code,message)=>Object.assign(new Error(message),{code})});
 return {run,writes,queries};
}
test('exclusão arquiva registros e remove somente a data confirmada na mesma transação',async()=>{
 const {run,writes,queries}=fixture();assert.deepEqual(await run(),{date:'2026-11-09',count:3});
 assert.deepEqual(queries,[['date','==','2026-11-09']]);assert.equal(writes.length,4);
 const archive=writes[0][2];assert.equal(archive.deletedBy,'admin');assert.equal(archive.records.length,3);assert.equal(archive.deletedAt,'server-time');
 assert.deepEqual(writes.slice(1),[['delete','ref0'],['delete','ref1'],['delete','ref2']]);
});
test('contagem desatualizada ou data sem registros não apagam nada',async()=>{
 for(const count of [0,2,201]){const f=fixture(count);await assert.rejects(f.run());assert.equal(f.writes.length,0);}
});
test('data inválida, falta de confirmação e quantidade inválida são rejeitadas antes da consulta',async()=>{
 for(const change of [{date:'2026-11-31',confirmationDate:'2026-11-31'},{date:'2027-11-09'},{confirmationDate:'2026-11-10'},{expectedCount:0},{expectedCount:201}]){
  const f=fixture();await assert.rejects(f.run({date:'2026-11-09',confirmationDate:'2026-11-09',expectedCount:3,...change}));assert.equal(f.queries.length,0);assert.equal(f.writes.length,0);
 }
});
test('callable impede exclusão por visitante, promotor, supervisor e administrador inativo',async()=>{
 for(const profile of [null,{role:'promoter',active:true},{role:'supervisor',active:true},{role:'admin',active:false}]){
  let transactions=0;const module={exports:{}};
  const db={doc:()=>({get:async()=>({exists:true,data:()=>profile})}),runTransaction:()=>{transactions++;throw Error('Não deveria chegar aqui');}};
  class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
  const modules={'firebase-functions/v2/https':{onCall:(_options,handler)=>handler,HttpsError},'firebase-admin/auth':{getAuth:()=>({})},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{},Timestamp:{}},'firebase-admin/storage':{getStorage:()=>({bucket:()=>({})})},'./route-deletion':core};
  vm.runInNewContext(fs.readFileSync(new URL('../functions/campaign.js',import.meta.url),'utf8'),{module,require:name=>modules[name]});
  await assert.rejects(module.exports.deleteRouteImport({auth:profile?{uid:'u'}:null,data:{date:'2026-11-09',confirmationDate:'2026-11-09',expectedCount:3}}));
  assert.equal(transactions,0);
 }
});
