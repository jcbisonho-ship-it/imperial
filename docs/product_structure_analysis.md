# Product Structure Analysis & Report

## 1. Executive Summary
**Recommendation: IMPROVE EXISTING**

The current system architecture is **structurally sound** and follows the "Parent-Child" pattern (Generic Part -> Specific Brands/SKUs) which is the industry standard for auto parts inventory management. Building from scratch is unnecessary and would be counter-productive. The current system only requires **schema expansion** (adding columns) to meet all your requirements.

## 2. Current Structure Analysis

### Database Schema (Current)
The system currently uses a normalized 1:N relationship:
*   **Parent Table (`public.products`)**: Represents the "Generic Concept" of the part.
    *   *Columns:* `id`, `name`, `category`, `aplicacao` (Application), `observations`, `created_at`, `updated_at`.
    *   *Purpose:* Groups identical parts from different manufacturers under one search term (e.g., "Pastilha de Freio Gol G5").
*   **Child Table (`public.product_variants`)**: Represents the "Physical Item" in stock.
    *   *Columns:* `id`, `product_id`, `brand`, `sku`, `stock`, `cost_price`, `sale_price`, `min_stock`, `margin_pct`, `created_at`, `updated_at`.
    *   *Purpose:* Tracks specific inventory, costs, and codes for each brand (e.g., Bosch vs. Fras-le).

### Frontend Implementation
*   **`ProdutosList.jsx`**: Implements a collapsible table. The main row shows the Generic Product (`products`), and expanding it reveals the specific stock items (`product_variants`). This is excellent for finding parts by application.
*   **`ProdutoDialog.jsx`**: Allows creating the parent grouping and adding multiple variants simultaneously.

## 3. Gap Analysis (Requirements vs. Reality)

| Requirement | Status | Context / Action Needed |
| :--- | :--- | :--- |
| **Product Types (Unique vs Parent)** | ✅ **Supported** | System handles "Unique" products as a Parent with exactly 1 Variant. "Parent" products have >1 Variant. No logic change needed. |
| **Variants/Children** | ✅ **Implemented** | Native support via `product_variants` table. |
| **Category** | ✅ **Implemented** | Exists in `products` table. |
| **Application** | ✅ **Implemented** | Exists as `aplicacao` (text) in `products`. |
| **Margin, Cost, Min Stock** | ✅ **Implemented** | Exist in `product_variants`. |
| **Brand/Marca** | ✅ **Implemented** | Exists in `product_variants`. |
| **Barcode (EAN)** | ❌ **MISSING** | Needs column in `product_variants`. |
| **Location (Shelf/Row)** | ❌ **MISSING** | Needs column in `product_variants` to find item in warehouse. |
| **Subcategory** | ❌ **MISSING** | Needs column in `products` for better filtering. |
| **NCM** | ❌ **MISSING** | Needs column (Tax classification). Usually per variant, but often consistent per product. Best in `product_variants`. |
| **Cross Codes (Ref. Cruzada)** | ❌ **MISSING** | Needs column in `product_variants` to store equivalent codes (e.g., "F-123" = "W-999"). |
| **Exchange Interval** | ❌ **MISSING** | Needs column in `products` (e.g., "10,000km" or "6 months"). |

## 4. Technical Implementation Plan

To reach the "Required State", we should execute the following steps:

1.  **Database Migration:**
    Run SQL to add the missing columns: