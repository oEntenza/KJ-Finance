# K&J Finance

Sistema web de controle financeiro pessoal desenvolvido como projeto de TCC, com foco em organização do fluxo de caixa, visualização analítica e experiência de uso moderna.

## Sobre o projeto

O **K&J Finance** é uma aplicação full stack voltada ao gerenciamento de finanças pessoais. A plataforma permite que cada usuário cadastre receitas e despesas, acompanhe o patrimônio líquido, filtre registros, importe dados em massa por planilha e visualize indicadores por meio de gráficos e dashboards interativos.

O projeto foi construído com separação entre frontend e backend, adotando autenticação por JWT, persistência em banco PostgreSQL com Prisma ORM e uma interface responsiva em React.

## Objetivo

O principal objetivo do sistema é oferecer uma solução prática e visual para o controle financeiro individual, reunindo em um único ambiente:

- cadastro e autenticação de usuários;
- lançamento manual de transações financeiras;
- edição e exclusão de registros;
- importação em lote via arquivo Excel;
- filtros por descrição, categoria, tipo e período;
- indicadores financeiros e análises gráficas;
- personalização visual com temas.

## Principais funcionalidades

- Cadastro de usuário com validação de dados.
- Login com autenticação segura via JWT.
- Dashboard com patrimônio líquido, resumo financeiro e fluxo de caixa.
- Cadastro de novos registros de entrada e saída.
- Edição individual e em lote de transações.
- Exclusão individual, múltipla e total dos registros do usuário.
- Importação em massa por planilha `.xlsx`.
- Download de modelo de planilha para importação.
- Filtros por descrição, categoria, natureza e intervalo de datas.
- Página de Analytics com gráficos de evolução e distribuição por categoria.
- Página de perfil com edição de nome persistida no banco de dados.
- Página de preferências com seleção de tema.
- Temas visuais `Noir` e `Claro`.

## Tecnologias utilizadas

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Axios
- React Router DOM
- React Hook Form
- Zod
- Lucide React
- XLSX

### Backend

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- JWT
- bcryptjs
- Zod

### Banco de dados

- PostgreSQL
- Prisma Client

## Arquitetura do projeto

O projeto está dividido em dois módulos principais:

```text
Projeto_KJ/
├── KJ_Front/   # Aplicação frontend em React
└── KJ_Back/    # API backend em Fastify + Prisma
```

### Frontend

O frontend é responsável pela interface da aplicação, autenticação do usuário no cliente, renderização das páginas e consumo da API.

Principais páginas:

- `Home`: página inicial institucional do sistema.
- `Login`: autenticação do usuário.
- `SignUp`: cadastro de novos usuários.
- `Dashboard`: visualização do fluxo de caixa e resumo financeiro.
- `Analytics`: análise gráfica dos dados financeiros.
- `Profile`: dados do usuário e edição de nome.
- `Preferences`: preferências visuais e opções da conta.

### Backend

O backend centraliza as regras de autenticação, persistência e manipulação das transações financeiras.

Principais rotas:

- `POST /users`: cadastro de usuário.
- `PUT /users/me`: atualização de nome do usuário autenticado.
- `POST /sessions`: autenticação e geração de token JWT.
- `GET /transactions`: listagem das transações do usuário.
- `POST /transactions`: criação de uma transação.
- `PUT /transactions/:id`: atualização de uma transação.
- `DELETE /transactions/:id`: remoção de uma transação.
- `DELETE /transactions`: remoção de todas as transações do usuário.
- `GET /transactions/balance`: cálculo do patrimônio líquido.
- `POST /transactions/bulk`: importação em massa de registros.

## Instalação simplificada no Windows

Para facilitar o uso em outro computador, o projeto possui dois atalhos:

- `Instalar KJ Finance.bat`: instala as dependências e prepara o `.env` do backend.
- `Iniciar KJ Finance.bat`: gera o build do frontend, inicia o servidor e abre o sistema no navegador.

Fluxo recomendado para um novo computador:

1. Instalar o Node.js.
2. Abrir `Instalar KJ Finance.bat`.
3. Preencher a `DATABASE_URL` do Neon no arquivo `KJ_Back/.env`.
4. Abrir `Iniciar KJ Finance.bat`.

## Como executar o projeto

### Pré-requisitos

- Node.js instalado
- npm instalado
- PostgreSQL disponível
- Banco configurado via `DATABASE_URL`

### 1. Clonar o repositório

```bash
git clone https://github.com/oEntenza/KJ-Finance.git
cd Projeto_KJ
```

### 2. Configurar o backend

Entre na pasta do backend:

```bash
cd KJ_Back
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` com a variável:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
```

Execute as migrations do Prisma:

```bash
npx prisma migrate deploy
```

Se estiver em desenvolvimento e quiser sincronizar o client:

```bash
npx prisma generate
```

Inicie o servidor:

```bash
npm run dev
```

O backend ficará disponível em:

```text
http://localhost:3333
```

### 3. Configurar o frontend

Em outro terminal:

```bash
cd KJ_Front
```

Instale as dependências:

```bash
npm install
```

Inicie a aplicação:

```bash
npm run dev
```

O frontend ficará disponível em:

```text
http://localhost:5173
```

## Modelagem de dados

O banco possui duas entidades principais:

### User

- `id`
- `name`
- `email`
- `password_hash`
- `createdAt`

### Transaction

- `id`
- `description`
- `amount`
- `type`
- `category`
- `date`
- `createdAt`
- `updatedAt`
- `userId`

### Categorias suportadas

- `SALARY`
- `CREDIT_CARD`
- `HOUSING`
- `TRANSPORT`
- `FOOD`
- `HEALTH_WELLNESS`
- `LEISURE_ENTERTAINMENT`
- `EDUCATION`
- `FINANCE_INVESTMENTS`
- `OTHERS`

## Importação por planilha

O sistema possui importação em massa por arquivo Excel.

Formato esperado da planilha:

- `Descrição`
- `Valor`
- `Tipo`
- `Categoria`
- `Data`

Exemplos de valores aceitos:

- Tipo: `Crédito` ou `Débito`
- Categoria: salário, cartão de crédito, habitação, transporte, alimentação, saúde e bem-estar, lazer e entretenimento, educação, finanças e investimentos, outros

## Diferenciais do projeto

- Interface moderna com identidade visual própria.
- Alternância entre temas claro e escuro.
- Filtros persistidos no Analytics.
- Componentes visuais customizados, como dropdowns e datepicker.
- Importação de múltiplos registros financeiros em lote.
- Organização por usuário autenticado.
- Visualização analítica para apoio à tomada de decisão.

## Possíveis evoluções futuras

- edição de email e senha pelo perfil;
- metas financeiras e orçamento mensal;
- categorização automática por IA;
- exportação de relatórios em PDF;
- dashboard administrativo;
- deploy em nuvem com domínio próprio.

## Autor

**João Victor Entenza Santos e Kailane de Moura Rodrigues**

Projeto desenvolvido como Trabalho de Conclusão de Curso.

## Licença

Este projeto foi desenvolvido para fins acadêmicos.