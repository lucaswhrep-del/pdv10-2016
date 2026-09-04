import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teamRecord,createTeamRepository} from '../team-data.js';
const base={uid:'p1',name:'Pessoa fictícia',email:'PESSOA@example.invalid',role:'promoter',sourceId:'001',supervisorId:'s1'};
test('cadastro preserva código e exige vínculo para promotor',()=>{
 assert.equal(teamRecord(base).sourceId,'001');assert.equal(teamRecord(base).email,'pessoa@example.invalid');
 for(const change of [{uid:'a/b'},{role:'admin'},{name:''},{email:'sem-email'},{sourceId:'x'},{supervisorId:''},{supervisorId:'p1'}])assert.throws(()=>teamRecord({...base,...change}));
});
test('supervisor não recebe código ou supervisor do formulário',()=>{
 const result=teamRecord({...base,role:'supervisor'});assert.equal(result.sourceId,'');assert.equal(result.supervisorId,'');
});
test('não-admin não cria perfil; promotor não lista equipe',async()=>{
 const repo=createTeamRepository({store:{},db:{},identity:()=>({uid:'p1'}),profile:()=>({uid:'p1',role:'promoter'})});
 await assert.rejects(repo.create(base));await assert.rejects(repo.page());
});
