import {normalize} from './import-utils.js';
const aliases={name:['nome'],email:['email'],role:['perfil','funcao'],sourceId:['codigoroteiro','codigopromotor','codigo'],supervisorEmail:['emailsupervisor','supervisor']};
const clean=v=>String(v??'').trim();
export function parseTeamRows(matrix){
 if(!Array.isArray(matrix)||matrix.length<2)throw Error('Planilha sem dados.');
 const headers=matrix[0].map(normalize),map={};
 for(const [key,names] of Object.entries(aliases))map[key]=names.map(a=>headers.indexOf(a)).find(i=>i>=0)??-1;
 if(['name','email','role'].some(k=>map[k]<0))throw Error('Colunas obrigatórias: Nome, Email e Perfil.');
 const rows=[],errors=[],seenEmails=new Set(),seenCodes=new Set();
 matrix.slice(1).forEach((line,index)=>{
  if(line.every(v=>!clean(v)))return;
  const row=Object.fromEntries(Object.keys(map).map(k=>[k,map[k]<0?'':clean(line[map[k]])]));row.email=row.email.toLowerCase();row.supervisorEmail=row.supervisorEmail.toLowerCase();
  const rawRole=normalize(row.role);row.role=rawRole==='supervisor'?'supervisor':['promotor','promoter'].includes(rawRole)?'promoter':'';
  if(!row.name||row.name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)||!row.role)errors.push(`Linha ${index+2}: nome, e-mail ou perfil inválido.`);
  if(seenEmails.has(row.email))errors.push(`Linha ${index+2}: e-mail repetido.`);seenEmails.add(row.email);
  if(row.role==='promoter'){
   if(!/^\d{1,40}$/.test(row.sourceId)||!row.supervisorEmail)errors.push(`Linha ${index+2}: promotor precisa de código numérico e e-mail do supervisor.`);
   if(seenCodes.has(row.sourceId))errors.push(`Linha ${index+2}: código de roteiro repetido.`);seenCodes.add(row.sourceId);
  }else{row.sourceId='';row.supervisorEmail='';}
  rows.push(row);
 });
 if(!rows.length)errors.push('Nenhum cadastro encontrado.');if(rows.length>500)errors.push('Limite de 500 usuários por planilha.');
 return {rows,errors};
}
