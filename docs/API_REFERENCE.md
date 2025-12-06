# Referência da API (Backend RPCs)

Esta documentação lista as principais funções de banco de dados (Remote Procedure Calls) expostas para o frontend via Supabase Client.

## Ordens de Serviço

### `validate_os_creation`
Verifica se um orçamento pode ser convertido em OS.
*   **Parâmetros**: `p_budget_id` (uuid)
*   **Retorno**: JSON `{ valid: boolean, message?: string, errors?: string[] }`
*   **Regras**: Orçamento deve estar "approved". Estoque deve ser suficiente para todos os itens.

### `convert_budget_to_os`
Converte orçamento em OS, deduz estoque e cria financeiro.
*   **Parâmetros**: `p_budget_id` (uuid)
*   **Retorno**: JSON `{ os_id: uuid, os_number: bigint }`
*   **Erro**: Lança exceção se validação falhar.

### `cancel_service_order`
Cancela OS, estorna estoque e cancela financeiro.
*   **Parâmetros**: 
    *   `p_os_id` (uuid)
    *   `p_reason` (text)
*   **Retorno**: boolean (true)
*   **Erro**: Lança exceção se OS já estiver cancelada ou possuir pagamentos.

### `get_os_list`
Retorna lista de OS com filtros.
*   **Parâmetros**: 
    *   `p_status` (text|null)
    *   `p_start_date` (date|null)
    *   `p_end_date` (date|null)
    *   `p_customer_name` (text|null)
*   **Retorno**: Tabela de OS com dados agregados de cliente/veículo.

## Estoque

### `manage_stock_movement`
Realiza ajustes manuais de estoque.
*   **Parâmetros**:
    *   `p_os_id` (uuid) - Opcional, para vínculo.
    *   `p_product_variant_id` (uuid)
    *   `p_quantity` (int)
    *   `p_movement_type` (text) - 'Entrada' ou 'Saída'
*   **Retorno**: JSON `{ success: boolean, new_stock: int }`

### `get_os_stock_movements`
Histórico de movimentos de uma OS específica.
*   **Parâmetros**: `p_os_id` (uuid)
*   **Retorno**: Lista de movimentos.

## Financeiro

### `get_accounts_receivable`
Lista contas a receber com filtros e cálculo de dias de atraso.
*   **Parâmetros**:
    *   `p_status`, `p_start_date`, `p_end_date`, `p_customer_name`
    *   `p_overdue_only` (boolean)
*   **Retorno**: Lista de contas.

### `update_payment_status`
Atualiza status de pagamento e gera transação de caixa.
*   **Parâmetros**:
    *   `p_account_id` (uuid)
    *   `p_new_status` (text)
*   **Retorno**: boolean

## Auditoria

### `create_audit_log` (Interno)
Registra evento de auditoria.
*   **Parâmetros**: `entity_type`, `entity_id`, `action`, `user_id`, `details` (json).

### `get_audit_trail`
Recupera histórico completo de uma entidade.
*   **Parâmetros**: `p_entity_id`, `p_entity_type`
*   **Retorno**: Lista de logs cronológicos.