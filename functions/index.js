const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const {validateRequest}=require('./import-core');
initializeApp();

const db=getFirestore(),auth=getAuth();
const key=email=>createHash('sha256').update(email).digest('hex');
async function requireAdmin(request){
 if(!request.auth)throw new HttpsError('unauthenticated','Faça login novamente.');
 const snap=await db.doc(`users/${request.auth.uid}`).get(),profile=snap.data();
 if(!snap.exists||profile?.role!=='admin'||profile?.active!==true)throw new HttpsError('permission-denied','Apenas administradores ativos podem importar a equipe.');
 return request.auth.uid;
}
async function supervisorUid(email){
 const found=await db.collection('users').where('email','==',email).limit(2).get();
 if(found.size!==1||found.docs[0].data().role!=='supervisor'||found.docs[0].data().active!==true)throw Error(`Supervisor ${email} não encontrado, inativo ou duplicado.`);
 return found.docs[0].id;
}
async function saveProfile(row,uid,adminUid,jobId,rowRef){
 const supervisorId=row.role==='promoter'?await supervisorUid(row.supervisorEmail):'';
 await db.runTransaction(async tx=>{
  const profileRef=db.doc(`users/${uid}`),profileSnap=await tx.get(profileRef);
  const routeRef=row.sourceId?db.doc(`routeCodes/${row.sourceId}`):null;
  const routeSnap=routeRef?await tx.get(routeRef):null;
  if(profileSnap.exists){const old=profileSnap.data();if(old.email!==row.email||old.role!==row.role||old.sourceId!==row.sourceId||old.supervisorId!==supervisorId)throw Error('A conta já possui outro perfil ou vínculo.');}
  if(routeSnap?.exists&&routeSnap.data().owner!==uid)throw Error('Código de roteiro já utilizado.');
  if(!profileSnap.exists)tx.create(profileRef,{name:row.name,email:row.email,role:row.role,sourceId:row.sourceId,supervisorId,active:true,createdBy:adminUid,createdAt:FieldValue.serverTimestamp(),updatedBy:adminUid,updatedAt:FieldValue.serverTimestamp()});
  if(routeRef&&!routeSnap.exists)tx.create(routeRef,{owner:uid});
  tx.set(rowRef,{emailHash:key(row.email),uid,status:profileSnap.exists?'existing':'created',finishedAt:FieldValue.serverTimestamp()});
 });
}
exports.importTeam=onCall({region:'southamerica-east1',memory:'512MiB',timeoutSeconds:300,maxInstances:2},async request=>{
 const adminUid=await requireAdmin(request);let parsed;
 try{parsed=validateRequest(request.data);}catch(error){throw new HttpsError('invalid-argument',error.message);}
 const jobRef=db.doc(`teamImports/${parsed.jobId}`);
 const job=await jobRef.get();
 if(job.exists&&job.data().createdBy!==adminUid)throw new HttpsError('permission-denied','Importação pertence a outro administrador.');
 if(!job.exists)await jobRef.create({createdBy:adminUid,createdAt:FieldValue.serverTimestamp()});
 const results=[];
 for(const row of parsed.rows){
  const rowRef=jobRef.collection('rows').doc(key(row.email)),previous=await rowRef.get();
  if(previous.exists&&['created','existing'].includes(previous.data().status)){results.push({email:row.email,status:'existing'});continue;}
  let user,created=false;
  try{
   try{user=await auth.getUserByEmail(row.email);}catch(error){if(error.code!=='auth/user-not-found')throw error;user=await auth.createUser({email:row.email,displayName:row.name,disabled:false});created=true;}
   await saveProfile(row,user.uid,adminUid,parsed.jobId,rowRef);
   results.push({email:row.email,status:created?'created':'existing'});
  }catch(error){
   if(created&&user)try{await auth.deleteUser(user.uid);}catch{}
   await rowRef.set({emailHash:key(row.email),status:'error',message:String(error.message||'Falha no cadastro.').slice(0,180),finishedAt:FieldValue.serverTimestamp()});
   results.push({email:row.email,status:'error',message:String(error.message||'Falha no cadastro.').slice(0,180)});
  }
 }
 return {results};
});
