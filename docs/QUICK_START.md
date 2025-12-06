# Quick Start Guide

## 1. Initial Setup
1.  Ensure the development server is running: `npm run dev`.
2.  Access the application at `http://localhost:3000`.
3.  Login with your credentials.

## 2. Standard Workflow

### Step 1: Create a Budget
*   Navigate to **Orçamentos**.
*   Click **Novo Orçamento**.
*   Select a Client and Vehicle.
*   Add Products and Services.
*   Save.
*   Open the menu on the row and click **Aprovar**.

### Step 2: Generate Service Order (OS)
*   On the Approved Budget, click **Converter em OS**.
*   *Note: The system will check stock availability automatically.*
*   Upon success, you are redirected to the OS list.

### Step 3: Execute Service
*   Navigate to **Ordens de Serviço**.
*   Click the **Eye Icon** to view details.
*   Use the **Imprimir** button to generate the worksheet for the mechanic.

### Step 4: Financial Settlement
*   Inside the OS Details, click **Receber**.
*   Confirm the amount and payment method.
*   The OS status may be updated to **Concluída**.

## 3. Handling Cancellations
*   If an OS was created by mistake:
    1.  Open OS Details.
    2.  Click **Cancelar OS**.
    3.  Provide a reason.
*   *Result:* Stock is returned, money requirement is voided, and the original budget becomes editable again.

## 4. Troubleshooting
*   **"Estoque Insuficiente"**: Go to **Produtos**, find the item, and use **Ajuste/Entrada** to add stock via Invoice or Manual Adjustment.
*   **Cannot Cancel**: Check if the OS has a payment marked as "Pago". You must cancel the payment in the **Financeiro** module first.