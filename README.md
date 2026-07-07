# FlowKanban 🚀

O **FlowKanban** é uma plataforma SaaS premium projetada para gerenciar projetos através de quadros Kanban arrastáveis. Construída para oferecer a melhor experiência ao usuário (UI/UX), conta com integrações financeiras via Asaas e infraestrutura em nuvem poderosa pelo Supabase, tudo perfeitamente empacotado para Web e Android.

## 🌟 Funcionalidades
- **Gestão Ágil**: Quadros Kanban interativos com *drag and drop* suave (`@dnd-kit`).
- **Autenticação**: E-mail, Senha e Google Auth nativos do Supabase.
- **Modelo de Assinatura/Compra**: 
  - 1 Projeto Gratuito por conta.
  - Compra de projetos adicionais (R$ 5,00/cada) processados via PIX ou Cartão (Asaas).
- **Trabalho Colaborativo**: Gere links de acesso com permissão de 'leitura' ou 'edição'.
- **Painel Administrativo**: Visão 360 do SaaS (Métricas de Usuários, Vendas, Faturamento).
- **Plataforma Híbrida**: Código base Web adaptado para gerar APK Android via Capacitor.

## 🛠️ Tecnologias
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4.
- **Estado e Requisições**: React Query (TanStack), React Router DOM v7.
- **Formulários e Validação**: React Hook Form e Zod.
- **Backend & DB**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Mobile**: CapacitorJS.
- **Pagamentos**: Asaas (Edge Functions seguras).

## 🚀 Como Instalar e Rodar Localmente

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/seu-usuario/flowkanban.git
cd flowkanban
npm install
```

### 2. Configurar o Supabase e Banco de Dados
Você pode hospedar remotamente ou rodar o Supabase local com Docker.
O schema do banco de dados encontra-se em: `supabase/migrations/20240101000000_initial_schema.sql`

Se usar a CLI do Supabase:
```bash
npx supabase start
npx supabase migration up
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base) e insira:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
VITE_APP_URL=http://localhost:5173
```
> **Atenção**: As chaves secretas do Asaas não vão no `.env` do Front-end! Elas devem ser configuradas exclusivamente nas **Edge Functions** do Supabase (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`).

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```

## 💳 Configuração do Asaas (Edge Functions)
A lógica de pagamentos está protegida no backend (Supabase Edge Functions). Para habilitá-las:
1. Abra a pasta `supabase/functions/`.
2. Configure as variáveis secretas no Supabase Dashboard ou via CLI:
```bash
npx supabase secrets set ASAAS_API_KEY=sua_chave
npx supabase secrets set ASAAS_WEBHOOK_SECRET=seu_webhook_token
```
3. Fazer deploy das funções:
```bash
npx supabase functions deploy create-asaas-payment
npx supabase functions deploy asaas-webhook
```

## 📱 Como Gerar o APK Android
O projeto já está estruturado com o **Capacitor**. Siga os passos para gerar o aplicativo nativo:

```bash
# 1. Faça a build otimizada da aplicação Web
npm run build

# 2. Sincronize os arquivos da web (dist) com o projeto nativo do Android
npx cap sync android

# 3. Abra no Android Studio
npx cap open android
```
No Android Studio, aguarde o Gradle finalizar a sincronização. Vá em `Build > Build Bundle(s) / APK(s) > Build APK(s)` e pronto! Seu APK será gerado com sucesso.

## 📁 Estrutura de Pastas
```txt
src/
  ├── components/       # Componentes React
  │   ├── kanban/       # Lógica visual e Dnd-kit do Kanban
  │   ├── layout/       # MainLayout e navegação global
  │   ├── shared/       # Guardas de rotas e componentes reutilizáveis
  │   └── ui/           # Modais, Botões, inputs
  ├── contexts/         # React Contexts (AuthContext)
  ├── hooks/            # Custom Hooks
  ├── lib/              # Configuração de libs (ex: supabase.ts)
  ├── pages/            # Páginas e roteamento
  ├── services/         # Integrações de serviços
  ├── styles/           # Tailwind CSS e variáveis globais
  ├── types/            # Definições TS e Database schema
  └── utils/            # Funções utilitárias
supabase/
  ├── functions/        # Edge Functions Serverless
  └── migrations/       # SQL do Banco de Dados PostgreSQL
```
