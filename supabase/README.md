# 🌲 Guia de Integração com o Supabase (PostGIS & Realtime)

Este projeto está pronto para operar com o **Supabase** como backend serverless, fornecendo:
- **Banco de Dados Espacial PostGIS:** Consultas geoespaciais em milissegundos com indexação `GIST` para raio de proximidade e intersecção da malha fundiária (CAR / SICAR / Terras Indígenas / UCs).
- **Supabase Realtime:** Transmissão instantânea via WebSockets de novos focos detectados pelos satélites para todos os operadores conectados.
- **Autos de Infração Preliminares:** Persistência formal de registros de flagrante orbital e dossiês de fiscalização.

---

## 🚀 Passo a Passo para Conectar em 2 Minutos

### 1. Criar Projeto no Supabase
1. Acesse **[supabase.com](https://supabase.com)** e faça login.
2. Clique em **"New Project"**, defina o nome (ex: `amazonia-fire-watch`) e a senha do banco.

---

### 2. Executar o Script SQL (Schema & PostGIS)
1. No painel do seu projeto no Supabase, clique no menu lateral **SQL Editor**.
2. Clique em **"New Query"**.
3. Copie todo o conteúdo do arquivo **[`supabase/schema.sql`](./schema.sql)** e cole no editor.
4. Clique no botão **"Run"** (Ctrl + Enter).
5. *(Opcional)* Execute também o **[`supabase/seed.sql`](./seed.sql)** para popular as propriedades do CAR e áreas demarcadas piloto.

---

### 3. Obter as Chaves de API
1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem) -> **API**.
2. Copie:
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **Project API keys** -> `anon` / `public`

---

### 4. Configurar no Projeto
Crie ou edite o arquivo `.env` na raiz ou dentro de `frontend/.env`:

```env
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

Pronto! Ao iniciar o frontend (`npm run dev`), o sistema detecta automaticamente a conexão com o Supabase e passa a persistir e escutar os focos em tempo real.
