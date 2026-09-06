# GGClubs Web - Reverse-Engineered Platform

Plataforma completa de campeonatos EA FC Pro Clubs (GGClubs), reconstruída através de engenharia reversa das fontes de produção, com suporte nativo a Cloudflare Pages, Cloudflare D1 (Database SQLite Serverless) e Firebase Authentication.

---

## 🚀 Arquitetura

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (Design System escuro exclusivo `#0F0F0F`), Radix UI / Shadcn UI.
- **Autenticação:** Firebase Authentication v12 (Web SDK).
- **Edge API & Serverless:** Cloudflare Pages Functions (`functions/api/[[route]].ts`).
- **Banco de Dados:** Cloudflare D1 Serverless SQLite (`d1/schema.sql` e `d1/seed.sql`).
- **Schemas e Validação:** `@ggclubs/schemas` (Zod v4 com 32 domínios de torneios, clubes, súmulas e partidas).

---

## 🛠️ Execução Local

### 1. Instalar dependências
```bash
pnpm install --ignore-scripts
```

### 2. Inicializar banco de dados Cloudflare D1 (Local)
```bash
# Criar tabelas locais
pnpm run d1:init

# Popular com dados de teste
pnpm run d1:seed
```

### 3. Executar o Frontend (Vite)
```bash
pnpm run dev
```
Acesse: `http://localhost:5173`

### 4. Executar com Cloudflare Pages Functions & D1 (Fullstack Local)
```bash
pnpm run build
pnpm run pages:dev
```
Acesse: `http://localhost:8788`

---

## ☁️ Deploy no Cloudflare Pages (Free Tier)

### Método 1: Conectar diretamente ao GitHub (Recomendado)
1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages**.
2. Conecte sua conta do GitHub e selecione o repositório `cspgabriel/ggclubs`.
3. Configure os parâmetros de build:
   - **Framework preset:** `Vite`
   - **Build command:** `pnpm run build`
   - **Build output directory:** `dist`
4. No painel da Cloudflare após criar o projeto:
   - Vá em **Settings** > **Functions** > **D1 database bindings**.
   - Crie um banco D1 chamado `ggclubs-db` e faça o bind com o nome de variável `DB`.
   - Execute o `d1/schema.sql` e `d1/seed.sql` no console D1 da Cloudflare.
5. Seu site estará ativo na URL `https://ggclubs.pages.dev` ou seu domínio customizado gratuito com SSL automático.

### Método 2: Via Wrangler CLI
```bash
# Autenticar no Cloudflare
npx wrangler login

# Criar banco D1 em produção
npx wrangler d1 create ggclubs-db

# Executar schema no D1 de produção
npx wrangler d1 execute ggclubs-db --remote --file=./d1/schema.sql
npx wrangler d1 execute ggclubs-db --remote --file=./d1/seed.sql

# Fazer o deploy do projeto
npx wrangler pages deploy dist --project-name=ggclubs
```

---

## 📦 Estrutura de Diretórios

```
ggclubs-web/
├── d1/                     # Schemas e Seeds SQL para Cloudflare D1
│   ├── schema.sql
│   └── seed.sql
├── docs/                   # Textos e changelogs em Markdown
├── functions/api/          # Cloudflare Pages Functions (Edge REST API)
│   └── [[route]].ts
├── packages/schemas/       # Schemas Zod v4 de validação de domínio
│   └── src/
├── public/                 # Assets estáticos, banners e ícones
├── src/                    # Código fonte do Frontend React
│   ├── assets/
│   ├── components/         # Componentes visuais Radix/Shadcn
│   ├── i18n/               # Internacionalização (pt-BR / es)
│   ├── lib/                # Clientes API, Firebase, Utilitários
│   └── pages/              # Páginas e roteamento do sistema
├── wrangler.toml           # Configuração de deploy Cloudflare & D1
├── package.json
└── vite.config.ts
```
