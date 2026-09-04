import {firebaseConfig} from './firebase-config.js';
import {createSessionController} from './session-controller.js';
import {createClientRepository} from './firestore-clients.js';
import {createTeamRepository} from './team-data.js';
import {createCampaignRepository} from './campaign-data.js';

export async function startSession(onState) {
 const [apps,authSdk,store,functionsSdk,storageSdk]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-lite.js'),
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js'),
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js')
 ]);
 const app=apps.initializeApp(firebaseConfig,'pdv-connected');
 const auth=authSdk.initializeAuth(app,{persistence:authSdk.browserSessionPersistence});
 const db=store.getFirestore(app);
 const functions=functionsSdk.getFunctions(app,'southamerica-east1');
 const storage=storageSdk.getStorage(app),call=name=>functionsSdk.httpsCallable(functions,name);
 let acceptedProfile=null;
 const controller=createSessionController({
  readProfile:async uid=>{
   const snapshot=await store.getDoc(store.doc(db,'users',uid));
   return snapshot.exists()?snapshot.data():null;
  },
  signOut:()=>authSdk.signOut(auth),onState:state=>{
   acceptedProfile=state.status==='ready'?state.profile:null;
   onState(state);
  }
 });
 const unsubscribe=authSdk.onAuthStateChanged(auth,user=>controller.accept(user));
 return {
  clients:createClientRepository({store,db,identity:()=>auth.currentUser,profile:()=>acceptedProfile}),
  team:createTeamRepository({store,db,identity:()=>auth.currentUser,profile:()=>acceptedProfile}),
  campaign:createCampaignRepository({store,db,identity:()=>auth.currentUser,profile:()=>acceptedProfile}),
  importTeam:(jobId,rows)=>functionsSdk.httpsCallable(functions,'importTeam')({jobId,rows}),
  campaignActions:{
   importRoutes:rows=>call('importRoutes')({rows}),
   createConquest:data=>call('createConquest')(data),
   async uploadEvidence({conquestId,stage,blob}){const uid=auth.currentUser?.uid;if(!uid)throw Error('Sessão inválida.');await storageSdk.uploadBytes(storageSdk.ref(storage,`conquests/${uid}/${conquestId}/${stage}`),blob,{contentType:blob.type,customMetadata:{stage}});return call('confirmEvidence')({conquestId,stage});},
   review:data=>call('reviewConquest')(data),nominate:conquestId=>call('nominateConquest')({conquestId}),chooseWinner:data=>call('chooseWinner')(data)
  },
  login:(email,password)=>authSdk.signInWithEmailAndPassword(auth,email,password),
  requestPassword:email=>authSdk.sendPasswordResetEmail(auth,email),
  logout:()=>controller.logout(),
  refresh:()=>controller.accept(auth.currentUser),
  dispose(){unsubscribe();controller.dispose();}
 };
}
