# Painel de Recrutamento

Aplicação inicial para gerenciamento de staff e recrutamento. Esta entrega estabelece o login, níveis de acesso, primeiro cadastro protegido de dois desenvolvedores e cadastro administrativo de usuários. Os demais módulos do briefing (recrutamentos completos, eventos, metas, ranking e auditoria) podem ser adicionados sobre esta base.

## Iniciar

- Windows: execute `Abrir-Painel.ps1` e clique **Iniciar painel**.
- Terminal: execute `npm start` e abra `http://localhost:4173`.
- Requer Node.js 20 ou superior; não requer instalar pacotes.

No primeiro acesso, cadastre as duas contas de desenvolvedor. Use os nomes de usuário `geovanna` e `gabriel` e defina as senhas em privado. As senhas são armazenadas com salt e hash scrypt; não ficam no código nem no Git.

## Publicar no GitHub

No inicializador, clique **Publicar no GitHub**, ou execute `publicar-no-github.ps1`. O script prepara o repositório local e envia para o repositório configurado. Na primeira execução, ele pede o e-mail de autoria do GitHub. A autenticação de envio usa o Gerenciador de Credenciais do Git; senha do painel não é credencial GitHub.

## Segurança e escopo

- Os dados locais em `data/users.json` não são versionados.
- A sessão de login usa cookie `HttpOnly` e `SameSite=Strict`.
- O acesso inicial é fechado após o primeiro cadastro de desenvolvedores.
- O servidor escuta somente em `127.0.0.1` por padrão. Para uma implantação multiusuário, configure HTTPS, banco PostgreSQL, expiração persistente de sessões, recuperação de conta, logs de auditoria e controles adicionais antes de expor o serviço à rede.
- A interface desta fase é uma base funcional; os indicadores operacionais aguardam os módulos de dados das próximas fases.
