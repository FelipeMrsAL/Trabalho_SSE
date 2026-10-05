# Smart Gym Telemetry - Sistema de Monitoramento em Tempo Real (SSE)

Este projeto é uma aplicação de telemetria fitness desenvolvida em Node.js/Express e Server-Sent Events (SSE) para o gerenciamento da capacidade de atendimento, ocupação e manutenção preventiva de equipamentos ergométricos e de musculação em academias inteligentes (*Smart Gyms*).

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express, CORS
- **Comunicação em Tempo Real:** Server-Sent Events (SSE) / HTTP REST
- **Frontend:** HTML5, CSS3 Vanilla, JavaScript (ES6+)
- **Banco de Dados (Modelagem):** PostgreSQL (Script SQL incluído em `schema.sql`)

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
- **[Node.js](https://nodejs.org/)** (versão 14 ou superior)
- **npm** (gerenciador de pacotes do Node.js)

---

## 🚀 Como Rodar a Aplicação

### 1. Clonar ou Acessar o Diretório do Projeto

Navegue até a pasta do projeto via terminal:
```bash
cd /caminho/para/trabalho_SSE
```

### 2. Instalar as Dependências

Instale os pacotes necessários especificados no `package.json`:
```bash
npm install
```

### 3. Iniciar o Servidor

Você pode iniciar o servidor de duas formas:

- **Modo Padrão:**
  ```bash
  npm start
  ```
  *(Ou diretamente via: `node server.js`)*

- **Modo Desenvolvimento (com auto-reload se tiver o `nodemon` instalado):**
  ```bash
  npm run dev
  ```

Após iniciar, a mensagem a seguir aparecerá no terminal:
```text
Servidor de Telemetria rodando na porta 3000
SSE Event Stream endpoint: http://localhost:3000/api/telemetria/stream
```

---

## 🖥️ Acessando as Interfaces no Navegador

Abra o navegador de sua preferência e acesse os endereços correspondentes a cada perfil de usuário:

- **Redirecionamento Automático / Dashboard Geral:**
  - `http://localhost:3000/` (Redireciona para o Dashboard)
- **Tela 1 - Dashboard da Recepção (Gestão de Ocupação Geral):**
  - `http://localhost:3000/telas/tela_dashboard/dashboard.html`
- **Tela 2 - Telemetria de Equipamento Individual (Visão dos Instrutores):**
  - `http://localhost:3000/telas/tela_telemetria/telemetria.html?id=ESTEIRA-03`
- **Tela 3 - Mobile Web UI do Aluno (Check-in via QR Code e Controle de Treino):**
  - `http://localhost:3000/telas/tela_mobile/tela3-mobile.html`

---

## 🌐 Endpoints da API REST & Eventos SSE

### 📡 Server-Sent Events (SSE)
- **`GET /api/telemetria/stream`**: Endpoint de conexão unidirecional SSE.
  - **`equipamento_update`**: Atualizações contínuas de velocidade, BPM, RPM, temperatura do motor e tempo.
  - **`ocupacao_update`**: Taxa global de ocupação em porcentagem.
  - **`alerta_tempo`**: Notificação disparada quando o uso contínuo ultrapassa 60 minutos.

### 🔄 HTTP REST
- **`POST /api/equipamentos/:id/iniciar`**: Inicia sessão de treino em um equipamento.
- **`POST /api/equipamentos/:id/finalizar`**: Encerra a sessão e libera o equipamento.
- **`POST /api/equipamentos/:id/manutencao`**: Marca o equipamento para manutenção preventiva e bloqueia novos usos.

---

## 🗄️ Estrutura do Banco de Dados

O arquivo [`schema.sql`](file:///home/felipalm/Documentos/Faculdade/Periodo_6/desenvolvimento_web/trabalhos/trabalho_SSE/schema.sql) contém o script SQL para criação das tabelas no PostgreSQL:
- `ALUNO`
- `EQUIPAMENTO`
- `SESSAO_TREINO`
- `TELEMETRIA_SENSORES`
- `CHAMADO_MANUTENCAO`
