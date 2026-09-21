# OCAPORÃ COSTURA

Sistema mobile de controle de estoque, produção, consertos e liberação de peças para a área de costura do Hotel Ocaporã.

## Stack

- React + TypeScript + Vite
- Tailwind CSS 4
- Firebase (Auth, Firestore, Storage)

## Início rápido

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Firebase:

```bash
cp .env.example .env
```

**Sem Firebase configurado**, o app funciona em **modo demonstração** com dados fictícios.

### 3. Executar

```bash
npm run dev
```

Acesse `http://localhost:5173`

### Modo demonstração

- Use qualquer e-mail e senha com 4+ caracteres
- Dados de exemplo já carregados (Camisa Feminina M, Avental G, etc.)

## Fases de implementação

| Fase | Status | Funcionalidades |
|------|--------|-----------------|
| **1** | ✅ | Auth, layout, dashboard, estoque, cadastro, detalhes |
| 2 | Pendente | Liberação, transações, histórico |
| 3 | Pendente | Produção |
| 4 | Pendente | Consertos, inutilizações |
| 5 | Pendente | Usuários, relatórios, notificações |

## Estrutura

```
src/
├── components/     # Componentes reutilizáveis
├── pages/          # Telas do app
├── layouts/        # Layouts
├── hooks/          # Custom hooks
├── services/       # Lógica de negócio / API
├── firebase/       # Configuração Firebase
├── types/          # Tipos TypeScript
├── utils/          # Utilitários (regras de estoque)
└── constants/      # Constantes
```

## Regras de negócio principais

- **Disponível para liberação** = `currentStock` (produção e conserto não contam)
- Estoque nunca pode ficar negativo
- Toda movimentação gera histórico (Fase 2+)
- Operações transacionais no Firestore (Fase 2+)

## Firebase — deploy das regras

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

## Build para produção

```bash
npm run build
npm run preview
```

O build gera arquivos estáticos em `dist/`, prontos para PWA ou empacotamento Android (Capacitor/TWA).
