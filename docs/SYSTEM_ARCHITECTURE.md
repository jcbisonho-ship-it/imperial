# Arquitetura do Sistema

## Visão Geral
O sistema é uma aplicação web Single Page Application (SPA) construída com **React** e **Vite**, utilizando **Supabase** como Backend-as-a-Service (BaaS). A arquitetura foca na integridade dos dados através de transações no banco de dados (RPCs) e uma interface de usuário responsiva e moderna.

## Estrutura de Banco de Dados (Supabase/PostgreSQL)

### Tabelas Principais
*   **`service_orders`**: Tabela central.
    *   `os_number` (BigInt): Identificador sequencial legível para humanos.
    *   `status`: Enum (Aberta, Concluída, Cancelada).
    *   Relacionamentos: `customer_id`, `vehicle_id`, `budget_id`.
*   **`budgets`**: Orçamentos que dão origem às OS.
    *   `status`: (Draft, Pending, Approved, Converted, Rejected).
*   **`budget_items`**: Itens (produtos/serviços) vinculados a orçamentos.
*   **`accounts_receivable`**: Parcelas financeiras geradas a partir da OS.
*   **`stock_movements`**: Log imutável de todas as entradas e saídas de estoque.
*   **`audit_log`**: Trilha de auditoria para ações críticas (segurança e rastreabilidade).

### Diagrama de Fluxo de Dados (Simplificado)
`Orçamento (Aprovado)` -> **RPC: convert_budget_to_os** -> 
   1. Cria `service_order`
   2. Cria `accounts_receivable` (Pendente)
   3. Deduz `product_variants` (Estoque)
   4. Cria `stock_movements` (Tipo: SALE)
   5. Atualiza `budget` (Status: Converted)

## Backend Logic (RPC Functions)
A lógica de negócio crítica reside no banco de dados para garantir atomicidade.

*   **`convert_budget_to_os(budget_id)`**: Função transacional mestre. Realiza todas as operações de criação de OS, financeiro e baixa de estoque em uma única transação. Se algo falhar, nada é salvo.
*   **`cancel_service_order(os_id, reason)`**: Realiza o processo inverso. Estorna estoque, cancela financeiro e invalida a OS.
*   **`validate_os_creation` / `validate_os_cancellation`**: Funções auxiliares que retornam JSON com status de validação e mensagens de erro antes de tentar executar as transações pesadas.
*   **`get_dashboard_*_metrics`**: Funções otimizadas para agregação de dados (SUM, COUNT) para os dashboards, evitando processamento pesado no frontend.

## Frontend Architecture

### Tech Stack
*   **Core**: React 18, Vite.
*   **Styling**: TailwindCSS, shadcn/ui (Radix Primitives).
*   **State Management**: React Hooks (useState, useEffect, useContext).
*   **Data Fetching**: Supabase Client (supabase-js).
*   **Icons**: Lucide React.

### Componentização
*   **`src/services/`**: Camada de abstração para chamadas RPC e validações. Evita chamadas diretas `supabase.rpc` espalhadas pelos componentes visuais.
    *   Ex: `osService.js` centraliza a lógica de OS.
*   **`src/components/ui/`**: Componentes base reutilizáveis (Botões, Inputs, Dialogs).
*   **`src/components/os/`**: Componentes específicos de domínio.
    *   `ServiceOrders.jsx`: Lista e filtros.
    *   `ServiceOrderDetail.jsx`: Modal complexo com abas (Detalhes, Estoque, Auditoria).

## Segurança
*   **RLS (Row Level Security)**: Todas as tabelas possuem políticas de segurança ativas no Supabase, garantindo que apenas usuários autenticados possam ler/escrever dados.
*   **Audit Trail**: Todas as ações de modificação de estoque e status de OS são registradas na tabela `audit_log` via triggers ou dentro das RPCs.