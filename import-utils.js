export const CLIENT_FIELDS={code:'Código',name:'Razão social',city:'Cidade',district:'Bairro',street:'Rua'};
const clean=value=>String(value??'').trim();
export const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function guessColumns(headers){
 const normalized=headers.map(normalize);
 const find=aliases=>{for(const alias of aliases){const i=normalized.indexOf(alias);if(i>=0)return i;}return -1;};
 const code=find(['codigo','codigocliente','codcliente','cod','sap','cliente']);
 let name=find(['razaosocial','nome1','razao','nomecliente','nome']);
 if(name<0&&normalized.indexOf('cliente')!==code)name=normalized.indexOf('cliente');
 return {code,name,city:find(['cidade','municipio']),district:find(['bairro']),street:find(['rua','endereco','logradouro']),number:find(['numero','n','no','nro','num','numerologradouro'])};
}
export function clientsFromRows(rows,mapping){
 const columns=Object.keys(CLIENT_FIELDS).map(key=>mapping[key]);
 if(Object.keys(CLIENT_FIELDS).some(key=>!Number.isInteger(mapping[key])||mapping[key]<0)||new Set(columns).size!==5)throw new Error('Selecione uma coluna diferente para cada campo.');
 const withNumber=mapping.number!==undefined&&mapping.number!==-1;
 if(withNumber&&(!Number.isInteger(mapping.number)||mapping.number<0||columns.includes(mapping.number)))throw new Error('Selecione uma coluna diferente para o número, ou escolha não usar.');
 const result=[],errors=[],seen=new Map();let identicalDuplicates=0;
 rows.forEach((row,index)=>{if(row.every(v=>!clean(v)))return;const client=Object.fromEntries(Object.keys(CLIENT_FIELDS).map(key=>[key,clean(row[mapping[key]])]));
 if(withNumber&&clean(row[mapping.number]))client.street=[client.street,clean(row[mapping.number])].filter(Boolean).join(', ');
 if(!client.code||!client.name){errors.push(`Linha ${index+2}: código e razão social são obrigatórios.`);return;}
 if(Object.values(client).some(v=>v.length>250)){errors.push(`Linha ${index+2}: campo excede 250 caracteres.`);return;}
 if(seen.has(client.code)){const previous=seen.get(client.code);if(Object.keys(CLIENT_FIELDS).every(key=>previous[key]===client[key]))identicalDuplicates++;else errors.push(`Linha ${index+2}: código ${client.code} repetido com dados divergentes. Corrija antes de importar.`);return;}
 seen.set(client.code,client);result.push(client);
 });return {clients:result,errors,identicalDuplicates};
}
export function textItemsToLines(items){
 const groups=[];
 for(const item of items){if(!item.str?.trim())continue;const y=item.transform[5];let group=groups.find(g=>Math.abs(g.y-y)<2);if(!group){group={y,items:[]};groups.push(group);}group.items.push(item);}
 return groups.sort((a,b)=>b.y-a.y).map(g=>g.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim());
}
export function parseRouteLines(lines){
 let date=null,team=null,current=null;const promoters=[],warnings=[];
 for(const raw of lines){const line=raw.replace(/\s+/g,' ').trim();
  const d=line.match(/^Data:\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(d){const next=`${d[3]}-${d[2]}-${d[1]}`;if(date&&date!==next)throw new Error('O arquivo contém mais de uma data. Exporte relatórios diários separados.');date=next;continue;}
  const t=line.match(/Equipe:\s*(\d+)/i);if(t){if(team&&team!==t[1])throw new Error('Mais de uma equipe no relatório.');team=t[1];continue;}
  const p=line.match(/^Promotor:\s*(\d+)\s*-\s*(.+)$/i);if(p){if(promoters.some(v=>v.sourceId===p[1]))throw new Error(`Promotor ${p[1]} repetido no relatório.`);current={sourceId:p[1],name:p[2],planned:0,valid:0,incomplete:0,stores:[],errors:[],reported:null};promoters.push(current);continue;}
  if(!current)continue;
  const visit=line.match(/^(\d+)\s+(.+?)\s+(---|\d{2}:\d{2})\s+(---|\d{2}:\d{2})\s+(---|\d{2}:\d{2})$/);
  if(visit){const [,code,name,start,end,duration]=visit;current.planned++;if(code==='0')current.errors.push('Loja com código 0.');if(current.stores.some(s=>s.code===code))current.errors.push(`Loja ${code} repetida.`);current.stores.push({code,name,start,end,duration});const both=start!=='---'&&end!=='---';const parse=s=>{const [h,m]=s.split(':').map(Number);return h<=23&&m<=59?h*60+m:NaN;};if(both&&Number.isFinite(parse(start))&&Number.isFinite(parse(end))&&parse(end)>parse(start))current.valid++;else if(start!=='---'||end!=='---'){current.incomplete++;current.errors.push(`Loja ${code}: horários incompletos ou inválidos.`);}continue;}
  const total=line.match(/^\d{2}:\d{2}\s+(\d+)\s+\d{2}:\d{2}$/);if(total){current.reported=Number(total[1]);continue;}
  if(/^\d+\s+\S/.test(line)&&!/^\d{2}:/.test(line))current.errors.push(`Linha não reconhecida: ${line.slice(0,90)}`);
 }
 if(!date||!team||!promoters.length)throw new Error('Formato não reconhecido. Use o PDF diário de estatísticas com Data, Equipe e Promotor. PDFs digitalizados não são aceitos.');
 const parsed=new Date(`${date}T12:00:00Z`);if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new Error('Data inválida no relatório.');
 for(const p of promoters){if(p.reported===null)p.errors.push('Resumo de visitas não encontrado.');else if(p.reported!==p.valid)p.errors.push(`Resumo informa ${p.reported} visitas, mas foram reconhecidas ${p.valid}.`);if(!p.planned)warnings.push(`${p.name}: sem rota programada.`);}
 return {date,month:date.slice(0,7),team,promoters,warnings};
}
export function prepareRouteImport(report,choices,users,routes,imports){
 if(!report||!['2026-10','2026-11','2026-12'].includes(report.month))throw new Error('Data fora da campanha.');
 if(imports.some(i=>i.date===report.date&&i.team===report.team))throw new Error('Essa equipe e data já foram importadas.');
 const selected=[],excluded=[],seen=new Set();
 report.promoters.forEach((p,i)=>{const c=choices[i];if(!c)throw new Error('Conferência incompleta.');if(!c.include){if(!c.reason?.trim())throw new Error(`Informe o motivo para excluir ${p.name}.`);excluded.push({sourceId:p.sourceId,reason:c.reason.trim()});return;}
  if(p.errors.length||!p.planned)throw new Error('Há um registro inválido incluído.');
  if(!users.some(u=>u.id===c.owner&&u.role==='promoter'))throw new Error(`Vincule ${p.name} a um promotor.`);
  if(seen.has(c.owner)||routes.some(v=>!v.demo&&v.owner===c.owner&&v.date===report.date))throw new Error('Promotor duplicado na data.');
  seen.add(c.owner);selected.push({owner:c.owner,sourceId:p.sourceId,month:report.month,date:report.date,team:report.team,valid:p.valid,planned:p.planned});
 });if(!selected.length)throw new Error('Inclua ao menos um promotor válido.');return {selected,excluded};
}
