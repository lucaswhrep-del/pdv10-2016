# PDV Nota 10 — primeira versão demonstrativa

## Integração atual

`connected.html` oferece login real e módulo de clientes (importação confirmada, consulta exata e paginação administrativa). A demonstração principal permanece separada. 40 testes unitários e seis testes de regras/integração com Firestore Emulator passaram. As regras da etapa Clientes ainda precisam ser publicadas pelo administrador; instruções e limitações em `firebase/INTEGRATION.md`. Roteiros, equipe, conquistas, fotos e premiação ainda não estão conectados ao backend. Não liberar para operação da campanha.

## Estado para versionamento — 04/09/2026

Repositório de destino: https://github.com/lucaswhrep-del/pdv10-2016. O nome do repositório contém 2016; a campanha permanece configurada para 2026.

Os 23 testes automatizados passaram e o build foi verificado. A planilha corrigida foi validada anteriormente com 3.099 clientes, sem duplicatas ou erros; não está incluída no repositório. O usuário informou que a configuração inicial do Firebase está concluída; as regras desta pasta continuam sendo somente as regras restritivas de teste de acesso, não a política final de produção. Nenhum deploy Netlify foi realizado.

As referências históricas à primeira planilha abaixo não descrevem a base corrigida. O intervalo de permanência apresentado ao usuário é de 6 dias, calculado internamente como 6 × 24 horas.

Campanha individual de outubro a dezembro de 2026. Este projeto inicia o produto, mas **não está pronto para operação real ou pagamento de prêmios**.

Configuração Web do Firebase `pdv-10---2026` adicionada. A página separada `firebase.html` valida Authentication e leitura do próprio perfil, com encerramento da sessão. Não integra ainda os dados da campanha nem envia fotos. Modelos restritivos de regras e próximos passos em `firebase/SETUP.md`; nenhuma regra foi publicada e nenhum recurso remoto foi criado.

## Executar e publicar a demonstração

Requer Node.js. Bibliotecas de importação incluídas localmente em `vendor/`, com licenças; não exige instalação nem CDN em execução.

- `node dev-server.mjs`: abre servidor local em http://127.0.0.1:4173.
- `node --test tests/*.test.mjs`: testa as regras locais.
- `node build.mjs`: copia os arquivos públicos para `dist`.
- GitHub: criar/selecionar o repositório do novo app e enviar este diretório como raiz.
- Netlify: importar esse repositório; `netlify.toml` define comando e pasta de publicação.

Nenhum repositório remoto ou site Netlify foi criado nesta entrega. Não incluir dados pessoais reais nesta demonstração.

Validação: 19 testes automatizados de domínio, importação e compressão simulada, verificação de sintaxe e resposta HTTP local. Sem teste visual ou de câmera em dispositivo real. O arquivo original `estatisticas_1.pdf` não estava mais disponível no caminho informado; leitura real do relatório está pendente do reenvio. A planilha de clientes fornecida foi conferida e processada com o mesmo Worker e funções do app: 3.461 linhas, 3.099 códigos únicos, 362 repetições idênticas nos campos selecionados e nenhum conflito. Nenhum dado dessa base foi incorporado ao código ou publicado. Ferramenta opcional WebMCP de consulta ainda sem validação em contexto compatível.

## Implementado

Interface responsiva com logos fornecidas de Itambé e Grupo WH, sem mudar a paleta; perfis simulados por usuário; cadastro de promotores com código de roteiro e supervisor obrigatório; avaliação apenas pelo supervisor vinculado na lógica da demonstração; rota até 100 pontos com corte de 90%; soma de todas as notas de conquistas aprovadas; uma indicação por promotor/mês; bônus único de 50 para o vencedor; painel geral do administrador e painel restrito aos promotores do supervisor.

Importação de clientes XLSX/CSV em Worker, primeira aba, seleção das cinco colunas e número opcional, prévia e confirmação antes de atualizar a base. Reconhece Cliente como código e Nome 1 como razão social; junta Rua e Nº no endereço. Repetições idênticas nos campos selecionados são unificadas com aviso; divergências bloqueiam a confirmação. CNPJ e CEP não são importados. Consulta exata por código preenche razão social, cidade, bairro e rua; a conquista guarda uma cópia desses campos. Limites: 5 MB e 20 mil linhas.

Importação de PDF diário no navegador com PDF.js, até 10 MB e 120 páginas. Reconhece o modelo textual de estatísticas previamente analisado, confere totais, registra divergências e requer vínculo de cada promotor e justificativas de exclusão. PDF digitalizado não é aceito. Cores vermelhas não são interpretadas automaticamente. Registros de data/equipe repetidos e promotor/data repetidos são bloqueados. Apenas agregados e metadados são conservados na sessão, não o arquivo PDF.

Captura via câmera sem seletor de galeria; três etapas sequenciais; bloqueio local de 144 horas; compressão WebP com fallback JPEG até 200 KB. Redução progressiva do lado maior da foto de 1440 até 1024 pixels, mantendo qualidade mínima de codificação e adicionando selo fora da imagem original. Selo explicitamente local, não certificado. Imagens carregadas sob demanda e lista paginada. É necessário conferir legibilidade no aparelho.

Todos os dados ficam apenas em memória e são perdidos ao recarregar. Nenhuma imagem é enviada. Perfis não são autenticação. O relógio do dispositivo não é confiável para provas. Pontuação é demonstrativa, não representa fechamento oficial. A câmera precisa de teste presencial em celulares Android e iPhone.

## Arquitetura de produção proposta

Frontend no Netlify; código no GitHub; Firebase Auth para identidade; Firestore para dados; Storage privado para fotos; funções confiáveis para captura, avaliação e fechamento. Confirmar o projeto Firebase antes de instalar SDKs e definir o ambiente de execução do backend.

1. Servidor autentica e autoriza o promotor, verifica conquista/etapa e emite desafio de uso único, vinculado a usuário, conquista, etapa e expiração curta.
2. Câmera captura; arquivo é comprimido. Backend recebe e valida conteúdo, tamanho, desafio, sequência, horário de recebimento e intervalo. Upload tardio/offline não certifica data.
3. Backend grava horário confiável, hash e evidência imutável; gera selo com ID verificável e horário. A inscrição visual é informativa, não prova isolada. Hash detecta arquivos idênticos, não todas as reedições.
4. Captura somente pela câmera dificulta reaproveitamento, mas não impede câmera virtual nem fotografar outra tela. Avaliação humana permanece necessária.
5. Storage sem leitura pública. Dono acessa suas conquistas; supervisor acessa apenas os promotores atribuídos; administração acessa fechamento. Notas, papéis, bônus e timestamps não são graváveis diretamente pelo cliente.
6. Permanência validada no servidor: executionAcceptedAt + 144 horas. A mesma checagem deve acontecer antes de emitir desafio e ao aceitar foto. Exatamente três evidências por conquista; alterações após avaliação exigem procedimento auditado.
7. Indicação única por campanha/mês/promotor e vencedor único por campanha/mês, com operação transacional e log. Bônus calculado a partir do vencedor, nunca incremento repetível.
8. Importar relatórios com conferência; preservar chave de origem e evitar dupla contagem em reimportação. Validar se linhas representam realmente a programação do dia, além de alertas vermelhos e justificativas.
9. Fechamento mensal imutável após prazo de contestação. Consolidado mensal usa soma das visitas válidas / soma das previstas elegíveis.

## Decisões a confirmar

- Soma das notas foi confirmada. Eventuais limites de conquistas e mecanismo contra fragmentação de uma mesma execução ainda não definidos.
- Eleição e desempate da conquista do mês; valor dos prêmios mensais e do especial.
- Mês de competência: proposta é mês da foto de permanência. A interface demonstra mês selecionado; a produção não deve aceitar competência escolhida livremente.
- Prazo de dezembro: definir se execuções depois de 25/12 podem concluir em janeiro ou não concorrem.
- Prazo e processo de contestação; retenção de fotos e descarte após auditoria; tratamento de falhas de conexão.
- Regra de impedimentos, folgas e ausências; atribuição de supervisores; cadastros dos participantes.

## Custo de imagens

Teto implementado de 200 KiB por imagem: até 600 KiB por conquista, sem contar metadados. Valores exibidos como KB na interface. Os originais não são mantidos. Total de custos futuros depende da quantidade de conquistas, downloads, operações e retenção; não é garantia de custo zero. Definir retenção após o prazo de contestação. Na produção, os limites devem ser validados também no servidor e no Storage, com leitura privada e resumos paginados para evitar consultas repetidas.
