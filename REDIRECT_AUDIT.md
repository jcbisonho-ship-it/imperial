# Relatório de Auditoria: Redirecionamentos de Orçamento

Após a remoção do redirecionamento no Dashboard (`DashboardHome.jsx` e `QuickActions.jsx`), o padrão `/orcamentos?action=new` ou lógica similar de redirecionamento ainda pode estar presente nos seguintes arquivos, que devem ser verificados e refatorados para abrir o modal diretamente:

## 1. Lógica de Recepção (Onde o redirecionamento acontece)
*   **`src/pages/Orcamentos.jsx`**: Este é o arquivo principal. Ele provavelmente contém um `useEffect` que verifica `useSearchParams` (ex: `action === 'new'`) e abre o modal automaticamente ao carregar a página. Esta lógica deve ser removida ou ajustada se você deseja eliminar completamente esse comportamento.

## 2. Gatilhos de Redirecionamento (Botões que levam para a URL)
Estes componentes provavelmente contêm `navigate('/orcamentos?action=new...')`:

*   **`src/components/clientes/ClientesList.jsx`**
    *   *Local Provável:* Menu de ações (três pontinhos) na tabela de clientes -> Botão "Novo Orçamento".
    *   *Ação Necessária:* Substituir `navigate` por uma prop ou contexto para abrir o modal `BudgetDialog`.

*   **`src/components/veiculos/VeiculosList.jsx`**
    *   *Local Provável:* Menu de ações na tabela de veículos -> Botão "Novo Orçamento".
    *   *Ação Necessária:* Substituir `navigate` por uma prop ou contexto para abrir o modal.

*   **`src/components/layout/Topbar.jsx`**
    *   *Local Provável:* Se houver um botão global de "+" ou "Novo" no cabeçalho superior.
    *   *Ação Necessária:* Alterar para abrir o modal globalmente.

*   **`src/components/dashboard/ServiceOrders.jsx`** ou **`src/pages/OS.jsx`**
    *   *Local Provável:* Botões de conversão ou criação cruzada (embora menos comum criar Orçamento a partir de OS, o inverso é mais frequente).

## Resumo
Para eliminar completamente o redirecionamento, a estratégia recomendada é:
1.  Refatorar `src/pages/Orcamentos.jsx` para não depender da URL para abrir o modal.
2.  Atualizar as listas de Clientes e Veículos para usarem um Modal local ou um Contexto Global de criação.