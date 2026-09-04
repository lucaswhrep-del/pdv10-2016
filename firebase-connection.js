import {firebaseConfig} from './firebase-config.js';
import {validateProfile,connectionError} from './firebase-access.js';
const form=document.querySelector('#firebase-form'),status=document.querySelector('#firebase-status');
document.querySelector('#firebase-project').textContent=firebaseConfig.projectId;
let pending=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();if(pending)return;pending=true;
 const button=form.querySelector('button'),email=form.elements.email.value.trim();let password=form.elements.password.value;
 form.elements.password.value='';button.disabled=true;status.textContent='Validando acesso com o Firebase…';
 let app,auth,authSdk,appSdk;
 try{
  [appSdk,authSdk]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js')
  ]);
  app=appSdk.initializeApp(firebaseConfig,`pdv-check-${crypto.randomUUID()}`);
  auth=authSdk.initializeAuth(app,{persistence:authSdk.inMemoryPersistence});
  const credential=await authSdk.signInWithEmailAndPassword(auth,email,password);password='';
  status.textContent='Login aceito. Conferindo o perfil cadastrado…';
  const {getFirestore,doc,getDoc}=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-lite.js');
  const snapshot=await getDoc(doc(getFirestore(app),'users',credential.user.uid));
  let profile;
  try{profile=validateProfile(snapshot.exists()?snapshot.data():null);}catch(error){throw {safeMessage:error.message};}
  const labels={admin:'Administrador',supervisor:'Supervisor',promoter:'Promotor'};
  status.textContent=`Authentication e leitura do perfil no Firestore validados. Perfil: ${labels[profile.role]}. Isso não valida todas as regras nem o Storage. A campanha ainda não grava dados reais.`;
 }catch(error){status.textContent=connectionError(error);}
 finally{
  password='';
  if(auth){try{await authSdk.signOut(auth);}catch{}}
  if(app){try{await appSdk.deleteApp(app);}catch{}}
  pending=false;button.disabled=false;
 }
});
