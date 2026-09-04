export const MAX_PHOTO_BYTES=200*1024;
export async function compressCapture(video,lines){
 if(!video.videoWidth||!video.videoHeight)throw new Error('Aguarde a câmera ficar pronta.');
 for(const edge of [1440,1280,1024]){
  const canvas=document.createElement('canvas');const scale=Math.min(1,edge/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.round(video.videoWidth*scale);const imageHeight=Math.round(video.videoHeight*scale);const font=Math.max(11,Math.round(canvas.width/62)),band=font*3+20;
  canvas.height=imageHeight+band;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,canvas.width,imageHeight);ctx.fillStyle='#122d40';ctx.fillRect(0,imageHeight,canvas.width,band);ctx.fillStyle='white';ctx.font=`${font}px sans-serif`;lines.forEach((line,i)=>ctx.fillText(line,10,imageHeight+font+7+i*(font+4),canvas.width-20));
  for(const quality of [.82,.74,.66,.6]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=MAX_PHOTO_BYTES)return blob;}
  for(const quality of [.75,.65,.6]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=MAX_PHOTO_BYTES)return blob;}
 }
 throw new Error('Não foi possível reduzir a foto a 200 KB mantendo o limite de qualidade. Refaça com um enquadramento mais próximo.');
}
