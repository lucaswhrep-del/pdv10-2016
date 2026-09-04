import {CLIENT_FIELDS,guessColumns,clientsFromRows} from './import-utils.js';
import {prepareClientUpload,dataError} from './client-data.js';
const $=s=>document.querySelector(s);
export function attachClients(getSession){
 let profile=null,epoch=0,busy=false,preview=null,cursor=null,more=false;
 const status=$('#clients-status');
 function reset(){preview=null;cursor=null;more=false;$('#client-rows').replaceChildren();$('#client-preview').textContent='';$('#client-confirm').disabled=true;$('#client-next').disabled=true;$('#lookup-result').textContent='';$('#real-clients-form').reset();}
 function lock(value){busy=value;for(const button of $('#clients-panel').querySelectorAll('button'))button.disabled=value;$('#client-confirm').disabled=value||!preview;$('#client-next').disabled=value||!more;}
 function rows(items){
  $('#client-rows').replaceChildren();
  for(const c of items){const tr=document.createElement('tr');for(const key of Object.keys(CLIENT_FIELDS)){const td=document.createElement('td');td.textContent=c[key];tr.append(td);}$('#client-rows').append(tr);}
 }
 async function page(next=false){
  if(busy||profile?.role!=='admin')return;const revision=epoch;lock(true);
  try{const result=await getSession().clients.page(next?cursor:null);if(revision!==epoch)return;cursor=result.cursor;more=result.more;rows(result.rows);status.textContent=result.rows.length?`${result.rows.length} clientes nesta página.`:'Nenhum cliente nesta página.';}
  catch(error){if(revision===epoch)status.textContent=dataError(error);}
  finally{lock(false);}
 }
 $('#client-first').addEventListener('click',()=>page());$('#client-next').addEventListener('click',()=>page(true));
 $('#real-lookup').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!profile)return;const revision=epoch;lock(true);
  try{const result=await getSession().clients.find(event.target.elements.code.value.trim());if(revision!==epoch)return;$('#lookup-result').textContent=result?`${result.name} — ${result.street} — ${result.district} — ${result.city}`:'Cliente não encontrado.';status.textContent='Consulta concluída.';}
  catch(error){if(revision===epoch)status.textContent=dataError(error);}
  finally{lock(false);}
 });
 $('#real-clients-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||profile?.role!=='admin')return;const revision=epoch;preview=null;lock(true);status.textContent='Lendo a planilha no aparelho. Nenhum envio iniciado.';
  try{
   const {readClients}=await import('./importers.js');const sheet=await readClients(event.target.elements.file.files[0]);
   const parsed=clientsFromRows(sheet.matrix.slice(1),guessColumns(sheet.matrix[0]||[]));
   if(parsed.errors.length)throw Error(parsed.errors.slice(0,5).join('\n'));
   const checked=prepareClientUpload(parsed.clients);if(revision!==epoch)return;preview=checked;
   $('#client-preview').textContent=`${checked.length} clientes prontos. ${parsed.identicalDuplicates||0} repetições idênticas unificadas.\nAmostra: ${checked.slice(0,3).map(c=>`${c.code}: ${c.name}, ${c.street}, ${c.district}, ${c.city}`).join(' | ')}\nCódigos existentes serão atualizados. Clientes ausentes da planilha não serão excluídos. O envio gera gravações faturáveis; cada cliente corresponde a uma gravação. A operação usa lotes e pode ser parcialmente concluída.`;
   status.textContent='Confira a amostra antes de confirmar o envio ao Firebase.';
  }catch(error){if(revision===epoch){preview=null;$('#client-preview').textContent='';status.textContent=error.message||'Falha ao ler a planilha.';}}
  finally{lock(false);}
 });
 $('#client-confirm').addEventListener('click',async()=>{
  if(busy||!preview||profile?.role!=='admin')return;const revision=epoch,records=preview;lock(true);let confirmed=0;
  try{await getSession().clients.upload(records,(done,total)=>{confirmed=done;if(revision===epoch)status.textContent=`${done} de ${total} gravações confirmadas. Não feche esta página.`;});if(revision!==epoch)return;preview=null;status.textContent=`${confirmed} clientes salvos no Firestore. Use Carregar primeira página ou consulte um código para conferir.`;}
  catch(error){if(revision===epoch){preview=null;status.textContent=`Importação interrompida: ${error.confirmed??confirmed} gravações confirmadas. ${error.uncertain?'O último lote pode ter sido salvo; consulte a base antes de repetir.':'A sessão pode ter mudado.'} ${error.cause?dataError(error.cause):''}`;}}
  finally{lock(false);}
 });
 window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
 return {
  setState(state){
   // Checking also clears private data and cancels further batches (one in-flight batch may finish).
   if(state.status!=='ready'||profile?.uid!==state.profile.uid){++epoch;reset();}
   profile=state.status==='ready'?state.profile:null;
   $('#clients-panel').hidden=!profile;$('#client-admin').hidden=profile?.role!=='admin';
   if(!profile)status.textContent='';
  },
  isBusy:()=>busy
 };
}
