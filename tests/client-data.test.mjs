import test from 'node:test';
import assert from 'node:assert/strict';
import {clientRecord,prepareClientUpload,uploadClientBatches} from '../client-data.js';
import {createClientRepository} from '../firestore-clients.js';
const client=code=>({code,name:'Loja de teste',city:'Cidade',district:'Centro',street:'Rua 1'});
test('preserva zeros e remove campos não necessários',()=>{
 assert.deepEqual(clientRecord({...client('001'),cnpj:'not-sent'}),client('001'));
});
test('rejeita paths, códigos vazios, grandes, campos e duplicatas inválidos',()=>{
 for(const code of ['','a/b','..','a'.repeat(65)])assert.throws(()=>clientRecord(client(code)));
 assert.throws(()=>clientRecord({...client('1'),name:''}));
 assert.throws(()=>clientRecord({...client('1'),city:'a'.repeat(251)}));
 assert.throws(()=>prepareClientUpload([client('1'),client('1')]));
 assert.throws(()=>prepareClientUpload([]));
});
test('valida a base completa antes da primeira gravação',async()=>{
 let commits=0;await assert.rejects(uploadClientBatches([client('1'),client('/')],{commit:async()=>commits++,allowed:()=>true}));assert.equal(commits,0);
});
test('lotes são sequenciais, limitados e contabilizados',async()=>{
 const sizes=[],progress=[];let active=0;
 const total=await uploadClientBatches(Array.from({length:23},(_,i)=>client(String(i))),{
  allowed:()=>true,commit:async rows=>{assert.equal(active++,0);sizes.push(rows.length);await Promise.resolve();active--;},onProgress:n=>progress.push(n)
 });assert.equal(total,23);assert.deepEqual(sizes,[10,10,3]);assert.deepEqual(progress,[10,20,23]);
});
test('falha parcial não repete lote automaticamente nem finge sucesso',async()=>{
 let calls=0;await assert.rejects(uploadClientBatches(Array.from({length:21},(_,i)=>client(String(i))),{
  allowed:()=>true,commit:async()=>{if(++calls===2)throw Error('network');}
 }),error=>error.confirmed===10&&error.uncertain===true);assert.equal(calls,2);
});
test('troca de sessão interrompe os lotes restantes',async()=>{
 let allowed=true,calls=0;await assert.rejects(uploadClientBatches(Array.from({length:11},(_,i)=>client(String(i))),{
  allowed:()=>allowed,commit:async()=>{calls++;allowed=false;}
 }),error=>error.confirmed===10&&error.uncertain===false);assert.equal(calls,1);
});
test('repository bloqueia listagem e importação de não-admin antes da chamada',async()=>{
 const repo=createClientRepository({store:{},db:{},identity:()=>({uid:'p'}),profile:()=>({uid:'p',role:'promoter'})});
 await assert.rejects(repo.page());await assert.rejects(repo.upload([client('1')]));
});
test('repository bloqueia identidade diferente do perfil',async()=>{
 const repo=createClientRepository({store:{},db:{},identity:()=>({uid:'other'}),profile:()=>({uid:'admin',role:'admin'})});await assert.rejects(repo.find('1'));
});
test('paginação usa limite 25 e cursor do código, sem listener',async()=>{
 let captured;
 const store={documentId:()=>'$id',orderBy:x=>['order',x],limit:n=>['limit',n],startAfter:x=>['after',x],collection:(_,x)=>x,query:(...args)=>{captured=args;return args;},getDocs:async()=>({docs:[{id:'002',data:()=>client('002')}]})};
 const repo=createClientRepository({store,db:{},identity:()=>({uid:'a'}),profile:()=>({uid:'a',role:'admin'})});
 const result=await repo.page('001');assert.deepEqual(captured,['clients',['order','$id'],['limit',25],['after','001']]);assert.equal(result.cursor,'002');assert.equal(result.more,false);
});
test('gravação usa timestamp do SDK e para se a mesma conta iniciar nova sessão',async()=>{
 let p={uid:'a',role:'admin'},writes=[];
 const store={doc:(_,collection,code)=>`${collection}/${code}`,serverTimestamp:()=>'SERVER_TIME',writeBatch:()=>({set:(path,data)=>writes.push({path,data}),commit:async()=>{p={uid:'a',role:'admin'};}})};
 const repo=createClientRepository({store,db:{},identity:()=>({uid:'a'}),profile:()=>p});
 await assert.rejects(repo.upload(Array.from({length:11},(_,i)=>client(String(i)))),e=>e.confirmed===10);
 assert.equal(writes.length,10);assert.equal(writes[0].data.updatedAt,'SERVER_TIME');assert.equal(writes[0].data.updatedBy,'a');
});
