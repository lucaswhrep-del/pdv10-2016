import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProfile,connectionError} from '../firebase-access.js';
import {firebaseConfig} from '../firebase-config.js';
test('configuração aponta exclusivamente ao projeto informado',()=>{assert.equal(firebaseConfig.projectId,'pdv-10---2026');assert.equal(firebaseConfig.storageBucket,'pdv-10---2026.firebasestorage.app');assert.ok(Object.isFrozen(firebaseConfig));});
test('perfil exige liberação explícita e função válida',()=>{assert.throws(()=>validateProfile(null));assert.throws(()=>validateProfile({active:'true',role:'admin'}));assert.throws(()=>validateProfile({active:true,role:'owner'}));assert.deepEqual(validateProfile({active:true,role:'admin'}),{role:'admin'});});
test('promotor sem supervisor é recusado',()=>{assert.throws(()=>validateProfile({active:true,role:'promoter'}));assert.deepEqual(validateProfile({active:true,role:'promoter',supervisorId:'supervisor-id'}),{role:'promoter'});});
test('mensagens não revelam detalhes brutos de credenciais',()=>{assert.equal(connectionError({code:'auth/user-not-found'}),connectionError({code:'auth/wrong-password'}));assert.ok(!connectionError({message:'dados sensíveis'}).includes('sensíveis'));});
