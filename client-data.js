export const CLIENT_PAGE_SIZE=25;
export const CLIENT_BATCH_SIZE=10; // Conservative rule document-access budget per batch.
const fields=['code','name','city','district','street'];
export function clientRecord(input){
 const result={};
 for(const key of fields){
  if(typeof input?.[key]!=='string'||input[key].length>250)throw Error(`Campo inválido: ${key}.`);
  result[key]=input[key].trim();
 }
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(result.code))throw Error('Código deve ter até 64 letras, números, hífen ou sublinhado.');
 if(!result.name)throw Error('Razão social obrigatória.');
 return result;
}
export function prepareClientUpload(input){
 if(!Array.isArray(input)||!input.length||input.length>20000)throw Error('Importe entre 1 e 20 mil clientes.');
 const records=input.map(clientRecord),codes=new Set(records.map(c=>c.code));
 if(codes.size!==records.length)throw Error('Existem códigos repetidos na importação.');
 return records;
}
// Sequential commits, explicit partial progress, no blind retries after uncertain responses.
export async function uploadClientBatches(records,{commit,allowed,onProgress=()=>{}}){
 const prepared=prepareClientUpload(records);let confirmed=0;
 for(let offset=0;offset<prepared.length;offset+=CLIENT_BATCH_SIZE){
  if(!allowed())throw Object.assign(Error('Sessão alterada. Importação interrompida.'),{confirmed,uncertain:false});
  try {await commit(prepared.slice(offset,offset+CLIENT_BATCH_SIZE));}
  catch(cause){throw Object.assign(Error('Não foi possível confirmar o último lote. Confira a base antes de tentar novamente.'),{confirmed,uncertain:true,cause});}
  confirmed=Math.min(offset+CLIENT_BATCH_SIZE,prepared.length);onProgress(confirmed,prepared.length);
 }
 return confirmed;
}
export function dataError(error){
 if(error?.code==='permission-denied')return 'Acesso negado. As regras da etapa Clientes precisam estar publicadas e seu perfil deve estar ativo. Nenhuma permissão deve ser aberta para contornar o erro.';
 if(error?.code==='unavailable')return 'Firestore indisponível. Confira sua conexão.';
 return 'Não foi possível concluir a operação. Confira as permissões e a conexão.';
}
