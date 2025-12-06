# Regras de Negócio e Validações

Este documento define as regras rígidas impostas pelo sistema para garantir a integridade dos dados operacionais e financeiros.

## 1. Orçamentos e Conversão
*   **BR-001 (Status do Orçamento)**: Uma OS só pode ser gerada a partir de um orçamento com status **"Aprovado"**. Rascunhos ou orçamentos pendentes não podem ser convertidos.
*   **BR-002 (Validação de Estoque)**: O sistema impede a criação de OS se qualquer item do orçamento (tipo "Produto") não tiver estoque suficiente disponível. O usuário deve dar entrada no estoque antes de prosseguir.
*   **BR-003 (Bloqueio de Edição)**: Uma vez convertido em OS, o orçamento original torna-se somente leitura ("Converted") e não pode mais ser alterado diretamente.

## 2. Ordens de Serviço (OS)
*   **BR-004 (Imutabilidade)**: Uma OS criada não pode ter seus itens editados diretamente. Isso garante que o estoque baixado e o valor financeiro gerado permaneçam consistentes. Correções devem ser feitas via Cancelamento e recriação, ou via funcionalidades específicas de aditivo (se implementadas futuramente).
*   **BR-005 (Numeração Sequencial)**: Toda OS recebe um número sequencial único (Ex: 1001, 1002) gerado pelo banco de dados, garantindo rastreabilidade contábil.

## 3. Cancelamento de OS
*   **BR-006 (Restrição de Status)**: Apenas OS com status **"Aberta"** podem ser canceladas. OS "Concluída" ou já "Cancelada" não permitem essa ação.
*   **BR-007 (Dependência Financeira)**: Não é possível cancelar uma OS que possua registros financeiros com status **"Pago"**. O sistema exige que o pagamento seja estornado no módulo Financeiro antes do cancelamento da OS.
*   **BR-008 (Estorno Automático)**: O cancelamento de uma OS **obrigatoriamente** dispara o estorno de estoque de todos os itens (tipo SALE -> POSITIVE_ADJUSTMENT) e o cancelamento das contas a receber pendentes.

## 4. Financeiro
*   **BR-009 (Geração Automática)**: Contas a receber são geradas automaticamente no momento da criação da OS.
*   **BR-010 (Transações de Caixa)**: O registro de um pagamento em "Contas a Receber" gera automaticamente um registro imutável na tabela de "Transações" (Fluxo de Caixa).

## 5. Auditoria
*   **BR-011 (Rastreabilidade)**: Todas as mudanças de status de OS, baixas de estoque e registros financeiros devem ter um log de auditoria associado ao usuário que realizou a ação e carimbo de data/hora.