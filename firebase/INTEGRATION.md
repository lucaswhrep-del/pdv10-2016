# Integração em andamento

## Primeiro incremento: sessão real

`connected.html` é uma área separada da demonstração e do diagnóstico descartável de `firebase.html`. Usa o mesmo projeto Firebase e consulta somente `users/{uid}`. Compatível com as regras iniciais existentes; não publique regras mais abertas.

- Login por e-mail/senha, logout e persistência de sessão gerenciada pelo SDK Firebase.
- Nenhuma senha armazenada pelo código; nenhum token impresso ou enviado a outro serviço.
- Perfil ativo com papel permitido obrigatório; promotor exige supervisorId.
- Dados de perfil apresentados com textContent, sem HTML arbitrário.
- Revalidação manual e ao retornar à aba, sem polling nem listeners do Firestore.
- Respostas atrasadas são descartadas após troca de identidade ou saída.
- Falhas de leitura bloqueiam a área, sem fallback para perfis de demonstração.

Essas verificações do navegador **não substituem autorização no servidor**. O botão Sair deve ser usado em aparelhos compartilhados. O módulo de clientes abaixo depende da publicação de suas regras específicas.

## Segundo incremento: clientes reais (testado; aguardando publicação das regras)

Implementados importação XLSX/CSV com prévia, consulta exata por código e listagem administrativa de 25 registros por solicitação. O arquivo original, CNPJ e CEP não são enviados. Códigos existentes são atualizados; registros ausentes não são excluídos. Há validação completa antes de iniciar o envio.

As gravações são feitas em lotes sequenciais de dez clientes. A importação inteira não é atômica: em caso de interrupção, a interface informa as gravações confirmadas e a possibilidade de o último lote ter sido salvo. Não há repetição automática. Sair durante um lote impede os seguintes, mas não desfaz o lote já em trânsito.

O módulo é acessível em `connected.html`. As regras iniciais continuam negando estas operações. A proposta específica está em `firebase/firestore-clients.rules`, SEM publicação automática. Apenas administradores ativos podem gravar; usuários ativos consultam por código; só administradores listam com limite de 25. Perfis, notas, roteiros e fotos seguem bloqueados. As regras não são um limitador de frequência de requisições ou de gasto total.

Validação em 04/09/2026: 40 testes unitários e seis testes de integração/regras passaram, com saída zero do emulador. O próprio módulo de clientes gravou, consultou e paginou registros fictícios. Foram verificadas negações para anônimos, perfis ausentes/inativos/inválidos, promotores sem vínculo, listagens indevidas, alteração de perfis, notas e campos não permitidos. O lote de dez gravações também foi aceito pelo emulador. Java 21 e Firestore Emulator 1.22.0 foram obtidos de fontes oficiais e verificados por SHA-256. Nenhum dado de produção foi utilizado.

Para repetir os testes: Java 21 no PATH, `npm ci` e `npm run test:rules`. As versões estão fixadas pelo package-lock.json. O comando expandido usa um projeto fictício, nunca o projeto de produção:

```sh
npx firebase emulators:exec --project demo-pdv10 --config firebase.emulator.json --only firestore "node --test tests/rules/*.test.mjs"
```

O teste recusa destinos diferentes de `127.0.0.1:8089`. Nenhuma conta real, senha ou planilha é necessária. O build público não inclui os testes, regras nem ferramentas locais.

### Publicação somente da etapa Clientes

Não foi encontrada conta autorizada no Firebase CLI local. A publicação depende de autenticação do administrador. Não enviar senhas, tokens ou chaves privadas no chat.

Alternativa pelo console: no projeto `pdv-10---2026`, Firestore Database > Regras, conferir as regras existentes e publicar o conteúdo de `firebase/firestore-clients.rules`. Se houver regras de outro aplicativo, não substituir sem integrar as permissões. As regras iniciais desta campanha podem ser substituídas por este arquivo. O Storage deve continuar bloqueado.

Alternativa pelo terminal, após login do administrador:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project pdv-10---2026 --config firebase.clients.json
```

Após publicar, testar primeiro com uma planilha fictícia pequena, recarregar a página e consultar os códigos salvos. Somente depois importar a base real. A publicação das regras NÃO cria notas, roteiros, usuários ou fotos e NÃO habilita a campanha completa.

## Próximos incrementos necessários

### Equipe — incremento implementado

Validação local: 43 testes unitários e 14 testes de regras/integração passaram. A nova suíte verifica cadastro real no emulador, atomicidade de código/perfil, bloqueio de duplicatas, isolamento entre supervisores e rejeição de vínculos inválidos mesmo ignorando as validações da interface. Sem testes visuais de navegador ou criação de contas reais nesta etapa.

Na área conectada, administradores podem cadastrar novos perfis de supervisor e promotor usando o UID de uma conta já criada em Authentication. A conferência de UID e e-mail é manual: Firestore não consulta o diretório de Authentication. Não há formulário de senha ou cadastro público. Contas administrativas continuam provisionadas pelo console.

`firebase/firestore-team.rules` substitui a política de Clientes e preserva as mesmas permissões da base. Adiciona criação de perfis por administradores, leitura administrativa paginada e leitura de vinculados pelo supervisor. O código do roteiro fica reservado em `routeCodes/{codigo}` na mesma operação atômica do perfil, impedindo duplicatas e reservas sem cadastro. Perfis existentes e reservas não podem ser alterados ou excluídos por esta versão.

Publicação: colar o arquivo completo `firebase/firestore-team.rules` na aba Regras do Firestore. Alternativa autenticada: `npx firebase deploy --only firestore:rules --project pdv-10---2026 --config firebase.team.json`. Não publicar `firebase.clients.json` após esta etapa, pois retiraria o acesso da equipe. Storage permanece bloqueado.

Teste manual após publicação: criar duas contas de teste em Authentication; cadastrar primeiro o supervisor pelo UID e depois o promotor vinculado, com código numérico ainda não utilizado. Sair e entrar como supervisor: carregar equipe deve mostrar somente o promotor vinculado. Como promotor, os controles de equipe não aparecem. Nunca compartilhar senhas no chat. A gestão automática de contas e alteração/desativação auditada ainda dependem do backend.

1. Modelo de dados e testes de regras nos emuladores, incluindo vínculos de supervisão e perfis inativos.
2. Backend autenticado para operações privilegiadas, notas, etapas de fotos e fechamento; limites de recursos e prevenção de repetição.
3. Persistência paginada de clientes, roteiros e conquistas, sem carregar toda a base em cada login.
4. Upload privado, validação de formato/tamanho, sequência e tempo confiável; captura não garante autenticidade da cena.
5. Integrar as telas existentes ao backend, removendo controles demonstrativos da versão real.
6. Validar com contas reais dos três perfis e câmera nos celulares. Publicar regras e serviços só após validação.

Ainda não houve implantação de backend, alteração de regras remotas, importação de clientes de produção nem ativação da campanha. O login de administrador foi confirmado pelo usuário; os testes dos demais perfis aqui descritos usam identidades fictícias no emulador.

Referência: https://firebase.google.com/docs/auth/web/auth-state-persistence
