import {teamRecord,teamError} from './team-data.js';
const $=s=>document.querySelector(s);
export function attachTeam(getSession){
 let profile=null,revision=0,busy=false,cursor=null,more=false,pendingRows=null,pendingJobId=null;
 const form=$('#team-form'),status=$('#team-status');
 function lock(value){busy=value;for(const button of $('#team-panel').querySelectorAll('button'))button.disabled=value;$('#team-next').disabled=value||!more;}
 function roleChanged(){const promoter=form.elements.role.value==='promoter';for(const field of ['sourceId','supervisorId']){form.elements[field].required=promoter;form.elements[field].disabled=!promoter;}}
 form.elements.role.addEventListener('change',roleChanged);roleChanged();
 async function load(next=false){
  if(busy||!profile)return;const current=revision;lock(true);
  try{const result=await getSession().team.page(next?cursor:null);if(current!==revision)return;cursor=result.cursor;more=result.more;$('#team-rows').replaceChildren();
   for(const row of result.rows){const tr=document.createElement('tr');for(const value of [row.name||row.uid,row.uid,row.email,{admin:'Administrador',supervisor:'Supervisor',promoter:'Promotor'}[row.role]||'Inválido',row.active?'Ativo':'Inativo',row.sourceId,row.supervisorId]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('#team-rows').append(tr);}
   status.textContent=result.rows.length?`${result.rows.length} cadastros nesta página.`:'Nenhum cadastro nesta página.';
  }catch(error){if(current===revision)status.textContent=teamError(error);}finally{lock(false);}
 }
 $('#team-first').addEventListener('click',()=>load());$('#team-next').addEventListener('click',()=>load(true));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||profile?.role!=='admin')return;const current=revision;lock(true);
  try{let data;try{data=teamRecord(Object.fromEntries(new FormData(form)));}catch(error){throw {safeMessage:error.message};}
   await getSession().team.create(data);if(current!==revision)return;form.reset();roleChanged();status.textContent='Perfil salvo. A conta do Authentication não foi alterada. Confira a listagem e teste o login dessa conta.';
  }catch(error){if(current===revision)status.textContent=teamError(error);}finally{lock(false);}
 });
 $('#team-import-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||profile?.role!=='admin')return;lock(true);const output=$('#team-import-preview');
  try{const {readClients}=await import('./importers.js'),{parseTeamRows}=await import('./team-import.js');const sheet=await readClients(event.target.elements.file.files[0]),result=parseTeamRows(sheet.matrix);
   pendingRows=result.errors.length?null:[...result.rows.filter(r=>r.role==='supervisor'),...result.rows.filter(r=>r.role==='promoter')];pendingJobId=pendingRows?crypto.randomUUID():null;
   output.textContent=result.errors.length?`Corrija antes de importar:\n${result.errors.slice(0,12).join('\n')}`:`${result.rows.length} usuários válidos: ${result.rows.filter(r=>r.role==='supervisor').length} supervisores e ${result.rows.filter(r=>r.role==='promoter').length} promotores. As contas serão criadas sem senha; cada usuário definirá a sua em Primeiro acesso.`;
  }catch(error){pendingRows=null;pendingJobId=null;output.textContent=error.message||'Não foi possível ler a planilha.';}finally{lock(false);$('#team-import-confirm').disabled=!pendingRows;}
 });
 $('#team-import-confirm').addEventListener('click',async()=>{
  if(busy||profile?.role!=='admin'||!pendingRows||!pendingJobId)return;lock(true);const output=$('#team-import-preview'),all=[];
  try{
   for(let start=0;start<pendingRows.length;start+=50){output.textContent=`Enviando ${Math.min(start+50,pendingRows.length)} de ${pendingRows.length} cadastros…`;const response=await getSession().importTeam(pendingJobId,pendingRows.slice(start,start+50));all.push(...response.data.results);}
   const errors=all.filter(item=>item.status==='error'),created=all.filter(item=>item.status==='created').length,existing=all.length-created-errors.length;
   output.textContent=errors.length?`${created} contas criadas, ${existing} já existentes e ${errors.length} com erro:\n${errors.slice(0,12).map(item=>`${item.email}: ${item.message}`).join('\n')}\nCorrija os dados e confira a equipe antes de tentar novamente.`:`Importação concluída: ${created} contas criadas e ${existing} já existentes. Oriente os usuários a usar Primeiro acesso para receber o link e cadastrar a própria senha.`;
   if(!errors.length){pendingRows=null;pendingJobId=null;$('#team-import-confirm').disabled=true;$('#team-import-form').reset();await load();}
  }catch(error){output.textContent=error?.message||'A conexão foi interrompida. O mesmo lote poderá ser retomado sem duplicar contas.';}finally{lock(false);$('#team-import-confirm').disabled=!pendingRows;}
 });
 return {isBusy:()=>busy,setState(state){
  if(state.status!=='ready'||profile?.uid!==state.profile.uid){revision++;cursor=null;more=false;pendingRows=null;pendingJobId=null;$('#team-rows').replaceChildren();form.reset();$('#team-import-form').reset();$('#team-import-preview').textContent='';roleChanged();status.textContent='';}
  profile=state.status==='ready'?state.profile:null;$('#team-panel').hidden=!['admin','supervisor'].includes(profile?.role);$('#team-create').hidden=profile?.role!=='admin';
 }};
}
