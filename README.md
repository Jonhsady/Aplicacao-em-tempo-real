# Chat em Tempo Real com Socket.IO

Aplicação de chat em tempo real com frontend em React e backend em Node.js/Koa com Socket.IO.

## Demonstração

- Abra o app em duas abas/navegadores e entre na mesma sala para testar tempo real.
- URL local: `http://localhost:3001`
- Exemplo de sala compartilhável: `http://localhost:3001?room=time-a`

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm

## Estrutura do Projeto

- `client`: aplicação React
- `server`: servidor Koa + Socket.IO

## Instalação e Execução

Use dois terminais diferentes.

### Backend

```bash
cd server
npm install
npm start
```

Servidor disponível em `http://localhost:8080`.

### Frontend

```bash
cd client
npm install
npm start
```

Por padrão, o React abre em `http://localhost:3000`.
Se a porta estiver ocupada:

```bash
PORT=3001 npm start
```

## Funcionalidades Implementadas

- envio e recebimento de mensagens em tempo real
- histórico inicial ao conectar (em memória, até 50 itens por sala)
- identificação de usuário com persistência em `localStorage`
- salas por código com troca em tempo real
- troca de nome em tempo real
- mensagens de sistema (entrada, saída e troca de nome)
- contador de usuários online por sala
- indicador de digitação por sala
- auto-scroll para a última mensagem
- envio com `Enter` e quebra de linha com `Shift+Enter`
- timestamp formatado nas mensagens
- compartilhamento de sala por link (`?room=<nome-da-sala>`)

## Stack Tecnológica

- Frontend: React + socket.io-client
- Backend: Node.js + Koa + Socket.IO
- Ferramentas: Nodemon

## Scripts Úteis

### Client

- `npm start`: inicia em modo desenvolvimento
- `npm run build`: gera build de produção

### Server

- `npm start`: inicia com `nodemon`

## Checklist de QA Manual

Use duas abas (ou dois navegadores) com usuários diferentes.

- [ ] abrir o chat e confirmar exibição de nome e contador de online
- [ ] trocar para uma sala (ex: `time-a`) e validar isolamento das mensagens
- [ ] abrir outra aba em sala diferente (ex: `time-b`) e confirmar isolamento completo
- [ ] enviar mensagem na aba A e validar recebimento em tempo real na aba B
- [ ] verificar timestamp em cada mensagem
- [ ] validar `Enter` para enviar e `Shift+Enter` para quebrar linha
- [ ] confirmar auto-scroll ao receber novas mensagens
- [ ] trocar nome e validar mensagem de sistema
- [ ] fechar uma aba e validar saída + decremento do online
- [ ] digitar sem enviar e validar indicador de digitação
- [ ] recarregar página e validar persistência de nome e sala via `localStorage`

## Publicação no GitHub

Depois de criar um repositório remoto no GitHub:

```bash
git init
git add .
git commit -m "feat: implementa chat em tempo real com salas e presença"
git branch -M main
git remote add origin <URL_DO_REPOSITORIO>
git push -u origin main
```

## Observações

- O histórico é mantido em memória e é perdido ao reiniciar o servidor.
- O servidor aceita conexões do frontend em `http://localhost:3000` e `http://localhost:3001`.
