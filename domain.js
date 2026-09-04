export const SIX_DAYS=6*24*60*60*1000;
export function routeScore(valid,planned){
 if(!Number.isInteger(valid)||!Number.isInteger(planned)||valid<0||planned<0||valid>planned)throw new Error('Informe totais inteiros válidos.');
 if(!planned)return {percent:null,points:null};
 const percent=valid/planned*100;
 return {percent,points:valid*10>=planned*9?percent:0};
}
export function persistenceDue(executedAt){const time=Date.parse(executedAt);return Number.isFinite(time)?time+SIX_DAYS:null;}
export function canCapture(conquest,stage,now){
 if(!Number.isFinite(now)||conquest.photos[stage])return false;
 if(stage==='before')return !conquest.photos.execution;
 if(stage==='execution')return !!conquest.photos.before&&!conquest.photos.persistence;
 const due=persistenceDue(conquest.photos.execution?.at);
 return stage==='persistence'&&due!==null&&now>=due;
}
export function complete(conquest){return ['before','execution','persistence'].every(key=>!!conquest.photos[key]);}
export function parseGrade(value){if(value===''||value===null)throw new Error('Informe uma nota de 0 a 10.');const n=Number(value);if(!Number.isFinite(n)||n<0||n>10)throw new Error('A nota deve estar entre 0 e 10.');return n;}
export function canNominate(conquest,month){return complete(conquest)&&conquest.grade!==null&&conquest.month===month;}
export function mayReview(user,conquest,users){return user?.role==='supervisor'&&users.find(p=>p.id===conquest.owner)?.supervisorId===user.id;}
export function visiblePromoters(user,users){return users.filter(p=>p.role==='promoter'&&(user.role==='admin'||p.id===user.id||p.supervisorId===user.id));}
export function dailyRouteProgress(userId,month,routes){
 const days=new Map();
 for(const row of routes){
  if(row.owner!==userId||row.month!==month)continue;
  const day=days.get(row.date)||{date:row.date,valid:0,planned:0};
  day.valid+=row.valid;day.planned+=row.planned;days.set(row.date,day);
 }
 return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(day=>({...day,percent:routeScore(day.valid,day.planned).percent}));
}
export function monthlyScore(userId,month,routes,conquests,winner){
 const daily=routes.filter(r=>r.owner===userId&&r.month===month);
 const valid=daily.reduce((sum,r)=>sum+r.valid,0),planned=daily.reduce((sum,r)=>sum+r.planned,0);
 const route=routeScore(valid,planned);
 const approved=conquests.filter(c=>c.owner===userId&&c.month===month&&complete(c)&&c.grade!==null);
 const points=Math.round(approved.reduce((sum,c)=>sum+parseGrade(c.grade),0)*10)/10;
 const bonus=winner?.owner===userId?50:0;
 return {...route,valid,planned,conquests:points,approved:approved.length,bonus,total:(route.points??0)+points+bonus};
}
