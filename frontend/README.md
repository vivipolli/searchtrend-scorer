# SearchTrend Scorer Frontend

Interface web para demonstrar o funcionamento do SearchTrend Scorer, conectando sinais de demanda do Google Trends com atividade on-chain da DOMA Protocol.

## 🎯 Objetivo

- Visualizar rapidamente o status da integração backend (DOMA + Google Trends).
- Permitir cálculo de TrendScore para qualquer domínio suportado.
- Exibir ranking de domínios em ascensão.
- Apoiar o roteiro de apresentação descrito no `TESTING_GUIDE.md`.

## 🛠️ Stack

- React + Vite + TypeScript
- Axios para comunicação HTTP
- Estilização customizada (tema azul/preto)

## 🚀 Como iniciar

```bash
cd frontend
yarn
yarn dev
```

Aplicação estará disponível em `http://localhost:5173`.

## 🔗 Integração com backend

Por padrão, aponta para `http://localhost:3001`. Para customizar, crie `.env` com:

```
VITE_BACKEND_URL=http://localhost:3001
```

## 📌 Funcionalidades

- Card de status do backend com verificação periódica.
- Formulário para consultar TrendScore (`/api/v1/domains/score`).
- Visualização do resultado com breakdown detalhado.
- Lista de domínios em tendência (`/api/v1/domains/trending/top`).
- Passo-a-passo para demonstrar a solução durante o pitch.

## 🧪 Testes principais

Consulte `../backend/TESTING_GUIDE.md` para sequência completa de testes (backend + frontend).

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
