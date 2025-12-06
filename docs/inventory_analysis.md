# Análise do Sistema de Produtos e Estoque

Este documento detalha a estrutura atual do banco de dados e dos componentes React relacionados ao gerenciamento de produtos e estoque, comparando com as tabelas solicitadas e identificando pontos para desenvolvimento futuro.

## 1. Análise do Banco de Dados (Schema Supabase)

A análise foi baseada no schema `public` do Supabase.

### Tabela `produtos` (Existe como `products`)

*   **Status:** **EXISTE**.
*   **Nome no Schema:** `public.products`
*   **Colunas Atuais:**
    *   `id` (uuid, NOT NULL, Primary Key): Identificador único do produto.
    *   `name` (text, NOT NULL): Nome do produto.
    *   `category` (text): Categoria do produto.
    *   `observations` (text): Descrição ou observações adicionais.
    *   `created_at` (timestamptz): Data de criação.
    *   `updated_at` (timestamptz): Data da última atualização.
*   **Conclusão:** A tabela `products` armazena as informações gerais de cada produto e está sendo utilizada corretamente.

### Tabela `estoque_detalhe` (Existe como `product_variants`)

*   **Status:** **EXISTE**.
*   **Nome no Schema:** `public.product_variants`
*   **Colunas Atuais:**
    *   `id` (uuid, NOT NULL, Primary Key): Identificador único da variante.
    *   `product_id` (uuid, NOT NULL, Foreign Key para `products.id`): Vincula a variante ao produto principal.
    *   `brand` (text): Marca da variante.
    *   `sku` (text): Código único de referência (SKU).
    *   `stock` (integer, NOT NULL): Quantidade atual em estoque.
    *   `cost_price` (numeric, NOT NULL): Preço de custo.
    *   `sale_price` (numeric, NOT NULL): Preço de venda.
    *   `min_stock` (integer, NOT NULL): Nível de estoque mínimo para alerta.
    *   `created_at` (timestamptz, NOT NULL): Data de criação.
    *   `updated_at` (timestamptz, NOT NULL): Data da última atualização.
*   **Conclusão:** A tabela `product_variants` é a implementação correta para `estoque_detalhe`. Ela armazena os detalhes específicos e o controle de estoque para cada variação de um produto.

### Tabela `movimentacoes_estoque` (Existe como `product_history`)

*   **Status:** **EXISTE**.
*   **Nome no Schema:** `public.product_history`
*   **Colunas Atuais:**
    *   `id` (bigint, NOT NULL, Primary Key): Identificador único do registro de histórico.
    *   `product_id` (uuid, NOT NULL, Foreign Key para `products.id`): Vincula a movimentação ao produto. **Atenção:** Idealmente, deveria ser `product_variant_id` para precisão.
    *   `quantity_change` (integer, NOT NULL): A mudança na quantidade (positiva para entrada, negativa para saída).
    *   `reason` (text, NOT NULL): Motivo da movimentação (e.g., "Venda OS-123", "Ajuste manual").
    *   `reference_id` (text): ID da entidade relacionada (e.g., ID da Ordem de Serviço).
    *   `created_at` (timestamptz): Data da movimentação.
*   **Conclusão:** A tabela `product_history` serve ao propósito de rastrear movimentações de estoque, mas possui uma limitação importante por estar vinculada a `products.id` em vez de `product_variants.id`.

---

## 2. Análise da Estrutura de Componentes (Código)

### Componentes de Gerenciamento de Produtos

*   `src/pages/Produtos.jsx`: Página principal que renderiza a lista de produtos.
*   `src/components/produtos/ProdutosList.jsx`: Componente central que exibe a lista de produtos e suas variantes. Inclui busca, abas para "Todos os Produtos" e "Sugestão de Compra", e ações como editar e excluir.
*   `src/components/produtos/ProdutoDialog.jsx`: Formulário (em um modal) para criar e editar produtos e suas variantes. Gerencia o estado do formulário, incluindo a adição e remoção dinâmica de variantes.
*   `src/components/produtos/ProdutoHistorico.jsx`: Componente (em um modal) para visualizar o histórico de movimentações de um produto, utilizando dados da tabela `product_history`.

### Estrutura do Estado nos Componentes

*   **`ProdutosList.jsx`**:
    *   O estado `products` é um array de objetos, onde cada objeto representa um produto e contém um array aninhado `variants`. A estrutura é: