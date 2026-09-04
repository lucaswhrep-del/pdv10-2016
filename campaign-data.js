export function createCampaignRepository({store,db,identity,profile}){
 function access(){const p=profile();if(!p||p.uid!==identity()?.uid)throw Error('Sessão inválida.');return p;}
 async function rows(name,month){const p=access(),parts=[store.where('month','==',month),store.limit(100)];if(p.role==='promoter')parts.push(store.where('owner','==',p.uid));else if(p.role==='supervisor')parts.push(store.where('supervisorId','==',p.uid));const snap=await store.getDocs(store.query(store.collection(db,name),...parts));return snap.docs.map(d=>({id:d.id,...d.data()}));}
 return {async dashboard(month){const [routes,conquests]=await Promise.all([rows('routeDays',month),rows('conquests',month)]);return {routes,conquests};}};
}
