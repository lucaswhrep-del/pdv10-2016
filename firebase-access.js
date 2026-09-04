export function validateProfile(profile){
 if(!profile||profile.active!==true)throw new Error('Perfil ausente ou inativo. Peça a liberação ao administrador.');
 if(!['admin','supervisor','promoter'].includes(profile.role))throw new Error('Perfil sem função válida.');
 if(profile.role==='promoter'&&(!profile.supervisorId||typeof profile.supervisorId!=='string'))throw new Error('O promotor precisa estar vinculado a um supervisor.');
 return {role:profile.role};
}
export function connectionError(error){
 const messages={
  'auth/operation-not-allowed':'Ative o provedor E-mail/senha no Firebase Authentication.',
  'auth/configuration-not-found':'O Firebase Authentication ainda precisa ser configurado.',
  'auth/invalid-credential':'E-mail ou senha inválidos. Use uma conta cadastrada no Authentication deste projeto.',
  'auth/user-not-found':'E-mail ou senha inválidos.',
  'auth/wrong-password':'E-mail ou senha inválidos.',
  'auth/invalid-email':'Informe um e-mail válido.',
  'auth/user-disabled':'Esta conta está desativada.',
  'auth/network-request-failed':'Falha de conexão. Confira a internet e tente novamente.',
  'auth/too-many-requests':'Muitas tentativas. Aguarde antes de tentar novamente.',
  'auth/unauthorized-domain':'Autorize o domínio deste app nas configurações do Authentication.',
  'auth/invalid-api-key':'Confira a configuração Web e as restrições da chave no projeto Firebase.',
  'permission-denied':'Login aceito, mas a leitura do perfil foi negada. Confira as regras de users/{UID}.',
  'unavailable':'Firestore indisponível. Confira se o banco foi criado e tente novamente.',
  'failed-precondition':'Confira a criação e configuração do banco Firestore padrão.'
 };return messages[error?.code]|| (error?.safeMessage?error.safeMessage:'Não foi possível concluir a validação. Confira a configuração do projeto e a conexão.');
}
