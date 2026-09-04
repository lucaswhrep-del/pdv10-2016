# Integração inicial — pdv-10---2026

Configuração Web recebida e salva em `firebase-config.js`. Ela é pública e não substitui autenticação e regras. Não incluir contas de serviço, senhas ou chaves privadas no frontend.

## Estado

O app principal continua demonstrativo, em memória. `firebase.html` é uma página separada para validar uma conta existente: autentica com e-mail/senha, consulta apenas `users/{uid}` no Firestore e encerra a sessão. Nenhuma migração de dados da demonstração é feita. Não confundir teste de login com autorização para todas as operações da campanha.

SDK modular 12.18.0, carregado do domínio oficial Google apenas após o envio do formulário. Firestore Lite evita listeners e persistência local. A página não carrega Analytics ou Storage. Não há cache persistente da sessão. Não foi executado login real pelo agente.

## Preparação no console pelo administrador

1. Verificar Authentication > Sign-in method > E-mail/senha.
2. Verificar criação do Firestore padrão. Escolher a região conscientemente antes de criar recursos. Não usar regras públicas de teste.
3. Criar o primeiro usuário no Authentication; copiar o UID para o ID do documento `users/{uid}` no Firestore. Definir `role` (string `admin`) e `active` (boolean true). Não compartilhar a senha na conversa. Nenhum usuário poderá se promover a administrador pelo app.
4. Revisar as regras existentes antes de aplicar qualquer mudança. Os modelos deste diretório são restritivos e apenas para a primeira validação: Firestore permite leitura do próprio perfil; gravações e demais leituras são negadas; Storage nega tudo. Eles não foram publicados e não são a política final do produto. Se o projeto for compartilhado com outro app, não substituí-los sem adaptar e preservar os acessos existentes.
5. Verificar domínio de produção no Authentication quando o endereço Netlify existir. Validar pelo navegador no próprio aparelho.

## Próxima etapa antes de produção

Backend autenticado para cadastros, importações, notas e fechamento; vínculo supervisor/promotor validado em cada operação; desafio de captura com prazo e horário do servidor; fotos com até 200 KiB, no máximo três por conquista; gravação transacional do bônus único e indicação; testes das regras no emulador. Definir retention após contestação. Não gravar médias/rankings ou privilégios informados diretamente pelo cliente.

Habilitação de produtos, região e eventual faturamento não foram alterados. Verificar condições do Storage no console antes de assumir custos. Conectar o banco não torna a captura certificada automaticamente.

Referências: https://firebase.google.com/docs/web/setup ; https://firebase.google.com/docs/auth/web/password-auth ; https://firebase.google.com/docs/projects/api-keys .
