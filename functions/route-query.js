async function readAllDocuments(query){
 const docs=[];let cursor=null;
 for(;;){
  const page=cursor?query.startAfter(cursor):query;
  const snapshot=await page.limit(100).get();docs.push(...snapshot.docs);
  if(snapshot.docs.length<100)return docs;
  cursor=snapshot.docs.at(-1);
 }
}
module.exports={readAllDocuments};
