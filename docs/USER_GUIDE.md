# Manual do Usuário - Oficina PRO

Bem-vindo ao sistema de gestão Oficina PRO. Este manual aborda as operações diárias para gerenciar orçamentos, ordens de serviço, estoque e financeiro.

---

## 1. Orçamentos

### Criando um Orçamento
1.  No menu lateral, clique em **Orçamentos**.
2.  Clique no botão **+ Novo Orçamento**.
3.  **Veículo/Cliente**: Digite a placa do veículo e clique em "Buscar". Se o veículo já estiver cadastrado, os dados do cliente serão preenchidos automaticamente.
4.  **Itens**:
    *   Use a seção "Peças" para adicionar produtos. O sistema busca pelo nome ou código e mostra o estoque atual.
    *   Use a seção "Serviços" para mão de obra.
5.  Clique em **Salvar Orçamento**.

### Aprovando e Convertendo
1.  Um orçamento inicia como "Rascunho" ou "Pendente".
2.  Para aprovar, clique no menu de opções (três pontos) na linha do orçamento e selecione **Aprovar**.
3.  Uma vez aprovado, aparecerá a opção **Converter em OS**. Clique nela para gerar a Ordem de Serviço oficial. Isso baixará automaticamente o estoque das peças.

---

## 2. Ordens de Serviço (OS)

### Acessando uma OS
1.  Vá para o menu **Ordens de Serviço**.
2.  Você verá uma lista com Nº OS, Cliente, Veículo e Status.
3.  Clique em qualquer linha para abrir os **Detalhes da OS**.

### Visualizando Informações
Dentro da OS, você tem abas:
*   **Detalhes**: Informações gerais e lista de itens.
*   **Estoque**: Histórico de peças que saíram do estoque para esta OS.
*   **Auditoria**: Registro de quem criou, modificou ou cancelou a OS.

### Cancelando uma OS
Se houve um erro ou o serviço foi cancelado:
1.  Abra a OS (ela deve estar com status "Aberta").
2.  Clique no botão vermelho **Cancelar OS** no topo.
3.  Informe o motivo obrigatório.
4.  O sistema irá devolver as peças ao estoque e cancelar a cobrança automaticamente.

---

## 3. Financeiro

### Recebendo Pagamentos
1.  Vá para o menu **Financeiro** -> **Contas a Receber**.
2.  Localize a conta pelo número da OS ou nome do cliente.
3.  Clique no botão verde **Pagar** (ícone de cartão).
4.  Confirme a data e o método de pagamento. A conta passará para "Pago".

### Relatórios
1.  Acesse o menu **Relatórios**.
2.  Escolha entre relatórios de **OS**, **Financeiro** ou **Estoque**.
3.  Defina o período (Data Inicial e Final).
4.  Clique em **Gerar** para ver na tela ou **Exportar PDF** para salvar o arquivo.

---

## 4. Estoque

### Movimentação Manual
1.  Vá para o menu **Produtos/Estoque**.
2.  Localize o produto (clique na seta para ver as variantes/modelos).
3.  Clique em **Ajuste/Saída** para correções manuais ou **Entrada** para registrar chegada de novas peças via Nota Fiscal.

---

## Resolução de Problemas Comuns

*   **Erro "Estoque Insuficiente" ao criar OS**: Verifique se você tem a quantidade necessária das peças no menu Produtos. Faça uma "Entrada" de estoque se necessário.
*   **Não consigo cancelar a OS**: Verifique se já existe um pagamento registrado ("Pago") para esta OS. Se sim, você deve primeiro ir no Financeiro e estornar/cancelar o pagamento antes de cancelar a OS.
*   **Veículo não encontrado na busca**: Certifique-se de que o veículo foi previamente cadastrado no menu "Veículos" e vinculado a um cliente.