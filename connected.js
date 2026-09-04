import {startSession} from './firebase-session.js';
import {connectionError} from './firebase-access.js';
import {attachClients} from './connected-clients.js';
import {attachTeam} from './connected-team.js';
import {attachCampaign} from './connected-campaign.js';
const $=selector=>document.querySelector(selector);
const form=$('#login-form'),status=$('#session-status');
let session,pending=false;
const clientView=attachClients(()=>session);
const teamView=attachTeam(()=>session);
const campaignView=attachCampaign(()=>session);
const roles={admin:'Administrador',supervisor:'Supervisor',promoter:'Promotor'};
const scopes={admin:'Perfil administrativo identificado.',supervisor:'Perfil de supervisor identificado. As avaliações serão restritas aos seus promotores.',promoter:'Perfil de promotor identificado com vínculo de supervisor cadastrado.'};
function render(state){
 clientView.setState(state);
 teamView.setState(state);
 campaignView.setState(state);
 const ready=state.status==='ready',out=state.status==='signed-out';
 $('#profile-panel').hidden=!ready;
 $('#login-panel').hidden=!out;
 $('#session-actions').hidden=!['ready','blocked'].includes(state.status);
 $('#profile-name').textContent=ready?(state.profile.name||state.profile.email):'';
 $('#profile-role').textContent=ready?roles[state.profile.role]:'';
 $('#profile-scope').textContent=ready?scopes[state.profile.role]:'';
 status.textContent=state.message||({checking:'Conferindo seu perfil…',ready:'Login e perfil confirmados. Integração da campanha ainda em desenvolvimento.','signed-out':'Informe seus dados para entrar.','signing-out':'Encerrando sessão…'}[state.status]);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(pending||!session)return;
 pending=true;$('#login-button').disabled=true;
 let password=form.elements.password.value;form.elements.password.value='';
 try {await session.login(form.elements.email.value.trim(),password);}
 catch(error){status.textContent=connectionError(error);}
 finally {password='';pending=false;$('#login-button').disabled=false;}
});
$('#logout').addEventListener('click',()=>session?.logout());
$('#refresh-profile').addEventListener('click',()=>session?.refresh());
$('#first-access-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button'),out=$('#first-access-status');button.disabled=true;try{await session.requestPassword(event.target.elements.email.value.trim());out.textContent='Se o e-mail estiver cadastrado, você receberá um link para definir sua senha. Confira também o spam.';}catch(error){out.textContent=connectionError(error);}finally{button.disabled=false;}});
// Recheck on foreground return; no polling or realtime database listeners.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!pending&&!clientView.isBusy()&&!teamView.isBusy()&&!campaignView.isBusy())session?.refresh();});
try {session=await startSession(render);$('#login-button').disabled=false;}
catch(error){status.textContent=connectionError(error);}
