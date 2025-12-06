# Feature Verification Checklist

## Core OS Management
- [x] **Numeric-only OS numbering**: Implemented via DB Sequence (Starts at 1001).
- [x] **Numeric-only Orcamento numbering**: Implemented via `budget_number` column.
- [x] **OS creation from Approved Orcamento**: Restricted via `validate_os_creation` RPC.
- [x] **OS read-only after creation**: UI disables edit inputs; Backend enforces structure.
- [x] **OS cancellation (not deletion)**: `cancel_service_order` RPC sets status to 'Cancelled'.

## Automation & Integrity
- [x] **Automatic accounts receivable creation**: Triggered inside `convert_budget_to_os`.
- [x] **Automatic stock deduction**: Triggered inside `convert_budget_to_os`.
- [x] **Stock restoration on cancellation**: Triggered inside `cancel_service_order`.
- [x] **Accounts receivable cancellation**: Status updates to 'Cancelled' automatically.
- [x] **Orcamento status management**: Updates to 'Converted' on success, reverts to 'Draft' on OS cancel.

## Financial
- [x] **Payment registration**: `RegisterPaymentDialog` handles partial/full payments.
- [x] **Invoice generation**: Placeholder for Invoice Number generation and PDF export.
- [x] **Dashboard metrics**: Real-time aggregations of Revenue and Costs.

## Reporting & Output
- [x] **WhatsApp/Email sending**: Integrated in OS Actions menu.
- [x] **OS printing**: Printer-friendly layout implemented in `PrintServiceOrder`.
- [x] **Reports**: Dedicated pages for Financial, Stock, and OS reports with filters.

## Audit & Security
- [x] **Audit trail for all actions**: `audit_log` table captures User ID, Action, and JSON Diff.
- [x] **Validation rules enforced**: 
    - Cannot create OS if stock low.
    - Cannot cancel OS if paid.
- [x] **Error handling**: Toasts provide clear feedback (e.g., "Estoque insuficiente").