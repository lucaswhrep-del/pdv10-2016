import test from 'node:test';
import assert from 'node:assert/strict';
import {guessColumns,clientsFromRows} from '../import-utils.js';
const headers=['Cliente','Nome 1','CNPJ','Rua','Nº','Bairro','Cidade','CEP'];
test('formato Cliente/Nome 1 reconhece código, razão e número',()=>{
 const mapping=guessColumns(headers);
 assert.deepEqual(mapping,{code:0,name:1,street:3,number:4,district:5,city:6});
 const r=clientsFromRows([['001','Loja teste','não importar','Rua A',0,'Centro','Cidade','não importar']],mapping);
 assert.equal(r.clients[0].code,'001');assert.equal(r.clients[0].street,'Rua A, 0');
 assert.deepEqual(Object.keys(r.clients[0]),['code','name','city','district','street']);
});
test('cabeçalhos antigos continuam compatíveis e número é opcional',()=>{
 const mapping=guessColumns(['Código','Cliente','Cidade','Bairro','Rua']);assert.equal(mapping.code,0);assert.equal(mapping.name,1);assert.equal(mapping.number,-1);
 const result=clientsFromRows([['01','Loja','Cidade','Centro','Rua A']],mapping);assert.equal(result.clients[0].street,'Rua A');
 assert.throws(()=>clientsFromRows([], {...mapping,number:4}));
});
test('repetição idêntica é informada; divergências bloqueiam',()=>{
 const m=guessColumns(headers),row=['01','Loja','CNPJ','Rua A','S/N','Centro','Cidade','CEP'];
 const r=clientsFromRows([row,[...row]],m);assert.equal(r.clients.length,1);assert.equal(r.identicalDuplicates,1);assert.equal(r.errors.length,0);
 const other=[...row];other[4]='12';assert.equal(clientsFromRows([row,other],m).errors.length,1);
});
