import {before,after,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,limit,deleteDoc,serverTimestamp,writeBatch} from 'firebase/firestore';
import * as store from 'firebase/firestore';
import {createClientRepository} from '../../firestore-clients.js';
let env;
const client=(uid='admin')=>({code:'001',name:'Cliente fictício',city:'Cidade',district:'Bairro',street:'Rua',updatedBy:uid,updatedAt:serverTimestamp()});
before(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8089')throw Error('Somente emulador local na porta 8089 é permitido.');
 env=await initializeTestEnvironment({projectId:'demo-pdv10',firestore:{host:'127.0.0.1',port:8089,rules:await readFile(new URL('../../firebase/firestore-clients.rules',import.meta.url),'utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const [uid,profile] of Object.entries({admin:{active:true,role:'admin'},supervisor:{active:true,role:'supervisor'},promoter:{active:true,role:'promoter',supervisorId:'supervisor'},inactive:{active:false,role:'admin'},invalid:{active:true,role:'other'},unlinked:{active:true,role:'promoter'}}))await setDoc(doc(db,'users',uid),profile);
  await setDoc(doc(db,'clients','001'),client());
 });
});
after(async()=>{await env?.cleanup();});
test('módulo real grava, consulta e pagina no emulador',async()=>{
 const profile={uid:'admin',role:'admin'};
 const repo=createClientRepository({store,db:env.authenticatedContext('admin').firestore(),identity:()=>({uid:'admin'}),profile:()=>profile});
 const record={code:'integration-001',name:'Teste de integração',city:'Cidade',district:'Bairro',street:'Rua'};
 await repo.upload([record]);
 const result=await repo.find(record.code);
 if(result?.name!==record.name)throw Error('Registro não persistiu');
 const page=await repo.page();if(!page.rows.length||page.rows.length>25)throw Error('Paginação inválida');
});
test('anônimo, sem perfil, inativo, papel inválido e promotor sem vínculo não leem clientes',async()=>{
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'clients','001')));
 for(const uid of ['missing','inactive','invalid','unlinked'])await assertFails(getDoc(doc(env.authenticatedContext(uid).firestore(),'clients','001')));
});
test('três perfis ativos podem consultar código, só admin lista até 25',async()=>{
 for(const uid of ['admin','supervisor','promoter'])await assertSucceeds(getDoc(doc(env.authenticatedContext(uid).firestore(),'clients','001')));
 const db=env.authenticatedContext('admin').firestore();
 await assertSucceeds(getDocs(query(collection(db,'clients'),limit(25))));
 await assertFails(getDocs(query(collection(db,'clients'),limit(26))));
 await assertFails(getDocs(collection(db,'clients')));
 for(const uid of ['supervisor','promoter'])await assertFails(getDocs(query(collection(env.authenticatedContext(uid).firestore(),'clients'),limit(25))));
});
test('só admin grava esquema válido com autor e horário do servidor',async()=>{
 for(const uid of ['supervisor','promoter','inactive'])await assertFails(setDoc(doc(env.authenticatedContext(uid).firestore(),'clients','001'),client(uid)));
 const ref=doc(env.authenticatedContext('admin').firestore(),'clients','001');
 await assertSucceeds(setDoc(ref,client()));
 for(const extra of [{updatedBy:'promoter'},{updatedAt:new Date(0)},{name:''},{city:4},{code:'different'},{cnpj:'extra'}])await assertFails(setDoc(ref,{...client(),...extra}));
 await assertFails(deleteDoc(ref));
});
test('lote de dez clientes é aceito',async()=>{
 const db=env.authenticatedContext('admin').firestore(),batch=writeBatch(db);
 for(let i=0;i<10;i++){const code=`batch-${i}`;batch.set(doc(db,'clients',code),{...client(),code});}
 await assertSucceeds(batch.commit());
});
test('próprio perfil é legível mas nem admin altera perfis ou pontuação',async()=>{
 const db=env.authenticatedContext('admin').firestore();
 await assertSucceeds(getDoc(doc(db,'users','admin')));
 await assertFails(getDoc(doc(db,'users','promoter')));
 await assertFails(setDoc(doc(db,'users','admin'),{role:'admin',active:true}));
 for(const collectionName of ['routes','conquests','winners'])await assertFails(setDoc(doc(db,collectionName,'x'),{score:100}));
});
