# Lab1633 Backend

Backend inicial da Lab1633 para agente comercial de IA para WhatsApp, com modo mock sem custo, persistencia local em JSON e notificacoes internas de lead quente.

## Stack

- Node.js
- Express
- JSON local para MVP
- OpenAI preparada para uso futuro
- `AI_PROVIDER=mock` para desenvolvimento sem custo

## Requisitos

- Node.js instalado
- npm
- CMD/terminal

## Instalacao

```cmd
npm install
```

## Configuracao

Copie `.env.example` para `.env`.

No Windows CMD:

```cmd
copy .env.example .env
```

Configuracao recomendada sem credito OpenAI:

```env
PORT=3000
APP_NAME=Lab1633
NODE_ENV=development
AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
```

Com `AI_PROVIDER=mock`, o backend nao chama a OpenAI e nao gera custo de API.

## Rodando localmente

```cmd
npm run dev
```

O `nodemon.json` ignora `src/data/*`, evitando reinicio quando os arquivos JSON locais mudam durante testes.

## Endpoints principais

- `GET /health`
- `POST /chat-teste`
- `GET /notifications`
- `GET /notifications/unread`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/:id/resolve`

## Endpoints de debug local

- `GET /debug/ai`
- `GET /debug/files`
- `GET /debug/runtime`
- `DELETE /debug/data/leads`
- `DELETE /debug/data/conversations`
- `DELETE /debug/data/notifications`
- `DELETE /debug/data/all`

As rotas `DELETE /debug/data/*` sao bloqueadas quando `NODE_ENV=production`.

## Testes rapidos no CMD

Health:

```cmd
curl http://localhost:3000/health
```

Debug AI:

```cmd
curl http://localhost:3000/debug/ai
```

Criar lead:

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999900001\",\"message\":\"Tenho uma doceria\"}"
```

Lead quente:

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999900001\",\"message\":\"Quanto custa para colocar isso na minha doceria?\"}"
```

Listar notificacoes:

```cmd
curl http://localhost:3000/notifications
```

Reset local:

```cmd
curl -X DELETE http://localhost:3000/debug/data/all
```

Verificar arquivos locais:

```cmd
curl http://localhost:3000/debug/files
```

## Dados locais

Os arquivos abaixo sao versionados vazios para facilitar o clone e execucao imediata:

- `src/data/leads.json`
- `src/data/conversations.json`
- `src/data/notifications.json`

Antes de commitar, mantenha os tres com:

```json
[]
```

Arquivos temporarios `src/data/*.tmp` sao ignorados pelo Git.

## OpenAI

A integracao OpenAI esta preparada para uso futuro.

Para usar OpenAI quando houver credito de API:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sua_chave_real
OPENAI_MODEL=gpt-5.5
```

Tambem existe o modo:

```env
AI_PROVIDER=auto
```

Nesse modo, o backend tenta OpenAI quando houver chave configurada e usa mock/fallback se nao houver chave ou se a chamada falhar.

## Git e GitHub

Comandos sugeridos para commit inicial:

```cmd
git init
git status
git add .
git commit -m "Backend inicial Lab1633 com agente mock e notificacoes"
```

Antes de `git add .`, confira:

```cmd
git status
type src\data\leads.json
type src\data\conversations.json
type src\data\notifications.json
```

Garanta que:

- `.env` nao aparece no `git status`.
- `node_modules` nao aparece no `git status`.
- os tres JSONs de `src/data` contem apenas `[]`.
- nenhuma chave real foi adicionada a arquivos versionados.

Se um dia `.env` aparecer como rastreado por engano, remova do indice:

```cmd
git rm --cached .env
```

## Proximos passos

- Criar repositorio GitHub
- Subir backend para GitHub
- Hospedar backend no Render/Railway
- Configurar `api.lab1633.com.br`
- Conectar integracao WhatsApp
- Migrar JSON local para Supabase/Firebase
- Ativar OpenAI quando houver credito de API
