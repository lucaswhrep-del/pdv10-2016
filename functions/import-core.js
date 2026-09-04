const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function text(value){return String(value??'').trim();}
function normalizeRow(value){
 const row={name:text(value?.name),email:text(value?.email).toLowerCase(),role:text(value?.role),sourceId:text(value?.sourceId),supervisorEmail:text(value?.supervisorEmail).toLowerCase()};
 if(!row.name||row.name.length>100)throw Error('Nome inválido.');
 if(!EMAIL.test(row.email)||row.email.length>254)throw Error('E-mail inválido.');
 if(!['supervisor','promoter'].includes(row.role))throw Error('Perfil inválido.');
 if(row.role==='promoter'){
  if(!/^\d{1,40}$/.test(row.sourceId))throw Error('Código de roteiro inválido.');
  if(!EMAIL.test(row.supervisorEmail))throw Error('E-mail do supervisor inválido.');
 }else{row.sourceId='';row.supervisorEmail='';}
 return row;
}
function validateRequest(data){
 const jobId=text(data?.jobId),rows=data?.rows;
 if(!/^[0-9a-f-]{36}$/i.test(jobId))throw Error('Identificador da importação inválido.');
 if(!Array.isArray(rows)||!rows.length||rows.length>50)throw Error('Envie de 1 a 50 cadastros por lote.');
 const normalized=rows.map(normalizeRow),emails=new Set(),codes=new Set();
 for(const row of normalized){if(emails.has(row.email))throw Error('Há e-mails repetidos no lote.');emails.add(row.email);if(row.sourceId&&codes.has(row.sourceId))throw Error('Há códigos de roteiro repetidos no lote.');if(row.sourceId)codes.add(row.sourceId);}
 return {jobId,rows:normalized};
}
module.exports={normalizeRow,validateRequest};
