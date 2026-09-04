import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyRouteProgress,monthlyScore} from '../domain.js';
test('diário: filtra dono e mês, ordena e mostra percentual mesmo abaixo de 90%',()=>{
 const rows=[{owner:'p',month:'2026-10',date:'2026-10-02',valid:2,planned:4},{owner:'p',month:'2026-10',date:'2026-10-01',valid:1,planned:1},{owner:'q',month:'2026-10',date:'2026-10-01',valid:20,planned:20},{owner:'p',month:'2026-11',date:'2026-11-01',valid:10,planned:10}];
 const days=dailyRouteProgress('p','2026-10',rows);
 assert.deepEqual(days.map(d=>d.date),['2026-10-01','2026-10-02']);
 assert.deepEqual(days.map(d=>d.percent),[100,50]);
 const month=monthlyScore('p','2026-10',rows,[],null);
 assert.equal(month.percent,60);assert.equal(month.points,0);
});
test('sem dados não inventa dias; sem previsão não divide por zero',()=>{
 assert.deepEqual(dailyRouteProgress('p','2026-11',[]),[]);
 const rows=[{owner:'p',month:'2026-10',date:'2026-10-01',valid:0,planned:0}];
 assert.equal(dailyRouteProgress('p','2026-10',rows)[0].percent,null);
});
test('agrupa registros da mesma data e mantém o total mensal',()=>{
 const rows=[{owner:'p',month:'2026-10',date:'2026-10-01',valid:2,planned:3},{owner:'p',month:'2026-10',date:'2026-10-01',valid:1,planned:1}];
 assert.deepEqual(dailyRouteProgress('p','2026-10',rows),[{date:'2026-10-01',valid:3,planned:4,percent:75}]);
});
