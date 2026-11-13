import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../functions/route-query.js';
import {routeScore} from '../domain.js';
function queryFor(rows,calls=[],offset=0){return {startAfter:doc=>queryFor(rows,calls,rows.indexOf(doc)+1),limit:n=>({get:async()=>{calls.push({offset,n});return {docs:rows.slice(offset,offset+n)};}})};}
test('painel lê mais de 100 registros sem perder o terceiro dia do promotor 67',async()=>{
 const rows=Array.from({length:126},(_,i)=>({id:String(i),sourceId:'other',planned:1,valid:1}));
 rows[36]={sourceId:'67',date:'2026-11-09',planned:3,valid:3};rows[78]={sourceId:'67',date:'2026-11-10',planned:4,valid:3};rows[120]={sourceId:'67',date:'2026-11-11',planned:3,valid:3};
 const calls=[],all=await core.readAllDocuments(queryFor(rows,calls));assert.equal(all.length,126);assert.deepEqual(calls,[{offset:0,n:100},{offset:100,n:100}]);
 const lucas=all.filter(r=>r.sourceId==='67'),planned=lucas.reduce((s,r)=>s+r.planned,0),valid=lucas.reduce((s,r)=>s+r.valid,0);assert.deepEqual(routeScore(valid,planned),{percent:90,points:90});
});
test('paginação trata vazio e múltiplo exato sem duplicar registros',async()=>{
 for(const length of [0,100,200]){const rows=Array.from({length},(_,id)=>({id}));assert.deepEqual(await core.readAllDocuments(queryFor(rows)),rows);}
});
test('falha na segunda página não retorna dados parciais como resultado completo',async()=>{
 const query={limit:()=>({get:async()=>({docs:Array.from({length:100},(_,id)=>({id}))})}),startAfter:()=>({limit:()=>({get:async()=>{throw Error('Falha de leitura');}})})};await assert.rejects(core.readAllDocuments(query),/Falha de leitura/);
});
