import {textItemsToLines,parseRouteLines} from './import-utils.js';
export async function readClients(file){
 if(!file||!(/\.(xlsx|csv)$/i.test(file.name)))throw new Error('Selecione uma planilha .xlsx ou .csv.');
 if(file.size>5*1024*1024)throw new Error('A planilha deve ter no máximo 5 MB.');
 const buffer=await file.arrayBuffer();
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./import-worker.js',import.meta.url),{type:'module'});const timer=setTimeout(()=>{worker.terminate();reject(new Error('Tempo de leitura excedido. Divida a planilha.'));},30000);const finish=()=>{clearTimeout(timer);worker.terminate();};worker.onmessage=e=>{finish();e.data.error?reject(new Error(e.data.error)):resolve(e.data);};worker.onerror=()=>{finish();reject(new Error('Não foi possível ler a planilha. Confirme o formato e os cabeçalhos.'));};worker.postMessage(buffer,[buffer]);});
}
export async function readRoutes(file,onProgress=()=>{}){
 if(!file||!(/\.pdf$/i.test(file.name)))throw new Error('Selecione um PDF.');
 if(file.size>10*1024*1024)throw new Error('O PDF deve ter até 10 MB.');
 const pdfjs=await import('./vendor/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});
 task.onPassword=()=>{task.destroy();};
 try{const doc=await task.promise;if(doc.numPages>120)throw new Error('Limite de 120 páginas. Exporte um relatório diário menor.');const lines=[];for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);const content=await p.getTextContent();lines.push(...textItemsToLines(content.items));p.cleanup();onProgress(i,doc.numPages);}return parseRouteLines(lines);}finally{await task.destroy();}
}
