# Staff da Nobre — recrutamento e operações

Painel local para recrutamento e gerenciamento de staff. Inclui recrutamento por equipe, metas, eventos, ranking, treinamento, avaliação 360º, desligamentos, blacklist, comandos copiáveis e auditoria.

## Iniciar

- **Windows:** execute `Abrir-Painel.ps1` e clique em **Iniciar painel**.
- **Terminal:** execute `npm start` e abra <http://localhost:4173>.
- Requer Node.js 20 ou superior. O projeto não precisa instalar dependências.

No primeiro acesso, crie a conta de Desenvolvedor. Depois, entre com nome e senha. O painel escuta em `127.0.0.1` por padrão.

## Cargos e permissões

Há quatro cargos: **Membro**, **Gestão**, **Administração** e **Desenvolvedor**. A sidebar mostra as páginas liberadas para cada conta.

- Cada usuário tem uma aba **Permissões** para consultar os acessos do próprio cargo.
- O Desenvolvedor pode abrir a matriz **Permissões dos cargos** e alterar, separadamente, quais páginas e ações cada cargo pode usar.
- As permissões são verificadas no servidor e na interface. As mudanças valem para todos os usuários daquele cargo.
- O acesso do Desenvolvedor à administração de permissões e usuários fica protegido contra bloqueio acidental.
- Só o Desenvolvedor pode redefinir a senha de outra conta. A senha nova deve ter pelo menos 8 caracteres; a alteração encerra as sessões da conta e gera um log sem registrar a senha.

## Recrutamento

O formulário permite escolher uma entre 14 equipes, registrar nome, passaporte, Discord, idade, telefone, disponibilidade e horas in-game, responder à entrevista e copiar o log do recrutamento. Cada usuário pode salvar seu ID do Discord na Personalização para gerar uma menção no log.

## Treinamento obrigatório

1. **Triagem e pré-set:** prazo de 12 horas, alerta de atraso e verificação de passaporte e Discord contra a blacklist.
2. **Onboarding:** três tarefas obrigatórias — Set in-game, Cargos Discord e Aula de regras e conduta. Cada tarefa guarda status, responsável, data e observações. A mesma pessoa pode assinar mais de uma tarefa.
3. **Período probatório:** começa automaticamente após o onboarding e dura 7 dias. Gestão registra ocorrências positivas e negativas no histórico.
4. **Veredito:** após o prazo, um usuário autorizado efetiva ou reprova o recruta; reprovação exige motivo.

A avaliação 360º guarda notas de 1 a 5 em seis critérios, comentários e evolução. O desligamento exige o checklist completo e preserva o histórico do membro.

## Outros módulos

- **Metas e eventos:** metas diárias, semanais e mensais; solicitações de eventos e fluxo de aprovação.
- **Blacklist:** consulta e cadastro de registros com passaporte ou Discord.
- **Comandos staff:** modelos copiáveis. O painel não executa comandos no jogo nem no Discord.
- **Alinhamento:** atalho para as regras oficiais da cidade e espaço para regras internas da Staff.
- **Dashboard, relatórios e rankings:** indicadores limitados pelas permissões configuradas para cada cargo.
- **Logs e auditoria:** registra operações administrativas; usuários comuns não podem editar ou apagar os registros.
- **Personalização:** tema, cores e fonte salvos por conta.

## Dados e GitHub

O repositório contém o código-fonte e os arquivos necessários para iniciar o painel. A pasta `data/` é criada automaticamente pelo servidor e **não é enviada ao GitHub**: ela contém contas, hashes de senha e registros operacionais locais. Cada instalação mantém seus próprios dados; enviar o código ao GitHub não sincroniza esses dados entre computadores nem publica o site.

O `.gitignore` também exclui dependências locais, arquivos `.env` e logs. Não remova essas proteções para publicar o projeto.

## Publicar o código

O script `publicar-no-github.ps1` ou o botão **Publicar no GitHub** do inicializador envia o código para o repositório configurado. Isso atualiza os arquivos do projeto no GitHub; não é uma implantação web.

## Observações de segurança

- As senhas são armazenadas com salt e hash scrypt, nunca em texto aberto.
- O login usa cookie `HttpOnly` e `SameSite=Strict`.
- O cadastro inicial de Desenvolvedor é fechado depois da configuração.
- Os arquivos JSON são locais e não oferecem coordenação entre várias máquinas. Para disponibilizar o sistema na rede ou usar várias instalações ao mesmo tempo, configure hospedagem, HTTPS, banco de dados compartilhado e sessões persistentes.
