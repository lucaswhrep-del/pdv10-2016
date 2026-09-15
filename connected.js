import {startSession} from './firebase-session.js';
import {connectionError} from './firebase-access.js';
import {attachClients} from './connected-clients.js';
import {attachTeam} from './connected-team.js';
import {attachCampaign} from './connected-campaign.js';
const $=selector=>document.querySelector(selector);
const form=$('#login-form'),status=$('#session-status');
let session,pending=false,currentProfile=null;
const clientView=attachClients(()=>session);
const teamView=attachTeam(()=>session);
const campaignView=attachCampaign(()=>session);
const roles={admin:'Administrador',supervisor:'Supervisor',promoter:'Promotor'};
const scopes={admin:'Perfil administrativo identificado.',supervisor:'Perfil de supervisor identificado. As avaliações serão restritas aos seus promotores.',promoter:'Perfil de promotor identificado com vínculo de supervisor cadastrado.'};
const pageIds=['profile-panel','campaign-panel','clients-panel','team-panel'];
const pageLinks={
 'profile-panel':'#nav-profile','campaign-panel':'#nav-campaign','clients-panel':'#nav-clients','team-panel':'#nav-team'
};
function showPage(profile){
 const allowed=profile.role==='promoter'?pageIds.slice(0,3):pageIds;
 let id=location.hash.slice(1)||'profile-panel';
 if(!allowed.includes(id))id='profile-panel';
 for(const pageId of pageIds)$('#'+pageId)?.classList.toggle('page-inactive',pageId!==id);
 for(const [pageId,selector] of Object.entries(pageLinks)){
  const link=$(selector);if(!link)continue;
  link.hidden=!allowed.includes(pageId);
  if(pageId===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
}
function personalize(profile){
 const name=profile.name||profile.email;
 const copy={
  admin:{eyebrow:'PAINEL DE GESTÃO',title:'Bem-vindo ao PDV Nota 10',description:'Administre a campanha, as rotas e os cadastros em um só lugar.',nav:'Campanha',action:'Gerenciar campanha',detail:'Confira ranking, rotas, premiações e conquistas.'},
  supervisor:{eyebrow:'PAINEL DO SUPERVISOR',title:`Olá, ${name}`,description:'Acompanhe sua equipe e avalie as conquistas enviadas pelos seus promotores.',nav:'Avaliar conquistas',action:'Avaliar conquistas',detail:'Veja as evidências e atribua notas de 0 a 10.'},
  promoter:{eyebrow:'MEU DESEMPENHO',title:`Olá, ${name}`,description:'Acompanhe sua rota, suas conquistas e sua pontuação no mês.',nav:'Minha campanha',action:'Ver minha campanha',detail:'Consulte a rota e envie as evidências das suas conquistas.'}
 }[profile.role];
 $('#portal-eyebrow').textContent=copy.eyebrow;$('#portal-heading-title').textContent=copy.title;$('#portal-heading-description').textContent=copy.description;
 $('#nav-campaign').textContent=copy.nav;$('#nav-team').textContent=profile.role==='supervisor'?'Minha equipe':'Equipe';
 $('#profile-primary-title').textContent=copy.action;$('#profile-primary-description').textContent=copy.detail;
 const actions=$('#campaign-role-actions'),create=$('#conquest-create');
 if(profile.role==='promoter')actions.before(create);else $('#campaign-refresh').after(actions);
}
function render(state){
 clientView.setState(state);
 teamView.setState(state);
 campaignView.setState(state);
 const ready=state.status==='ready',out=state.status==='signed-out';
 document.body.classList.toggle('auth-screen',!ready);
 $('#profile-panel').hidden=!ready;
 $('#login-panel').hidden=!out;
 $('#session-actions').hidden=!['ready','blocked'].includes(state.status);
 $('#profile-name').textContent=ready?(state.profile.name||state.profile.email):'';
 $('#profile-role').textContent=ready?roles[state.profile.role]:'';
 $('#profile-scope').textContent=ready?scopes[state.profile.role]:'';
 currentProfile=ready?state.profile:null;
 if(ready){personalize(state.profile);showPage(state.profile);}
 status.textContent=state.message||({checking:'Conferindo seu perfil…',ready:'Login e perfil confirmados. Ambiente conectado e pronto para uso.','signed-out':'Informe seus dados para entrar.','signing-out':'Encerrando sessão…'}[state.status]);
}
window.addEventListener('hashchange',()=>{if(currentProfile)showPage(currentProfile);});
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
