# PLANO: Sistema de Rastreamento de CTRs Expiradas

> **ESBOÇO** — Este documento resume tudo o que foi discutido sobre o sistema de CTRs expiradas.
> Não foi implementado nada ainda. Serve como ponto de partida para continuação.

---

## 1. Contexto Legal

- **Decreto Municipal 37.952/1999**: caçambas não podem permanecer na rua por mais de 5 dias
- **Normas mais recentes**: prazo reduzido para **3 dias**
- **Lei Municipal 18.299/2025**: multa de **R$ 929,00** por descumprimento
- Quando uma CTR expira, ela precisa ser **refazida** (retirar a antiga, criar nova)

---

## 2. Regra de Negócio

- CTRs com a data **"Envio a Obra"** (campo Label8 do portal) com mais de **3 dias** são consideradas expiradas
- A data de referência vem do **portal** (campo "Envio a Obra" na aba "Retirar CTR da Obra"), NÃO do `created_at` do banco
- O sistema precisa identificar automaticamente quais CTRs expiraram e permitir refazê-las

---

## 3. Fluxo de Refazer CTR (conforme explicado pelo usuário)

### Passo 1: Retirar a CTR antiga
- Navegar para `RetiradaDestinacao.aspx`
- Buscar a cacamba na tabela
- Clicar em `lkbtnConfRetirada` → abrir modal
- Clicar em `Button1` ("Retirar caçamba da obra")
- Selecionar placa do caminhão em `ddl_PlacaVeiculo`
- Selecionar destino em `ddl_Destino`
- Preencher identificação e data
- Clicar `bt_ConfirmarRetirada` → confirmar

### Passo 2: Criar nova CTR em nome do CLIENTE
- **NÃO usar** o atalho `EnviarGuiaObra.aspx` (que é para CTRs já pré-cadastradas da Newtom)
- Usar o formulário completo em **`GuiaEletronica.aspx`**
- Preencher o **CNPJ do CLIENTE** (não da Newtom) no campo `txtCpgCnpj`
- O portal carrega os endereços e resíduos DESSE cliente
- Selecionar endereço, tipo de cacamba (34 = 4m³), volume (4m³)
- **Clicar "Salvar Solicitação de CTR"** → a CTR vai para a aba "Enviar CTR para Obra" como pré-cadastro

### Passo 3: Aguardar transbordo receber
- A CTR fica na aba "Em trânsito ao Destino Final" com status "Pendente de Recebimento"
- Quando o transbordo recebe, a CTR **desaparece** da lista
- O sistema precisa verificar periodicamente se sumiu

### IMPORTANTE:
- A aba "Enviar CTR para Obra" é um **pré-cadastro** — não envia a CTR para a obra diretamente
- O botão correto para cadastrar é **"Salvar Solicitação de CTR"** (NÃO "Salvar CTR e Enviar Caçamba à Obra" que é o `bt_SalvarEnviar` atual)
- **Pergunta em aberto**: qual é o nome exato/seletor do botão "Salvar Solicitação de CTR"? Não está no código atual

---

## 4. Dados Disponíveis no Portal

### Aba "Em trânsito ao Destino Final" (Home2.aspx)
URL: `https://rcc-spregula.coletas.online/Transportador/Home2.aspx?Status=Em%20tr%C3%A2nsito%20ao%20Destino%20Final`

Cada CTR aparece como um card `.supTicket` com os campos:

| Seletor | Campo |
|---|---|
| `[id*="_lkb_Guia"]` | Número da CTR |
| `[id*="_Label15"]` | Número da cacamba |
| `[id*="_lblStatusDescricao"]` | Status (ex: "Pendente de Recebimento") |
| `[id*="_Label14"]` | Solicitante (nome do cliente) |
| `[id*="_Label6"]` | Endereço |
| `[id*="_Labelt10"]` | Telefone |
| `[id*="_Label8"]` | **Data Envio a Obra** (data de referência para expiração) |
| `[id*="_Label12"]` | Data Retirada |
| `[id*="_Label18"]` | Veículo/Placa |
| `[id*="_Label19"]` | Destino |

### Aba "Retirar CTR da Obra" (RetiradaDestinacao.aspx)
URL: `https://rcc-spregula.coletas.online/Transportador/RetiradaDestinacao.aspx`

| Seletor | Campo |
|---|---|
| `[id*="lbl_Identificadacacamba"]` | Número da cacamba |
| `a[id*="lkbtnConfRetirada"]` | Link para abrir modal de retirada |

### Aba "Enviar CTR para Obra" (EnviarGuiaObra.aspx)
URL: `https://rcc-spregula.coletas.online/Transportador/EnviarGuiaObra.aspx`

- Repeater: `[id*="rpt_Guias"]`
- Link de envio: `[id*="lkb_EnviarGuia"]`
- Cada linha mostra o **nome do cliente** no texto
- Formulário pós-clique (prefixo `ctl00_ContentPlaceHolder1_`):
  - `ed_identificacao_Envio` — identificação da cacamba
  - `ddl_PlacaVeiculo` — placa do veículo
  - `ddl_TipoCacamba` — tipo (pré-preenchido "34")
  - `bt_PopEnviarGuia` — Confirmar

### Formulário de Criação (GuiaEletronica.aspx)
URL: `https://rcc-spregula.coletas.online/Transportador/GuiaEletronica.aspx`

- Prefixo: `ctl00_ContentPlaceHolder1_EmissaoCTR_`
- `txtCpgCnpj` — CNPJ do gerador/cliente (carrega endereços e resíduos)
- `rpt_EnderecosObra` — seleção de endereço
- `ddCacamba` — tipo de cacamba (valor "34" = 4m³)
- `rpt_Classes` — classes de resíduo
- `ed_Volume` — volume (4m³)
- `bt_SalvarEnviar` — "Salvar CTR e Enviar Caçamba à Obra" (botão atual)
- `btnSIMModalPergunta` — botão "Sim" no SweetAlert de confirmação do gerador
- `pn_Envio` — modal de envio (após salvar)
- `ed_identificacao_Envio` — identificação no modal
- `ddl_PlacaVeiculo` — placa no modal
- `bt_PopEnviarGuia` — Confirmar no modal
- **Pergunta**: existe outro botão "Salvar Solicitação de CTR" neste formulário?

---

## 5. Arquitetura Proposta

### Dois serviços comunicando via HTTP:

```
MINHAS-CACAMBAS (UI + API proxy)
       |
       | HTTP (fetch)
       v
ctr-automacao-relampago (Puppeteer + API + Scheduler)
       |
       | Puppeteer
       v
Portal Coletas Online (RCC SPRegula)
```

- **CTR service**: tem Puppeteer, acessa o portal, cria/retira CTRs, roda o scheduler
- **MINHAS-CACAMBAS**: tem a UI, faz chamadas HTTP ao CTR service via proxy

---

## 6. Banco de Dados — Tabela `ctr_expiradas`

Adicionar em `lib/db.ts` do CTR service via `CREATE TABLE IF NOT EXISTS`:

```sql
CREATE TABLE IF NOT EXISTS ctr_expiradas (
  id              TEXT PRIMARY KEY,
  cacamba         TEXT NOT NULL,
  ctr_numero      TEXT NOT NULL,
  placa           TEXT NOT NULL,
  cliente         TEXT NOT NULL,
  dt_envio_obra   TEXT NOT NULL,     -- data "Envio a Obra" do portal (Label8)
  dt_retirada     TEXT,              -- data da retirada (Label12)
  status          TEXT NOT NULL DEFAULT 'expirada',
                  -- 'expirada' | 'refazendo' | 'pendente_recebimento' | 'recebido' | 'erro'
  novo_ctr_numero TEXT,              -- CTR número após refazer
  mensagem        TEXT,              -- mensagem de erro ou sucesso
  attempts        INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
```

Funções DB necessárias:
- `salvarExpiradas(rows[])` — upsert em lote
- `buscarExpiradas()` — retorna todas com status ≠ 'recebido'
- `atualizarStatusExpirada(id, status, extra)`

---

## 7. Endpoints API (CTR service)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/ctr/expiradas` | GET | Retorna CTRs expiradas do banco |
| `/api/ctr/expiradas/scan` | POST | Login no portal → scrape "Em trânsito" → calcular expiração → atualizar banco |
| `/api/ctr/expiradas/refazer` | POST | Recebe `{id}` → executa fluxo completo (retirar + criar nova) |
| `/api/ctr/expiradas/recebimento` | POST | Recebe `{id}` → verifica se sumiu da aba "Em trânsito" |

### Funções Puppeteer novas em `coletasOnlineClient.ts`:

- `listarCTRsAtivas(page)` — scrape completo da aba "Em trânsito", retorna todos os cards com dados
- `verificarRecebimento(page, cacamba)` — verifica se cacamba ainda está na aba "Em trânsito"
- `refazerCTR(cacamba, placa, cliente, cnpjCliente)` — fluxo completo: retirar antiga + criar nova

---

## 8. Endpoints Proxy (MINHAS-CACAMBAS)

Adicionar em `server.ts`:

| Endpoint | Proxy para |
|---|---|
| `GET /api/ctr-expiradas` | `CTR_URL/api/ctr/expiradas` |
| `POST /api/ctr-expiradas/scan` | `CTR_URL/api/ctr/expiradas/scan` |
| `POST /api/ctr-expiradas/refazer` | `CTR_URL/api/ctr/expiradas/refazer` |
| `POST /api/ctr-expiradas/recebimento` | `CTR_URL/api/ctr/expiradas/recebimento` |

Variável de ambiente: `CTR_URL` (ou usar `VITE_CTR_URL` existente)

---

## 9. Scheduler Automático

- Executa a cada **15 minutos** via `setInterval` no server-side do CTR service
- Inicia quando o server Express sobe
- **Scan de expiradas**: login → scrape "Em trânsito" → filtrar com `dt_envio_obra` > 3 dias → salvar/atualizar no banco
- **Verificar recebimento**: para cada CTR com status `pendente_recebimento` → verificar se sumiu da aba "Em trânsito" → se sumiu, status = `recebido`
- Logs no console para debugging

---

## 10. Tela Frontend (MINHAS-CACAMBAS)

### Sidebar
Novo item em `src/components/Sidebar.tsx`:
```ts
{ id: 'ctr-expiradas', name: 'CTR Expiradas', icon: Clock }
```

### Componente `src/components/CtrExpiradasView.tsx`

Layout:
- Header com título + botão "Verificar Agora" (chama scan)
- Tabela com colunas: Caçamba | CTR | Placa | Cliente | Envio a Obra | Dias | Status | Ações
- Status badges:
  - 🔴 Expirada (dt_envio_obra > 3 dias)
  - 🟡 Refazendo (em processo de refazer)
  - 🟠 Pendente de Recebimento (nova CTR criada, aguardando transbordo)
  - 🟢 Recebido (transbordo recebeu)
  - ❌ Erro
- Botão "Refazer" na linha → chama endpoint de refazer
- Loading spinner durante operação (~60s por causa do Puppeteer)
- Polling automático: a cada 30s recarrega a lista

### App.tsx
- Import do componente
- Render condicional: `currentTab === 'ctr-expiradas'`

---

## 11. Fluxo Completo do Usuário

1. Admin abre aba "CTR Expiradas"
2. Clica "Verificar Agora" → sistema faz scan do portal
3. Lista mostra CTRs com `dt_envio_obra` > 3 dias (status: 🔴 Expirada)
4. Admin clica "Refazer" em uma CTR
5. Sistema executa Puppeteer:
   a. Login no portal
   b. Retirar CTR antiga
   c. Criar nova CTR em nome do cliente
   d. Cadastrar como "Solicitação de CTR"
6. Status muda para 🟠 Pendente de Recebimento
7. Scheduler verifica a cada 15 min se CTR sumiu da aba "Em trânsito"
8. Quando some → status muda para 🟢 Recebido
9. Admin pode clicar "Verificar Agora" para forçar atualização

---

## 12. Perguntas em Aberto

1. **Botão "Salvar Solicitação de CTR"**: qual é o nome exato/seletor? O código atual só tem `bt_SalvarEnviar` ("Salvar CTR e Enviar Caçamba à Obra"). Precisa verificar no portal se existe outro botão.

2. **CNPJ do cliente**: de onde vem? O portal tem o campo `txtCpgCnpj` no GuiaEletronica.aspx. Precisamos do CNPJ de cada cliente para criar a CTR em nome dele. Opções:
   - Cadastrar no MINHAS-CACAMBAS junto com o cliente
   - Extrair do portal de alguma forma (onde?)
   - Hardcode por enquanto

3. **Placa do caminhão**: ao refazer, usar a mesma placa da CTR antiga (campo Label18)?

4. **Pendente de Recebimento**: é uma aba separada no portal ou é o mesmo que "Em trânsito ao Destino Final"? O código atual só usa a URL `Home2.aspx?Status=Em%20tr%C3%A2nsito%20ao%20Destino%20Final`.

5. **Quando a CTR some da aba "Em trânsito"**: ela vai para uma aba "Recebido" ou simplesmente some?

---

## 13. Infraestrutura

### Serviços Render:
- **ctr-automacao-relampago**: `srv-d9baq06q1p3s73am5s8g`
  - URL: `https://ctr-automacao-relampago.onrender.com`
  - GitHub: `juniorsouzah555-collab/ctr-automacao-relampago`
- **MINHAS-CACAMBAS**: `srv-d93ill6q1p3s739lfmjg`
  - URL: `https://minhas-cacambas-render.onrender.com`
  - GitHub: `juniorsouzah555-collab/MINHAS-CACAMBAS-RENDER`

### Portal:
- URL: `https://rcc-spregula.coletas.online`
- CNPJ: `02948345000105`
- Senha: `21685430`

### Banco:
- Turso (LibSQL) — mesmo banco dos dois serviços
- Tabela existente: `ctr_resultados`
- Tabela nova proposta: `ctr_expiradas`

### Puppeteer:
- `puppeteer-core` + `@sparticuz/chromium@131`
- Args: `--disable-dev-shm-usage --no-sandbox --disable-setuid-sandbox --disable-gpu --single-process`
- Timeout: 60s

### Placas disponíveis no portal:
- BTR-7G55, BTT-1H69, CVP-5184, DHP-2C75

---

## 14. Cronograma de Implementação

| # | Etapa | Arquivos | Dependências |
|---|---|---|---|
| 1 | Tabela `ctr_expiradas` + funções DB | `lib/db.ts` | Nenhuma |
| 2 | `listarCTRsAtivas()` | `lib/coletasOnlineClient.ts` | Nenhuma |
| 3 | `verificarRecebimento()` | `lib/coletasOnlineClient.ts` | Nenhuma |
| 4 | `refazerCTR()` | `lib/coletasOnlineClient.ts` | Etapa 2 |
| 5 | API endpoints | `pages/api/ctr/` | Etapas 1-4 |
| 6 | Scheduler de 15 min | `lib/scheduler.ts` | Etapa 5 |
| 7 | Proxy endpoints | `server.ts` (MINHAS-CACAMBAS) | Etapa 5 |
| 8 | Tela CtrExpiradasView + Sidebar | `src/components/`, `src/App.tsx` | Etapa 7 |
| 9 | Deploy + teste E2E | Ambos os serviços | Etapa 8 |
