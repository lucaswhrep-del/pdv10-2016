import {CLIENT_PAGE_SIZE,clientRecord,uploadClientBatches} from './client-data.js';
export function createClientRepository({store,db,identity,profile}){
 function requireAccess(admin=false){
  const p=profile();
  if(!p||identity()?.uid!==p.uid||(admin&&p.role!=='admin'))throw Error('Acesso não autorizado.');
  return p.uid;
 }
 return {
  async find(code){
   requireAccess();
   if(!/^[A-Za-z0-9_-]{1,64}$/.test(code))throw Error('Código inválido.');
   const snapshot=await store.getDoc(store.doc(db,'clients',code));
   return snapshot.exists()?clientRecord(snapshot.data()):null;
  },
  async page(cursor=null){
   requireAccess(true);
   const clauses=[store.orderBy(store.documentId()),store.limit(CLIENT_PAGE_SIZE)];
   if(cursor)clauses.push(store.startAfter(cursor));
   const snapshot=await store.getDocs(store.query(store.collection(db,'clients'),...clauses));
   return {rows:snapshot.docs.map(d=>clientRecord(d.data())),cursor:snapshot.docs.at(-1)?.id||null,more:snapshot.docs.length===CLIENT_PAGE_SIZE};
  },
  async upload(records,onProgress){
   const uid=requireAccess(true);
   const originalProfile=profile();
   return uploadClientBatches(records,{
    allowed:()=>profile()===originalProfile&&profile()?.uid===uid&&profile()?.role==='admin'&&identity()?.uid===uid,
    commit:async rows=>{
     requireAccess(true);const batch=store.writeBatch(db);
     for(const row of rows)batch.set(store.doc(db,'clients',row.code),{...row,updatedBy:uid,updatedAt:store.serverTimestamp()});
     await batch.commit();
    },onProgress
   });
  }
 };
}
