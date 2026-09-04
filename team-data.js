export function teamRecord(input){
 const result=Object.fromEntries(['uid','name','email','role','sourceId','supervisorId'].map(key=>[key,String(input?.[key]??'').trim()]));
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(result.uid))throw Error('Copie um UID válido do Firebase Authentication.');
 if(!result.name||result.name.length>100)throw Error('Informe um nome com até 100 caracteres.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)||result.email.length>254)throw Error('Informe o e-mail da conta.');
 result.email=result.email.toLowerCase();
 if(!['supervisor','promoter'].includes(result.role))throw Error('Este formulário cadastra apenas supervisores e promotores.');
 if(result.role==='promoter'){
  if(!/^\d{1,40}$/.test(result.sourceId))throw Error('Informe o código numérico do promotor no roteiro.');
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(result.supervisorId)||result.supervisorId===result.uid)throw Error('Informe o UID de outro usuário como supervisor.');
 }else{result.sourceId='';result.supervisorId='';}
 return result;
}
export function teamError(error){
 if(error?.safeMessage)return error.safeMessage;
 if(error?.code==='permission-denied')return 'Operação negada. Confira as regras da etapa Equipe, seu perfil e se o UID ou código de roteiro já está cadastrado.';
 return 'Não foi possível confirmar a operação. Confira a listagem antes de repetir: a gravação pode ter sido concluída.';
}
export function createTeamRepository({store,db,identity,profile}){
 function access(admin=false){const p=profile();if(!p||p.uid!==identity()?.uid||(admin?p.role!=='admin':!['admin','supervisor'].includes(p.role)))throw Error('Acesso não autorizado.');return p;}
 return {
  async create(input){
   const p=access(true),record=teamRecord(input);
   if(record.uid===p.uid)throw {safeMessage:'Seu próprio perfil não pode ser alterado por este cadastro.'};
   if(record.role==='promoter'){
    const supervisor=await store.getDoc(store.doc(db,'users',record.supervisorId));
    if(!supervisor.exists()||supervisor.data().role!=='supervisor'||supervisor.data().active!==true)throw {safeMessage:'Supervisor não encontrado ou inativo. Cadastre o supervisor primeiro.'};
   }
   if(profile()!==p||identity()?.uid!==p.uid)throw {safeMessage:'Sessão alterada. Faça o cadastro novamente.'};
   const {uid,...fields}=record,batch=store.writeBatch(db);
   batch.set(store.doc(db,'users',uid),{...fields,active:true,createdBy:p.uid,createdAt:store.serverTimestamp(),updatedBy:p.uid,updatedAt:store.serverTimestamp()});
   if(fields.role==='promoter')batch.set(store.doc(db,'routeCodes',fields.sourceId),{owner:uid});
   await batch.commit();return uid;
  },
  async page(cursor=null){
   const p=access(),clauses=[store.orderBy(store.documentId()),store.limit(25)];
   if(p.role==='supervisor')clauses.push(store.where('supervisorId','==',p.uid));
   if(cursor)clauses.push(store.startAfter(cursor));
   const snapshot=await store.getDocs(store.query(store.collection(db,'users'),...clauses));
   return {rows:snapshot.docs.map(d=>{const data=d.data();return {uid:d.id,name:data.name||'',email:data.email||'',role:data.role,active:data.active===true,sourceId:data.sourceId||'',supervisorId:data.supervisorId||''};}),cursor:snapshot.docs.at(-1)?.id||null,more:snapshot.docs.length===25};
  }
 };
}
