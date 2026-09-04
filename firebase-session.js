import {firebaseConfig} from './firebase-config.js';
import {createSessionController} from './session-controller.js';
import {createClientRepository} from './firestore-clients.js';
import {createTeamRepository} from './team-data.js';

export async function startSession(onState) {
 const [apps,authSdk,store]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-lite.js')
 ]);
 const app=apps.initializeApp(firebaseConfig,'pdv-connected');
 const auth=authSdk.initializeAuth(app,{persistence:authSdk.browserSessionPersistence});
 const db=store.getFirestore(app);
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
  login:(email,password)=>authSdk.signInWithEmailAndPassword(auth,email,password),
  logout:()=>controller.logout(),
  refresh:()=>controller.accept(auth.currentUser),
  dispose(){unsubscribe();controller.dispose();}
 };
}
