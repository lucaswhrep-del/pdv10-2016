import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import * as store from 'firebase/firestore';
import {createTeamRepository} from '../../team-data.js';
let env;
const db=uid=>env.authenticatedContext(uid).firestore();
const profile=(role='supervisor')=>({role,active:true});
const repo=uid=>{const p={uid,role:uid==='a'?'admin':'supervisor'};return createTeamRepository({store,db:db(uid),identity:()=>({uid}),profile:()=>p});};
const input=(uid,role='supervisor',sourceId='',supervisorId='')=>({uid,role,sourceId,supervisorId,name:'Fictício '+uid,email:uid+'@example.invalid'});
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8089')throw Error('Emulador local obrigatório');
 env=await initializeTestEnvironment({projectId:'demo-pdv10-team',firestore:{host:'127.0.0.1',port:8089,rules:await readFile(new URL('../../firebase/firestore-team.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{await store.setDoc(store.doc(ctx.firestore(),'users','a'),profile('admin'));});
});
after(async()=>env?.cleanup());
test('admin cadastra supervisor e promotor com código reservado atomicamente',async()=>{
 await repo('a').create(input('s1'));await repo('a').create(input('p1','promoter','001','s1'));
 const saved=await store.getDoc(store.doc(db('a'),'users','p1'));assert.equal(saved.data().supervisorId,'s1');
 assert.equal((await store.getDoc(store.doc(db('a'),'routeCodes','001'))).data().owner,'p1');
});
test('UID e código existentes não são sobrescritos, nem deixam perfil parcial',async()=>{
 await assert.rejects(repo('a').create(input('s1')));await assert.rejects(repo('a').create(input('p2','promoter','001','s1')));
 assert.equal((await store.getDoc(store.doc(db('a'),'users','p2'))).exists(),false);
});
test('nega autoelevação e criação de administrador',async()=>{
 await assertFails(store.setDoc(store.doc(db('p1'),'users','p1'),profile('admin')));
 await assertFails(store.setDoc(store.doc(db('a'),'users','new-admin'),profile('admin')));
});
test('supervisor lista somente seus vinculados, promotor não lista',async()=>{
 await repo('a').create(input('s2'));await repo('a').create(input('p3','promoter','003','s2'));
 const page=await repo('s1').page();assert.deepEqual(page.rows.map(p=>p.uid),['p1']);
 await assertFails(store.getDoc(store.doc(db('s1'),'users','p3')));
 await assertFails(store.getDocs(store.query(store.collection(db('s1'),'users'),store.limit(25))));
 await assertFails(store.getDocs(store.query(store.collection(db('p1'),'users'),store.limit(25))));
 await assertFails(store.getDocs(store.query(store.collection(db('a'),'users'),store.limit(26))));
});
test('nega promotor sem índice e reserva de código isolada',async()=>{
 const data={...input('p4','promoter','004','s1'),active:true,createdBy:'a',updatedBy:'a',createdAt:store.serverTimestamp(),updatedAt:store.serverTimestamp()};delete data.uid;
 await assertFails(store.setDoc(store.doc(db('a'),'users','p4'),data));
 await assertFails(store.setDoc(store.doc(db('a'),'routeCodes','004'),{owner:'p4'}));
});
test('supervisor inexistente ou inativo é recusado',async()=>{
 await assert.rejects(repo('a').create(input('p5','promoter','005','missing')));
 await env.withSecurityRulesDisabled(async ctx=>store.setDoc(store.doc(ctx.firestore(),'users','off'),{role:'supervisor',active:false}));
 await assert.rejects(repo('a').create(input('p5','promoter','005','off')));
});
test('clientes continuam acessíveis ao admin e pontuação permanece bloqueada',async()=>{
 await assertSucceeds(store.setDoc(store.doc(db('a'),'clients','001'),{code:'001',name:'Fictício',city:'',district:'',street:'',updatedBy:'a',updatedAt:store.serverTimestamp()}));
 await assertFails(store.setDoc(store.doc(db('a'),'conquests','c1'),{grade:10}));
});
test('regras recusam supervisor inválido mesmo ignorando validação do aplicativo',async()=>{
 for(const supervisorId of ['missing','off','a','p1']){
  const uid='invalid-'+supervisorId,code='99'+['missing','off','a','p1'].indexOf(supervisorId);
  const fields={...input(uid,'promoter',code,supervisorId),active:true,createdBy:'a',updatedBy:'a',createdAt:store.serverTimestamp(),updatedAt:store.serverTimestamp()};delete fields.uid;
  const database=db('a'),batch=store.writeBatch(database);batch.set(store.doc(database,'users',uid),fields);batch.set(store.doc(database,'routeCodes',code),{owner:uid});await assertFails(batch.commit());
 }
});
