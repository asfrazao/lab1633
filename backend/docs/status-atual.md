# Status atual do projeto Lab1633

## Pronto

- Backend Express criado
- Modo mock sem custo
- OpenAI preparada para futuro
- Controle basico de conversa
- Leads em JSON
- Conversas em JSON
- Notificacoes internas
- Deduplicacao de notificacao
- Reset de dados de teste
- Nodemon configurado para ignorar `src/data`
- Canal local de demonstracao via WhatsApp Web com prefixo obrigatorio `#lab1633`
- Canal WhatsApp Web permite modo sem prefixo com `WHATSAPP_REQUIRE_TRIGGER=false`
- WhatsApp local funcionando com protecao em memoria contra mensagens duplicadas
- Mock reconhece negocios genericos, como letreiros, loja, oficina ou profissao informada pelo usuario
- Suporte multi-perfil por telefone em `src/data/client-profiles.json`
- Alternancia de provider por numero com `#mock`, `#openai` e `#auto`
- Comandos `#status` e `#perfil` no WhatsApp Web
- Rotas locais `GET /client-profiles`, `GET /client-profiles/:phone` e `PATCH /client-profiles/:phone/provider`
- Preparacao para arquitetura agentica
- `agent-tools.service.js` criado como camada inicial de ferramentas do agente
- `agentic-orchestrator.service.js` criado como ponto central futuro da IA agentica
- IA Agentic v1 implementada para OpenAI com loop manual da Responses API
- OpenAI em modo agentic via tools reais do backend
- Tools disponiveis: `get_client_profile`, `save_lead`, `create_hot_lead_notification`, `finish_conversation`, `restart_conversation`, `get_plans`, `get_business_playbook`
- `#mock` mantem modo sem custo
- `#openai` ativa OpenAI agentic por numero
- CRUD de perfis de clientes implementado em `/client-profiles`
- Perfis ainda persistidos em JSON local
- Perfis inativos nao sao usados no runtime; o fluxo cai para `default`
- Atencao: proteger dados reais antes de producao
- Painel administrativo criado em `/admin`
- CRUD visual de perfis no navegador
- Gestao visual de provider `mock`, `openai` e `auto`
- Visualizacao e acoes de notificacoes no painel
- Teste manual do agente pelo navegador via `/chat-teste`

## Proximos passos

1. Versionar no GitHub
2. Deploy Render/Railway
3. Configurar dominio/subdominio
4. Testar demonstracao local no WhatsApp pessoal via `#lab1633`
5. Migrar persistencia para banco
6. Ativar OpenAI real quando houver credito
7. Migrar persistencia para banco real
8. Adicionar autenticacao admin
9. Criar painel de perfis
10. Avaliar WhatsApp oficial
11. Criar painel web simples para gerenciar perfis
12. Evoluir painel com autenticação real e banco de dados
