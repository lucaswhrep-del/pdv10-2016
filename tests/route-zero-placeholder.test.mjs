import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRouteLines,matchRegisteredRoutePromoters} from '../import-utils.js';
const header=['Relatório da Equipe: 1','Data: 10/11/2026','Promotor: 116 - RAPHAEL DE SOUZA PEREIRA'];
const visits=['5371101 SUPERMERCADO RMC LTDA 08:10 11:24 03:14','5027368 L S N SILVA COM VAJ PROD ALIM LTDA 13:02 14:57 01:55','5343041 COMERCIAL DE ALI SAN FRANCISCO LTDA 15:04 16:30 01:26','5186019 COMERCIAL ALIM SAN FRANCISCO LTDA 16:37 18:04 01:27'];
test('código zero sem horários e nome duplicado inequívoco não duplica lojas previstas',async()=>{
 for(const rows of [[...visits,'0 L S N SILVA COM VAJ PROD ALIM LTDA --- --- ---'],['0 L S N SILVA COM VAJ PROD ALIM LTDA --- --- ---',...visits]]){
  const r=parseRouteLines([...header,...rows,'02:00 4 08:02']);
  assert.equal(r.promoters[0].planned,4);assert.equal(r.promoters[0].valid,4);assert.equal(r.promoters[0].stores.length,4);assert.deepEqual(r.promoters[0].errors,[]);
  assert.ok(r.warnings.some(w=>w.includes('código 0')&&w.includes('5027368')));
  assert.equal((await matchRegisteredRoutePromoters(r,async()=>({owner:'raphael'}))).rows[0].date,'2026-11-10');
 }
});
test('código zero com horários, sem correspondência ou com correspondência ambígua continua bloqueado',async()=>{
 for(const extra of [['0 OUTRA LOJA --- --- ---'],['0 L S N SILVA COM VAJ PROD ALIM LTDA 13:02 --- ---'],['0 L S N SILVA COM VAJ PROD ALIM LTDA 13:02 14:57 01:55'],['123 L S N SILVA COM VAJ PROD ALIM LTDA --- --- ---','0 L S N SILVA COM VAJ PROD ALIM LTDA --- --- ---']]){
  const r=parseRouteLines([...header,...visits,...extra,'02:00 4 08:02']);assert.ok(r.promoters[0].errors.includes('Loja com código 0.'));
  await assert.rejects(matchRegisteredRoutePromoters(r,async()=>({owner:'raphael'})));
 }
});
