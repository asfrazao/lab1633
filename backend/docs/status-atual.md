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
- Ainda sem function calling/tools reais da OpenAI nesta etapa

## Proximos passos

1. Versionar no GitHub
2. Deploy Render/Railway
3. Configurar dominio/subdominio
4. Testar demonstracao local no WhatsApp pessoal via `#lab1633`
5. Migrar persistencia para banco
6. Ativar OpenAI real quando houver credito
7. Integrar OpenAI function calling/tools reais ao orquestrador agentico
