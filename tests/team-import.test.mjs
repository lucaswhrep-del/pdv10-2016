import test from 'node:test';import assert from 'node:assert/strict';import {parseTeamRows} from '../team-import.js';
const headers=['Nome','Email','Perfil','Codigo roteiro','Email supervisor'];
test('valida supervisores e vínculos em planilha',()=>{const r=parseTeamRows([headers,['Super','s@x.com','Supervisor','',''],['Promo','p@x.com','Promotor','001','s@x.com']]);assert.equal(r.errors.length,0);assert.equal(r.rows[1].role,'promoter');});
test('recusa e-mail e código duplicados',()=>{const r=parseTeamRows([headers,['A','a@x.com','Promotor','1','s@x.com'],['B','a@x.com','Promotor','1','s@x.com']]);assert.ok(r.errors.length>=2);});
test('aceita supervisor já cadastrado fora da planilha',()=>{const r=parseTeamRows([headers,['A','a@x.com','Promotor','1','s@x.com']]);assert.deepEqual(r.errors,[]);});
