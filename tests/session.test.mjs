import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionController} from '../session-controller.js';
function setup(readProfile,signOut=async()=>{}){const states=[];const controller=createSessionController({readProfile,signOut,onState:s=>states.push(s)});return {controller,states};}
test('sessão só aceita identidade e perfil válido, sem repassar campos extras',async()=>{
 const {controller,states}=setup(async uid=>{assert.equal(uid,'u1');return {role:'admin',active:true,name:'Admin',secret:'not-exposed'};});
 await controller.accept({uid:'u1',email:'admin@example.invalid',accessToken:'not-exposed'});
 assert.equal(states.at(-1).status,'ready');assert.equal(states.at(-1).profile.role,'admin');
 assert.equal(JSON.stringify(states).includes('not-exposed'),false);
});
test('bloqueia perfil ausente, inativo, papel inválido ou promotor sem supervisor',async()=>{
 for(const profile of [null,{active:false,role:'admin'},{active:true,role:'owner'},{active:true,role:'promoter'}]){
  const {controller,states}=setup(async()=>profile);await controller.accept({uid:'u'});
  assert.equal(states.at(-1).status,'blocked');assert.equal(states.some(s=>s.profile),false);
 }
});
test('erro de leitura falha fechado sem expor resposta bruta',async()=>{
 const {controller,states}=setup(async()=>{throw Error('sensitive backend data');});await controller.accept({uid:'u'});
 assert.equal(states.at(-1).status,'blocked');assert.equal(JSON.stringify(states).includes('sensitive'),false);
});
test('resposta atrasada não restaura dados após logout',async()=>{
 let resolve;const {controller,states}=setup(()=>new Promise(r=>resolve=r));
 const request=controller.accept({uid:'u'});await controller.logout();resolve({active:true,role:'admin'});await request;
 assert.equal(states.at(-1).status,'signed-out');assert.equal(states.some(s=>s.status==='ready'),false);
});
test('troca de conta descarta o perfil da conta anterior',async()=>{
 let resolve;const {controller,states}=setup(uid=>uid==='old'?new Promise(r=>resolve=r):Promise.resolve({active:true,role:'supervisor'}));
 const old=controller.accept({uid:'old'});await controller.accept({uid:'new'});resolve({active:true,role:'admin'});await old;
 assert.equal(states.at(-1).profile.uid,'new');assert.equal(states.at(-1).profile.role,'supervisor');
});
test('revalidação remove acesso quando o perfil é desativado',async()=>{
 let active=true;const {controller,states}=setup(async()=>({active,role:'admin'}));
 await controller.accept({uid:'u'});active=false;await controller.accept({uid:'u'});
 assert.equal(states.at(-1).status,'blocked');assert.equal(states.at(-1).profile,undefined);
});
test('falha de logout bloqueia a interface e permite nova tentativa',async()=>{
 const {controller,states}=setup(async()=>({active:true,role:'admin'}),async()=>{throw Error('offline');});
 await controller.accept({uid:'u'});await controller.logout();assert.equal(states.at(-1).status,'blocked');
});
