export function createCampaignRepository({store,db,identity,profile}){
 function access(){const p=profile();if(!p||p.uid!==identity()?.uid)throw Error('Sessão inválida.');return p;}
 async function rows(name,month){const p=access(),parts=[store.where('month','==',month),store.limit(100)];if(p.role==='promoter')parts.push(store.where('owner','==',p.uid));else if(p.role==='supervisor')parts.push(store.where('supervisorId','==',p.uid));const snap=await store.getDocs(store.query(store.collection(db,name),...parts));return snap.docs.map(d=>({id:d.id,...d.data()}));}
 return {
  async dashboard(month){const p=access(),[routes,conquests,winner]=await Promise.all([rows('routeDays',month),rows('conquests',month),store.getDoc(store.doc(db,'winners',month))]);let nominations=[];if(p.role==='admin'){const snap=await store.getDocs(store.query(store.collection(db,'nominations'),store.where('month','==',month),store.limit(100)));nominations=snap.docs.map(d=>({id:d.id,...d.data()}));}else if(p.role==='promoter'){const snap=await store.getDoc(store.doc(db,'nominations',`${month}_${p.uid}`));if(snap.exists())nominations=[{id:snap.id,...snap.data()}];}return {routes,conquests,nominations,winner:winner.exists()?winner.data():null};},
  async resolveRoute(sourceId){access();const code=await store.getDoc(store.doc(db,'routeCodes',String(sourceId)));if(!code.exists())return null;const owner=code.data().owner,user=await store.getDoc(store.doc(db,'users',owner));return user.exists()?{owner,sourceId:String(sourceId),...user.data()}:null;}
 };
}
