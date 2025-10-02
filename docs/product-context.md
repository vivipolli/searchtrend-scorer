Projeto: SearchTrend Scorer

1. Problema

Domínios digitais são negociados como ativos, mas a avaliação de valor ainda é limitada a critérios como raridade, extensão (TLD) e histórico on-chain.

O que falta: um sinal confiável de demanda real do mercado, que indique quais termos/domínios têm relevância prática para usuários e empresas.

Sem isso, compradores e vendedores enfrentam assimetria de informação → muitos domínios valiosos passam despercebidos, e ativos sem demanda real são superestimados.

2. Solução

SearchTrend Scorer: uma ferramenta de AI + analytics que combina dados on-chain com dados de busca web2 (Google Trends, Keyword Planner, autocomplete).

Para cada domínio, gera um TrendScore, baseado em:

Volume de busca atual → relevância imediata.

Variação histórica → tendência de crescimento ou queda.

Previsão de demanda → séries temporais + ML para detectar padrões emergentes.

Métricas on-chain → raridade, histórico de transações, liquidez, transferências.

3. Diferencial

Track 4 pede AI-driven analytics de traits e tendências.

Nosso diferencial: conectar a demanda do mundo real (buscas) com o mercado on-chain.

Outros projetos analisam apenas “raridade” ou “dados on-chain”; nós incluímos um sinal externo que reflete valor comercial e brand equity.

Isso abre espaço para novos tipos de DeFi/derivativos → staking em domínios que vão “bombar”, ETFs baseados em tendências de busca, etc.

4. Impacto

Para traders/investidores: decisões mais inteligentes, baseadas em métricas reais de mercado.

Para a comunidade DomainFi: maior volume de transações, descoberta de domínios “escondidos” com potencial.

Para o ecossistema web3: integra métricas do mundo web2 (busca/SEO) com liquidez on-chain → reduz a barreira entre mundos.

5. MVP no Hackathon

Funcionalidades básicas (demo):

Interface simples para inserir ou listar domínios.

API que consulta métricas de busca (exemplo: Trends, autocomplete).

Cálculo de TrendScore inicial = (Volume normalizado + Tendência + On-chain traits).

Dashboard de visualização: lista de domínios ordenados por pontuação.

Integração mínima com Doma para acessar dados de registro e atividade on-chain.

6. Roadmap Futuro

🔹 Automação full → varredura de grandes listas de domínios, scoring em lote.

🔹 AI preditiva → modelos de machine learning para detectar tendências emergentes.

🔹 Marketplace gamificado → negociar domínios baseados em TrendScore, com leaderboard.

🔹 Integração DeFi → staking, derivativos, ETFs baseados em scores de demanda.

7. Tech Stack

Backend: Python + FastAPI

Data sources: Google Trends API / SEO APIs (freemium), Doma on-chain API

ML/Forecasting: Prophet / Scikit-learn para séries temporais

Frontend: React / Next.js para dashboard

On-chain: Doma SDK para registrar e consultar atividades