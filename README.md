# Painel de Recrutamento

Aplicação local para gerenciamento de staff, recrutamento e operações. Os módulos incluem recrutamento e entrevista, metas, eventos, ranking, triagem e integração obrigatórias, período probatório, avaliação 360º, veredito, desligamento, blacklist, logs e auditoria.

## Iniciar

- Windows: execute `Abrir-Painel.ps1` e clique **Iniciar painel**.
- Terminal: execute `npm start` e abra `http://localhost:4173`.
- Requer Node.js 20 ou superior; não requer instalar pacotes.

No primeiro acesso, cadastre uma conta de desenvolvedor usando nome e senha. Depois, o login pede somente nome e senha. A senha é armazenada com salt e hash scrypt; não fica no código nem no Git. Os dados operacionais ficam em arquivos JSON locais dentro de `data/`, ignorados pelo Git.

## Níveis de acesso

- **Membro:** registra recrutamentos, consulta os próprios candidatos e acompanha as informações diárias permitidas.
- **Gestão:** acompanha a operação diária, blacklist, triagem, onboarding, ocorrências, avaliações e solicitações de eventos. Não acessa relatórios nem ranking mensal.
- **Administração:** administra recrutamentos, metas, eventos, blacklist, avaliações, desligamentos, usuários, relatórios e auditoria.
- **Desenvolvedor:** acesso total e ferramentas de manutenção; é o único nível que pode atribuir o próprio cargo a outra conta.

Os cargos são selecionados ao cadastrar usuários. Administração pode selecionar Membro, Gestão ou Administração; Desenvolvedor também pode selecionar Desenvolvedor. A conta master não pode ser rebaixada.

## Fluxo obrigatório de integração

1. **Triagem e pré-set:** 12 horas, alerta de atraso e verificação de passaporte/Discord contra a blacklist.
2. **Onboarding e equipamento:** set in-game, cargos do Discord, aula de regras e kit/radio. Cada item guarda responsável, data, estado e observações; a mesma pessoa não pode assinar mais de um item.
3. **Período probatório:** inicia automaticamente por sete dias após as quatro tarefas concluídas. Gestão registra pontos positivos e negativos e acompanha o histórico.
4. **Veredito final:** Administração ou Desenvolvedor efetiva ou reprova após o prazo; reprovação exige motivo.

A página de avaliação 360º registra seis notas de 1 a 5, comentários e evolução. O offboarding exige checklist completo e preserva o histórico. O dashboard e relatórios exibem métricas e gráficos com base nos registros locais.

## Publicar no GitHub

No inicializador, clique **Publicar no GitHub**, ou execute `publicar-no-github.ps1`. O script prepara o repositório local e envia para o repositório configurado. Na primeira execução, ele pede o e-mail de autoria do GitHub. A autenticação de envio usa o Gerenciador de Credenciais do Git; senha do painel não é credencial GitHub.

## Segurança e escopo

- Os dados locais em `data/users.json` não são versionados.
- A sessão de login usa cookie `HttpOnly` e `SameSite=Strict`.
- O acesso inicial é fechado após o primeiro cadastro de desenvolvedores.
- O servidor escuta somente em `127.0.0.1` por padrão. Para uma implantação multiusuário, configure HTTPS, banco PostgreSQL, expiração persistente de sessões, recuperação de conta, logs de auditoria e controles adicionais antes de expor o serviço à rede.
- O painel local é adequado para uso e desenvolvimento em uma máquina. Os arquivos JSON não oferecem controle de concorrência ou sincronização entre várias instalações; para uso simultâneo em várias máquinas, configure banco de dados compartilhado, HTTPS e sessões persistentes.
