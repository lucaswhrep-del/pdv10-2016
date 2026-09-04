import {validateProfile,connectionError} from './firebase-access.js';

// Authentication is identity only. Every future data operation also needs server rules.
export function createSessionController({readProfile,signOut,onState}) {
 let revision=0,disposed=false;
 const emit=state=>{if(!disposed)onState(state);};
 return {
  async accept(identity) {
   const current=++revision;
   if(!identity){emit({status:'signed-out'});return;}
   emit({status:'checking'});
   try {
    const raw=await readProfile(identity.uid);
    if(disposed||current!==revision)return;
    let role;
    try {role=validateProfile(raw).role;} catch(error){throw {safeMessage:error.message};}
    // Explicit allowlist: never expose tokens or arbitrary profile fields to the UI.
    emit({status:'ready',profile:Object.freeze({
     uid:identity.uid,role,name:typeof raw.name==='string'?raw.name:'',
     email:identity.email||'',supervisorId:role==='promoter'?raw.supervisorId:null
    })});
   } catch(error) {
    if(disposed||current!==revision)return;
    emit({status:'blocked',message:connectionError(error)});
   }
  },
  async logout(){
   ++revision;emit({status:'signing-out'});
   try {await signOut();emit({status:'signed-out'});}
   catch {emit({status:'blocked',message:'Não foi possível encerrar a sessão. Tente sair novamente.'});}
  },
  dispose(){disposed=true;++revision;}
 };
}
