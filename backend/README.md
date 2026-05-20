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
WHATSAPP_REQUIRE_TRIGGER=true
WHATSAPP_TRIGGER=#lab1633
```

Com `AI_PROVIDER=mock`, o backend nao chama a OpenAI e nao gera custo de API.

## Rodando localmente

```cmd
npm run dev
```

O `nodemon.json` ignora `src/data/*`, evitando reinicio quando os arquivos JSON locais mudam durante testes.

## Demonstracao local no WhatsApp pessoal

Essa integracao usa WhatsApp Web local via `whatsapp-web.js`. Ela serve apenas para demonstracao/MVP, nao e a WhatsApp Cloud API oficial e nao deve ser usada para spam.

O bot roda localmente, ignora grupos, ignora mensagens proprias e so responde mensagens de texto que comecem com o prefixo `#lab1633`. A sessao local pode gerar as pastas `.wwebjs_auth` e `.wwebjs_cache`, que ficam fora do Git.

1. Garanta o `.env`:

```env
PORT=3000
APP_NAME=Lab1633
NODE_ENV=development
AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
WHATSAPP_REQUIRE_TRIGGER=true
WHATSAPP_TRIGGER=#lab1633
```

2. Rode o backend Express em um CMD:

```cmd
npm run dev
```

3. Rode o WhatsApp em outro CMD:

```cmd
npm run whatsapp:dev
```

4. Escaneie o QR Code pelo WhatsApp:

```text
WhatsApp > Aparelhos conectados > Conectar aparelho
```

5. Teste enviando para o proprio numero ou pedindo para alguem enviar:

```text
#lab1633 Oi
#lab1633 Tenho uma doceria
#lab1633 Perco muito tempo respondendo orcamento de bolo
#lab1633 Quanto custa para colocar isso na minha doceria?
#lab1633 Meu nome e Carlos
```

6. Verifique os dados:

```cmd
curl http://localhost:3000/debug/files
curl http://localhost:3000/notifications
```

Para desconectar a sessao local, remova o aparelho em `WhatsApp > Aparelhos conectados`. Se precisar limpar a sessao deste projeto, pare o processo `npm run whatsapp:dev` e apague as pastas `.wwebjs_auth` e `.wwebjs_cache`.

## Remover obrigatoriedade do #lab1633

Por padrao, o bot exige o prefixo `#lab1633` para evitar responder qualquer pessoa no WhatsApp pessoal.

Modo seguro:

```env
WHATSAPP_REQUIRE_TRIGGER=true
WHATSAPP_TRIGGER=#lab1633
```

Nesse modo, teste com:

```text
#lab1633 Oi
#lab1633 Tenho uma doceria
```

Modo demonstracao sem prefixo:

```env
WHATSAPP_REQUIRE_TRIGGER=false
WHATSAPP_TRIGGER=#lab1633
```

Nesse modo, teste com:

```text
Oi
Tenho uma doceria
Quanto custa para colocar isso na minha doceria?
```

Mesmo sem prefixo obrigatorio, mensagens que comecem com `#lab1633` continuam funcionando; o prefixo e removido antes de enviar ao agente.

Aviso: usar `WHATSAPP_REQUIRE_TRIGGER=false` no numero pessoal pode fazer o bot responder qualquer pessoa que enviar mensagem privada. Use apenas durante demonstracoes controladas.

## Endpoints principais

- `GET /health`
- `POST /chat-teste`
- `GET /client-profiles`
- `GET /client-profiles/:phone`
- `PATCH /client-profiles/:phone/provider`
- `GET /notifications`
- `GET /notifications/unread`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/:id/resolve`

## Perfis por número e alternância #mock/#openai

Cada número que conversa com o bot pode ter um perfil em `src/data/client-profiles.json`. O perfil define nome do cliente, tipo de negócio, prompt específico e provider de IA daquele número.

Todos os perfis usam o mesmo backend. Quando `aiProvider=openai`, as chamadas usam a mesma `OPENAI_API_KEY` configurada no `.env`, podendo gerar custo. Para testes gratuitos, use `#mock`.

Por enquanto os perfis ficam em JSON local. Futuramente, migre esses dados para banco e evite subir números reais em repositório público.

Comandos no WhatsApp:

```text
#mock
```

Ativa mock para o número atual. As próximas respostas desse número não usam a API da OpenAI.

```text
#openai
```

Ativa OpenAI para o número atual, se houver `OPENAI_API_KEY` válida configurada.

```text
#auto
```

Ativa modo automático para o número atual: tenta OpenAI quando possível e usa fallback se falhar.

```text
#status
```

Mostra perfil, tipo de negócio e modo atual.

```text
#perfil
```

Mostra perfil, tipo de negócio, modo atual e descrição.

Rotas locais de desenvolvimento/admin:

```cmd
curl http://localhost:3000/client-profiles
```

```cmd
curl http://localhost:3000/client-profiles/5511999999999
```

```cmd
curl -X PATCH http://localhost:3000/client-profiles/5511999999999/provider -H "Content-Type: application/json" -d "{\"provider\":\"mock\"}"
```

```cmd
curl -X PATCH http://localhost:3000/client-profiles/5511999999999/provider -H "Content-Type: application/json" -d "{\"provider\":\"openai\"}"
```

```cmd
curl -X PATCH http://localhost:3000/client-profiles/5511999999999/provider -H "Content-Type: application/json" -d "{\"provider\":\"auto\"}"
```

Essas rotas ainda sao administrativas locais e devem receber autenticacao antes de uso em producao.

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

Perfil aplicado:

```cmd
curl http://localhost:3000/debug/profile/5511997622828
```

Chat com perfil Casa de Bolo:

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511997622828\",\"message\":\"Oi\"}"
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

## Negocios genericos no modo mock

O modo mock reconhece nichos cadastrados, como doceria, marmitaria, barbearia, assistencia tecnica e igreja/eventos. Ele tambem reconhece negocios genericos em frases simples, como `Trabalho com letreiros`, `Faco personalizados`, `Tenho uma loja de roupas`, `Sou eletricista` ou `Vendo perfumes`.

Exemplos de teste no CMD:

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800001\",\"message\":\"Ola\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800001\",\"message\":\"Trabalho com letreiros\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800001\",\"message\":\"Demoro para responder orcamento\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800001\",\"message\":\"Quanto custa para colocar isso no meu negocio?\"}"
```

Resultados esperados:

- `Trabalho com letreiros` vira `tipoNegocio: "letreiros"`.
- O estado avanca para `diagnosticar_dor`.
- O bot nao repete `Qual e o seu tipo de negocio?`.
- Dor operacional continua como lead `morno`.
- Pergunta de preco continua virando lead `quente` e gera notificacao.

Teste de resposta curta depois da pergunta de negocio:

```cmd
curl -X DELETE http://localhost:3000/debug/data/all
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800002\",\"message\":\"Ola\"}"
```

Esperado: `estado: "identificar_negocio"` e `nivelInteresse: "frio"`.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800002\",\"message\":\"Letreiros\"}"
```

Esperado: `tipoNegocio: "letreiros"`, `estado: "diagnosticar_dor"`, `nivelInteresse: "morno"` e sem repetir a apresentacao inicial.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800002\",\"message\":\"Demoro para responder orcamento\"}"
```

Esperado: `estado: "simular_atendimento"`, `nivelInteresse: "morno"` e resposta com simulacao de letreiros.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511888800002\",\"message\":\"Quanto custa para colocar isso no meu negocio?\"}"
```

Esperado: `estado: "coletar_nome"`, `nivelInteresse: "quente"` e `acao: "notificar_humano"`.

Teste de confirmacao de interesse no fluxo comercial:

```cmd
curl -X DELETE http://localhost:3000/debug/data/all
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Ola\"}"
```

Esperado: `estado: "identificar_negocio"` e `nivelInteresse: "frio"`.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Letreiros\"}"
```

Esperado: `tipoNegocio: "letreiros"`, `estado: "diagnosticar_dor"` e `nivelInteresse: "morno"`.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Vendas\"}"
```

Esperado: `estado: "simular_atendimento"`, `nivelInteresse: "morno"` e `dorPrincipal` relacionada a vender mais ou fechar oportunidades.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Certo\"}"
```

Esperado: `estado: "apresentar_solucao"` ou `estado: "coletar_interesse"` e `nivelInteresse: "morno"`.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Interessante\"}"
```

Esperado: `estado: "coletar_interesse"` e resposta perguntando se faz sentido testar.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Sim\"}"
```

Esperado: `estado: "coletar_nome"`, `nivelInteresse: "quente"`, `acao: "notificar_humano"` e resposta perguntando o nome.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999100001\",\"message\":\"Meu nome e Carlos\"}"
```

Esperado: `estado: "encaminhar_humano"`, `nivelInteresse: "quente"`, `nome: "Carlos"` e `acao: "notificar_humano"`.

Teste de finalizacao e reinicio manual:

```cmd
curl -X DELETE http://localhost:3000/debug/data/all
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Ola\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Letreiros\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Vendas\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Interessante\"}"
```

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Sim\"}"
```

Esperado: `estado: "coletar_nome"` e `nivelInteresse: "quente"`.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Meu nome e Alessandro\"}"
```

Esperado: `estado: "finalizado"`, `nivelInteresse: "quente"`, `acao: "notificar_humano"` e `nome: "Alessandro"`.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Obrigado\"}"
```

Esperado: `estado: "finalizado"`, `acao: "finalizar"` e resposta curta informando que o contato ja foi registrado.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"Ola\"}"
```

Esperado: `estado: "finalizado"`; nao deve voltar para `identificar_negocio` nem perguntar tipo de negocio novamente.

```cmd
curl -X POST http://localhost:3000/chat-teste -H "Content-Type: application/json" -d "{\"from\":\"5511999200001\",\"message\":\"comecar de novo\"}"
```

Esperado: `estado: "identificar_negocio"` e resposta perguntando tipo de negocio.

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
