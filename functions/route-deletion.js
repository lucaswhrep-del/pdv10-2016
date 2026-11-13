// Executado somente após a validação do perfil administrativo no callable.
async function deleteRouteDate({db,adminUid,input,timestamp,fail}){
 const {date,confirmationDate,expectedCount}=input||{};
 const parsed=typeof date==='string'?new Date(`${date}T00:00:00Z`):null;
 if(!/^2026-(09|10|11|12)-\d{2}$/.test(date||'')||!parsed||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||confirmationDate!==date||!Number.isInteger(expectedCount)||expectedCount<1||expectedCount>200)throw fail('invalid-argument','Confira a data e a quantidade de registros antes de excluir.');
 const archive=db.collection('routeImportDeletions').doc();
 return db.runTransaction(async tx=>{
  const snap=await tx.get(db.collection('routeDays').where('date','==',date).limit(201));
  if(!snap.docs.length)throw fail('not-found','Não há registros de visitas para esta data. Atualize o histórico.');
  if(snap.docs.length!==expectedCount)throw fail('failed-precondition','Os registros desta data mudaram. Consulte o histórico novamente antes de excluir.');
  // O arquivo de segurança e a exclusão são atômicos: não há exclusão parcial.
  tx.create(archive,{date,deletedBy:adminUid,deletedAt:timestamp(),count:snap.docs.length,records:snap.docs.map(doc=>({id:doc.id,...doc.data()}))});
  for(const doc of snap.docs)tx.delete(doc.ref);
  return {date,count:snap.docs.length};
 });
}
module.exports={deleteRouteDate};
