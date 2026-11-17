function currentCampaignMonth(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(now);
 return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;
}
function creationMonth(requested,now,fail){
 const month=currentCampaignMonth(now);
 if(!['2026-11','2026-12'].includes(month))throw fail('failed-precondition','O período de criação de conquistas está encerrado.');
 if(requested!==month)throw fail('failed-precondition','Novas conquistas só podem ser registradas no mês vigente. Atualize a página e tente novamente.');
 return month;
}
module.exports={currentCampaignMonth,creationMonth};
