# R2D - Recordatório Alimentar (2 dias)

Este projeto é um webapp premium para nutricionistas e médicos coletarem recordatórios alimentares de 2 dias de seus pacientes de forma automatizada e profissional.

## Estrutura do Projeto

- `/src`: Frontend React (Vite)
- `/worker`: Backend Cloudflare Worker + D1
- `/src/data`: Banco de dados nutricional (MVP)

---

## Passo a Passo para Deploy

### 1. Frontend (GitHub Pages)

1. Crie um repositório no GitHub.
2. Suba o código do projeto.
3. No arquivo `src/App.tsx`, altere a URL do `fetch` para a URL do seu Cloudflare Worker (após o passo 2).
4. Configure o GitHub Actions para deploy automático do Vite ou use:
   ```bash
   npm run build
   # Faça o upload da pasta /dist para o branch gh-pages
   ```

### 2. Backend (Cloudflare Workers)

1. Crie uma conta no [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Vá em **Workers & Pages** > **Create Worker**.
3. Copie o conteúdo de `worker/index.ts` para o editor do Worker.
4. Em **Settings** > **Variables**, adicione:
   - `ACCESS_KEY`: Uma chave secreta (ex: `MINHA-CHAVE-123`). Esta mesma chave deve ser usada no header `X-ACCESS-KEY` no frontend.

### 3. Banco de Dados (Cloudflare D1)

1. No painel do Cloudflare, vá em **Workers & Pages** > **D1**.
2. Clique em **Create Database** e dê o nome de `r2ddb`.
3. No seu Worker, vá em **Settings** > **Bindings** > **Add Binding** > **D1 Database**.
   - **Variable name (MUITO IMPORTANTE):** Deve ser `DB` (em maiúsculas).
   - **Database:** Selecione `r2ddb`.
   - *Nota: O código do Worker usa `env.DB`. Se você colocar outro nome na "Variable name", o salvamento falhará.*
4. Para criar as tabelas, use o console SQL do D1 no painel e cole o conteúdo de `worker/schema.sql`.

### 4. Envio de E-mail (Opcional)

Para que o recordatório seja enviado automaticamente para `nutrologymed@gmail.com`:
1. Recomendamos usar o serviço [Resend](https://resend.com/) ou [Mailchannels](https://mailchannels.zendesk.com/hc/en-us/articles/4565814466701-Sending-Email-from-Cloudflare-Workers).
2. No seu Worker, implemente a função `sendEmailToDoctor` chamando a API do serviço escolhido.
3. Adicione sua API KEY nas variáveis de ambiente do Cloudflare.

---

## Observação sobre o Preview (AI Studio)

No ambiente de visualização do AI Studio (Shared App URL), os dados agora são salvos em um banco de dados local (`data.db`) dentro do servidor de desenvolvimento. Isso permite que você teste o fluxo completo (enviar e ver o protocolo) antes de fazer o deploy final no Cloudflare.

---

## Personalização

### Domínio Próprio
- No GitHub Pages: Vá em **Settings** > **Pages** e adicione seu domínio.
- No Cloudflare: Vá em **Workers** > **Triggers** > **Custom Domains** e adicione seu subdomínio de API (ex: `api.seudominio.com`).

### Alimentos e Medidas
- Edite `src/data/foods.json` para adicionar novos alimentos.
- Edite `src/data/measures.json` para ajustar as conversões de gramas.

---

## Segurança e LGPD
- O sistema utiliza uma `X-ACCESS-KEY` simples para evitar spam.
- Não são coletados dados sensíveis de saúde, apenas identificação e ingestão alimentar.
- O banco de dados D1 é privado e hospedado na infraestrutura segura da Cloudflare.

---
*Desenvolvido para profissionais de saúde que buscam excelência e agilidade.*
