import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files=new Set(['index.html','app.js','domain.js','styles.css','import-utils.js','import-worker.js','importers.js','photo.js','assets/grupo-wh.jpeg','assets/itambe.png','vendor/pdf.mjs','vendor/pdf.worker.mjs','vendor/xlsx.mjs','firebase.html','firebase-config.js','firebase-access.js','firebase-connection.js']);
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png',jpeg:'image/jpeg'};
for(const file of ['connected.html','connected.js','firebase-session.js','session-controller.js'])files.add(file);
for(const file of ['client-data.js','firestore-clients.js','connected-clients.js'])files.add(file);
for(const file of ['team-data.js','connected-team.js'])files.add(file);
files.add('team-import.js');
http.createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;const file=path==='/'?'index.html':path.slice(1);if(!files.has(file)){res.writeHead(404);res.end();return;}try{res.setHeader('Content-Type',mime[file.split('.').pop()]);res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.end(await readFile(new URL(file,import.meta.url)));}catch{res.writeHead(500);res.end('Falha ao abrir a página.');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
