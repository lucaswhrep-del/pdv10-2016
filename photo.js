export const MAX_PHOTO_BYTES=200*1024;
const jpeg=(canvas,quality)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('A compressão demorou além do esperado. Tente novamente.')),12000);canvas.toBlob(blob=>{clearTimeout(timer);blob?resolve(blob):reject(new Error('Este aparelho não conseguiu processar a foto.'))},'image/jpeg',quality);});
export async function compressCapture(video,lines){
 if(!video.videoWidth||!video.videoHeight)throw new Error('Aguarde a câmera ficar pronta.');
 for(const edge of [1280,1024,800]){
  const canvas=document.createElement('canvas');const scale=Math.min(1,edge/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.round(video.videoWidth*scale);const imageHeight=Math.round(video.videoHeight*scale);const font=Math.max(11,Math.round(canvas.width/62)),band=font*3+20;
  canvas.height=imageHeight+band;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,canvas.width,imageHeight);ctx.fillStyle='#122d40';ctx.fillRect(0,imageHeight,canvas.width,band);ctx.fillStyle='white';ctx.font=`${font}px sans-serif`;lines.forEach((line,i)=>ctx.fillText(line,10,imageHeight+font+7+i*(font+4),canvas.width-20));
  for(const quality of [.78,.68,.58,.5]){const blob=await jpeg(canvas,quality);if(blob.size<=MAX_PHOTO_BYTES)return blob;}
 }
 throw new Error('Não foi possível reduzir a foto a 200 KB mantendo o limite de qualidade. Refaça com um enquadramento mais próximo.');
}
