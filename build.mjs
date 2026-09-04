import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','app.js','domain.js','styles.css','import-utils.js','import-worker.js','importers.js','photo.js','firebase.html','firebase-config.js','firebase-access.js','firebase-connection.js','connected.html','connected.js','firebase-session.js','session-controller.js']) await copyFile(name,`dist/${name}`);
for(const dir of ['assets','vendor']) await cp(dir,`dist/${dir}`,{recursive:true});
for(const name of ['client-data.js','firestore-clients.js','connected-clients.js'])await copyFile(name,`dist/${name}`);
console.log('Versão demonstrativa gerada em dist.');
