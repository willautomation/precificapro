# PRECIFICA PRO

Calculadora profissional de preço de venda para vendedores de marketplace (Shopee e Mercado Livre).

## 🚀 Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização moderna e responsiva
- **LocalStorage** - Armazenamento de configurações no navegador

## 📋 Funcionalidades

### Cálculo de Preços
- Suporte para **Shopee** e **Mercado Livre**
- Cálculo automático de taxas e comissões
- Suporte para CPF e CNPJ
- Cálculo por lucro fixo ou margem percentual
- Detalhamento completo dos custos

### Simulador de Vendas
- Simule múltiplas vendas (10, 100, 500, 1000, etc)
- Visualize faturamento total e lucro acumulado
- Análise completa de taxas e custos

### Configurações Personalizáveis
- Ajuste de taxas e comissões da Shopee
- Configuração de tabela de custos do Mercado Livre
- Salva automaticamente no navegador
- Opção de restaurar valores padrão

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar produção
npm start
```

## 🔐 Configuração OAuth do Mercado Livre

Para usar a funcionalidade de categorias com autenticação, configure as seguintes variáveis de ambiente:

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Mercado Livre OAuth
ML_CLIENT_ID=seu_client_id_aqui
ML_CLIENT_SECRET=seu_client_secret_aqui
ML_REDIRECT_URI=http://localhost:3000/api/ml/callback

# URL da aplicação (para produção, use a URL real)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Como obter as credenciais:

1. Acesse [https://developers.mercadolivre.com.br/](https://developers.mercadolivre.com.br/)
2. Crie uma aplicação
3. Configure a URL de redirecionamento: `http://localhost:3000/api/ml/callback` (ou sua URL de produção)
4. Copie o `Client ID` e `Client Secret` para o arquivo `.env.local`

### Rotas OAuth:

- `/api/ml/login` - Inicia o fluxo OAuth (redireciona para o Mercado Livre)
- `/api/ml/callback` - Recebe o callback com o código e troca por tokens
- `/api/ml/refresh-token` - Renova o access_token usando o refresh_token
- `/api/ml/categories` - Busca categorias (usa access_token se disponível)

## 📱 Uso

1. Selecione o tipo de vendedor (CPF ou CNPJ)
2. Escolha a plataforma (Shopee ou Mercado Livre)
3. Preencha os dados do produto e custos
4. Defina seu objetivo (lucro em R$ ou margem em %)
5. Clique em "Calcular"
6. Use o simulador para projetar múltiplas vendas

## ⚙️ Configurações

Acesse o painel de configurações através do ícone ⚙️ no canto superior direito para personalizar:
- Taxas da Shopee (comissão, transação, transporte, taxas fixas)
- Tabela de custos fixos do Mercado Livre
- Percentuais padrão de categoria

As configurações são salvas automaticamente no navegador.

## 📊 Regras de Cálculo

### Shopee
- Comissão incide apenas sobre o valor do produto (não inclui frete)
- Taxas variam conforme tipo de vendedor e participação em programas
- Suporte para Frete Grátis e CPF com alto volume

### Mercado Livre
- Custo fixo varia conforme faixa de preço
- Percentual de categoria configurável
- Suporte para planos Clássico e Premium

## 📄 Licença

Este projeto é de uso livre.
