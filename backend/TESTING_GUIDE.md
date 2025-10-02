# SearchTrend Scorer - Guia de Teste

## 🎯 **Objetivo da Solução**

O **SearchTrend Scorer** resolve um problema crítico no mercado de domínios: **a falta de sinal confiável de demanda real do mercado**. 

### **Problema Atual:**
- Domínios são negociados como ativos, mas a avaliação é limitada a critérios como raridade, TLD e histórico on-chain
- **Assimetria de informação**: muitos domínios valiosos passam despercebidos, e ativos sem demanda real são superestimados
- Falta de conexão entre demanda do mundo real (buscas) e o mercado on-chain

### **Nossa Solução:**
**AI + Analytics** que combina dados on-chain (DOMA) com dados de busca web2 (Google Trends) para gerar um **TrendScore** confiável.

---

## 🚀 **Funcionalidades Principais para Demonstração**

### **1. Integração Real com DOMA Protocol**
- ✅ Polling automático de eventos DOMA em tempo real
- ✅ Extração de dados on-chain (transações, preços, transferências)
- ✅ Consultas GraphQL para informações de domínios

### **2. Integração com Google Trends via SerpApi**
- ✅ Dados reais de volume de busca (modo live)
- ✅ Mock determinístico para demos offline
- ✅ Controles de limite diário (10 req/dia por padrão)
- ✅ Fallback inteligente quando API não disponível

### **3. Algoritmo de Scoring Inteligente**
- ✅ **Volume de busca atual** → relevância imediata
- ✅ **Variação histórica** → tendência de crescimento/queda  
- ✅ **Métricas on-chain** → raridade, liquidez, histórico
- ✅ **Previsão de demanda** → análise de padrões emergentes

---

## 🧪 **Como Testar a Solução**

### **Pré-requisitos**
```bash
# 1. Instalar dependências
cd backend
yarn install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com suas chaves:
# - DOMA_API_KEY=your-doma-api-key
# - SERPAPI_API_KEY=your-serpapi-key (opcional)
# - SERPAPI_ENABLED=true/false
# - SERPAPI_USE_MOCK=true/false
```

### **Iniciar o Servidor**
```bash
# Desenvolvimento
yarn dev

# Produção
yarn build && yarn start
```

### **Frontend (Tailwind + Vite)**
```bash
cd frontend
yarn install
yarn dev # inicia em http://localhost:5173
```

---

## 📊 **Cenários de Teste - Interface Web**

### **Teste 1: Verificar Status do Backend**
1. **Acesse o frontend**: http://localhost:5173
2. **Observe o card "Status da Integração"** no topo da página
3. **Verifique se está "Operacional"** (indicador verde)
4. **Confirme os serviços ativos**:
   - ✅ Polling DOMA Events ativo
   - ✅ Google Trends Analysis disponível  
   - ✅ Banco de dados local sincronizado

**O que observar:**
- Status card mostra "Operacional" com indicador verde
- Uptime do servidor exibido em minutos
- Lista de serviços com indicadores azuis ativos

### **Teste 2: Calcular TrendScore via Interface**
1. **No card "Calcule o TrendScore de um domínio"**
2. **Digite um domínio** (ex: `crypto.eth`, `ai.crypto`, `nft.dao`)
3. **Clique em "Calcular TrendScore"**
4. **Aguarde o resultado** (loading state)

**O que observar:**
- ✅ Botão muda para "Calculando..." durante processamento
- ✅ Resultado aparece no card "TrendScore" com score principal
- ✅ Breakdown detalhado: Search Volume, Trend Direction, On-chain Activity, Rarity
- ✅ Metadados: última atualização, confidence, data points

**Exemplo de resultado esperado:**
```
TrendScore: crypto.eth
Score: 85

Breakdown:
- Search Volume: 75.0
- Trend Direction: 90.0  
- On-chain Activity: 80.0
- Rarity: 95.0

Metadata:
- Última atualização: 02/10/2025 12:00:00
- Confidence: 85%
- Data Points: 15
```

### **Teste 3: Lista de Domínios em Tendência**
1. **Observe o card "Domínios mais quentes"** na lateral direita
2. **Verifique a lista** com domínios e scores
3. **Confirme atualização automática** (a cada 60s)

**O que observar:**
- ✅ Lista carregada com domínios demo (ai.crypto, crypto.eth, nft.dao, etc.)
- ✅ Cada item mostra: nome, score, confidence, breakdown
- ✅ Ranking numerado (#1, #2, #3...)
- ✅ Atualização automática a cada 60 segundos

### **Teste 4: Teste com Diferentes Domínios**
Teste com domínios de diferentes setores para ver variação nos scores:

1. **Domínios de alta demanda**: `ai.crypto`, `crypto.eth`
2. **Domínios de nicho**: `dao.web3`, `defi.nft`  
3. **Domínios genéricos**: `test.eth`, `demo.crypto`

**O que observar:**
- ✅ Domínios com palavras-chave populares (ai, crypto, nft) têm scores maiores
- ✅ TLDs populares (.eth, .crypto) influenciam positivamente
- ✅ Breakdown varia conforme características do domínio
- ✅ Confidence e data points consistentes

---

## 📊 **Cenários de Teste - API Direta**

### **Teste 5: Scoring via cURL (Mock)**
```bash
# Testar com domínio real do DOMA
curl -X POST http://localhost:3001/api/v1/domains/score \
  -H "Content-Type: application/json" \
  -d '{"domainName": "crypto.eth"}'
```

**O que observar:**
- ✅ Integração com DOMA API para buscar dados do domínio
- ✅ Resposta mockada da SerpApi (se `SERPAPI_USE_MOCK=true`)
- ✅ Cálculo do TrendScore com breakdown detalhado
- ✅ Armazenamento no banco de dados

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "domainName": "crypto.eth",
    "score": 64.3,
    "breakdown": {
      "searchVolume": 58,
      "trendDirection": 0.12,
      "onChainActivity": 82,
      "rarity": 94
    },
    "metadata": {
      "lastUpdated": "2025-10-02T12:00:00.000Z",
      "dataPoints": 12,
      "confidence": 0.76
    }
  }
}
```

> **Dica:** para utilizar dados reais, defina `SERPAPI_ENABLED=true` e `SERPAPI_USE_MOCK=false`. Lembre-se do limite de 10 requisições/dia no plano gratuito.

### **Teste 6: Scoring com SerpApi (Live, Consome Cota)**
```bash
# Habilitar SerpApi antes do teste
export SERPAPI_ENABLED=true
export SERPAPI_USE_MOCK=false
export SERPAPI_API_KEY=your-serpapi-key

curl -X POST http://localhost:3001/api/v1/domains/score \
  -H "Content-Type: application/json" \
  -d '{"domainName": "ai.crypto"}'
```

**O que observar:**
- ✅ Requisição na SerpApi (ver log "Using SerpApi metrics")
- ✅ Contagem de uso aumentando em `api_usage`
- ✅ Queda para fallback caso limite diário seja excedido
- ✅ Considerar consumo da cota de 10 requisições/dia

> **Importante:** volte `SERPAPI_ENABLED=false` após o teste para preservar a cota.

### **Teste 7: Polling Automático de Eventos**
```bash
# Verificar eventos sendo processados automaticamente
curl http://localhost:3001/api/v1/events/recent?limit=10
```

**O que observar:**
- ✅ Eventos DOMA sendo capturados em tempo real
- ✅ Processamento automático a cada 30 segundos
- ✅ Dados on-chain sendo extraídos e armazenados
- ✅ Logs mostrando polling ativo

### **Teste 8: Top Domínios em Tendência**
```bash
# Ver ranking de domínios por score
curl http://localhost:3001/api/v1/domains/trending/top?limit=20
```

**O que observar:**
- ✅ Ranking baseado em scores reais
- ✅ Domínios com alta demanda de busca no topo
- ✅ Combinação inteligente de dados web2 + web3

### **Teste 9: Análise de Tendências**
```bash
# Testar com domínios de diferentes setores
curl -X POST http://localhost:3001/api/v1/domains/score \
  -H "Content-Type: application/json" \
  -d '{"domainName": "ai.crypto"}'

curl -X POST http://localhost:3001/api/v1/domains/score \
  -H "Content-Type: application/json" \
  -d '{"domainName": "nft.dao"}'
```

**O que observar:**
- ✅ Domínios de setores em alta (AI, NFT) com scores maiores
- ✅ Análise de tendências baseada em dados reais
- ✅ Diferenciação clara entre domínios populares vs. nicho

---

## 🔍 **Validação da Solução Principal**

### **1. Dados Reais (Não Mockados)**
- ✅ **DOMA API**: Eventos, transações, preços reais
- ✅ **Google Trends**: Volume de busca, tendências temporais reais
- ✅ **Análise Inteligente**: Algoritmos baseados em dados de mercado

### **2. Conexão Web2 + Web3**
- ✅ **Demanda Real**: Google Trends mostra interesse real do mercado
- ✅ **Atividade On-Chain**: DOMA mostra liquidez e transações
- ✅ **Score Unificado**: Combina ambos os mundos em uma métrica

### **3. Valor para o Mercado**
- ✅ **Descoberta**: Encontra domínios valiosos "escondidos"
- ✅ **Precificação**: Baseada em demanda real, não apenas raridade
- ✅ **Tendências**: Identifica setores emergentes antes da massa

---

## 📈 **Métricas de Sucesso**

### **Técnicas:**
- ✅ Polling de eventos DOMA funcionando
- ✅ Integração Google Trends ativa
- ✅ Scores calculados com dados reais
- ✅ Performance < 2s por scoring

### **Negócio:**
- ✅ Domínios com alta demanda de busca têm scores maiores
- ✅ Tendências de mercado refletidas nos scores
- ✅ Diferenciação clara entre domínios populares vs. nicho
- ✅ Insights acionáveis para traders/investidores

---

## 🎯 **Diferencial Competitivo**

### **O que nos diferencia:**
1. **Primeira solução** a conectar demanda web2 (buscas) com liquidez web3
2. **Dados reais** do Google Trends + DOMA Protocol
3. **Algoritmo proprietário** que combina múltiplas fontes
4. **Foco em tendências emergentes** vs. apenas raridade histórica

### **Impacto esperado:**
- **Para traders**: Decisões baseadas em demanda real
- **Para comunidade DomainFi**: Maior volume, descoberta de gems
- **Para web3**: Reduz barreira entre mundos web2/web3

---

## 🚨 **Troubleshooting**

### **Google Trends não disponível:**
- ✅ Sistema usa fallback inteligente
- ✅ Análise baseada em características do domínio
- ✅ Logs mostram qual método está sendo usado

### **DOMA API com problemas:**
- ✅ Health check endpoint: `/api/v1/events/health`
- ✅ Logs detalhados de tentativas de conexão
- ✅ Graceful degradation

### **Performance:**
- ✅ Rate limiting implementado
- ✅ Cache de scores (atualização a cada 6h)
- ✅ Logs de performance disponíveis

---

## 🎉 **Demo Script - Interface Web**

### **Para apresentação (5 minutos):**

1. **Problema** (30s): "Domínios são negociados sem sinal de demanda real"

2. **Solução** (1min): 
   - **Abrir http://localhost:5173**
   - **Mostrar card "Status da Integração"** (verde, operacional)
   - **Calcular score de "crypto.eth"** via interface
   - **Explicar breakdown**: Search Volume + Trend Direction + On-chain Activity + Rarity

3. **Diferencial** (2min):
   - **Comparar domínios**: testar "ai.crypto" vs "test.eth"
   - **Mostrar "Domínios mais quentes"** (lateral direita)
   - **Explicar conexão web2 + web3**: Google Trends + DOMA Protocol
   - **Destacar atualização automática** (60s)

4. **Impacto** (1.5min):
   - **Para traders**: decisões baseadas em demanda real
   - **Para mercado**: descoberta de gems escondidas  
   - **Para web3**: ponte entre mundos

### **Fluxo de Demonstração:**
```
1. Acesse http://localhost:5173
2. Verifique status "Operacional" (card verde)
3. Digite "crypto.eth" → Calcular TrendScore
4. Observe breakdown detalhado
5. Teste "ai.crypto" para comparar scores
6. Mostre lista "Domínios mais quentes"
7. Explique conexão Web2 + Web3
```

**Resultado**: Solução única que resolve assimetria de informação no mercado de domínios! 🚀
