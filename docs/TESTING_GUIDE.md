# Guia de Testes - Sistema de Ordens de Serviço (OS)

Este guia fornece procedimentos passo a passo para verificar as principais funcionalidades do sistema de Ordens de Serviço, incluindo conversão de orçamentos, gestão financeira, controle de estoque e cancelamento.

## Pré-requisitos
- Usuário autenticado no sistema.
- Pelo menos um **Cliente**, um **Veículo** e um **Produto** (com estoque > 0) cadastrados.

---

## Cenário 1: Ciclo de Vida Padrão (Orçamento -> OS -> Pagamento)

### 1.1 Criar e Aprovar Orçamento
1.  Acesse o menu **Orçamentos**.
2.  Clique em **Novo Orçamento**.
3.  Selecione um cliente e veículo (ou use a busca por placa).
4.  Adicione pelo menos um **Produto** (Peça) e um **Serviço**.
5.  Salve o orçamento.
6.  No menu de ações (três pontos) do orçamento criado, selecione **Aprovar**.
    *   **Resultado Esperado:** O status do orçamento muda para "Aprovado".

### 1.2 Converter em OS
1.  No menu de ações do orçamento aprovado, clique em **Converter em OS**.
2.  Aguarde o processamento.
    *   **Resultado Esperado:** 
        *   Notificação de sucesso "Orçamento Convertido!".
        *   Redirecionamento automático (ou navegação manual) para a tela de **Ordens de Serviço**.
        *   Uma nova OS aparece na lista com status **Aberta** e um número sequencial (ex: #000123).

### 1.3 Verificar Impacto no Estoque
1.  Acesse a OS recém-criada (clique em "Visualizar Detalhes").
2.  Vá para a aba **Estoque**.
    *   **Resultado Esperado:** 
        *   Registros de "Saída" (SALE) para os produtos incluídos.
        *   Quantidade negativa ou indicada como saída.
        *   Motivo: "Conversão OS #..."

### 1.4 Verificar Financeiro (Contas a Receber)
1.  Acesse o menu **Financeiro** -> aba **Contas a Receber**.
2.  Filtre pelo nome do cliente ou verifique o topo da lista.
    *   **Resultado Esperado:** 
        *   Um registro "Pendente" com o valor total da OS.
        *   Data de vencimento padrão (30 dias) ou conforme configurado.

### 1.5 Registrar Pagamento
1.  Na lista de **Contas a Receber**, localize a conta da OS.
2.  Clique no botão **Pagar** (ícone de cartão).
3.  Selecione o Método (ex: PIX) e Data.
4.  Confirme.
    *   **Resultado Esperado:** 
        *   Status da conta muda para **Pago**.
        *   Uma transação de entrada é criada na aba **Transações / Caixa**.
        *   Na visualização da OS, o status financeiro aparece como Pago.

---

## Cenário 2: Fluxo de Cancelamento e Estorno

### 2.1 Preparação
1.  Crie uma nova OS seguindo os passos 1.1 e 1.2 (não registre pagamento).

### 2.2 Cancelar OS
1.  Abra os detalhes da OS (Status: Aberta).
2.  Clique no botão **Cancelar OS** (ícone de proibido).
3.  Tente cancelar sem motivo.
    *   **Validação:** O sistema deve exigir um motivo.
4.  Digite o motivo "Teste de cancelamento" e confirme.
    *   **Resultado Esperado:** 
        *   Status da OS muda para **Cancelada**.
        *   Botões de edição/ação são bloqueados.

### 2.3 Verificar Estornos
1.  **Estoque:** Na aba **Estoque** da OS, verifique se há um novo movimento de "Entrada" (POSITIVE_ADJUSTMENT) com motivo "Estorno Cancelamento...". O saldo do produto deve ter sido restaurado.
2.  **Financeiro:** Em **Contas a Receber**, a conta vinculada deve estar com status **Cancelado**.
3.  **Orçamento:** O orçamento original deve ter voltado para o status **Rascunho** (ou Em Edição), permitindo novas alterações.

### 2.4 Auditoria
1.  Na OS Cancelada, vá para a aba **Auditoria** (ou Histórico).
    *   **Resultado Esperado:** Logs cronológicos mostrando: Criação -> Conversão -> Movimentação Estoque -> Cancelamento -> Estorno Estoque -> Estorno Financeiro.

---

## Cenário 3: Validações e Regras de Negócio

### 3.1 Tentativa de Cancelar com Pagamento
1.  Crie uma OS e registre o pagamento total (Cenário 1).
2.  Tente cancelar a OS.
    *   **Resultado Esperado:** Mensagem de erro informando que existem pagamentos registrados e que é necessário estornar o financeiro antes.

### 3.2 Estoque Insuficiente na Conversão
1.  Crie um orçamento com um produto cuja quantidade seja maior que o estoque atual.
2.  Aprove o orçamento.
3.  Tente Converter em OS.
    *   **Resultado Esperado:** A conversão falha. Uma mensagem de erro lista especificamente qual produto tem estoque insuficiente.

---

## Cenário 4: Relatórios e Dashboards

1.  Acesse **Dashboard**.
    *   Verifique se os contadores de "OS Abertas" e "Receita" refletem as ações dos testes anteriores.
2.  Acesse **Relatórios**.
    *   Gere o **Relatório de Ordens de Serviço** (PDF).
    *   Verifique se as OS criadas e canceladas aparecem com os status corretos.