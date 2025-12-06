# Product Schema Snapshot

## 1. Parent Table: public.products
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | uuid | PK |
| name | text | |
| category | text | |
| subcategory | text | **NEW** |
| aplicacao | text | |
| exchange_interval_km | integer | **NEW** |
| exchange_interval_months | integer | **NEW** |
| observations | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## 2. Child Table: public.product_variants
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | uuid | PK |
| product_id | uuid | FK |
| brand | text | |
| sku | text | |
| barcode | text | **NEW** (Unique) |
| location | text | **NEW** |
| ncm | text | **NEW** |
| cross_codes | text | **NEW** |
| stock | integer | |
| min_stock | integer | |
| cost_price | numeric | |
| sale_price | numeric | |
| margin_pct | numeric | |
| created_at | timestamp | |
| updated_at | timestamp | |

## 3. Changes Log
- **2025-11-25**: Added `barcode`, `location`, `ncm`, `cross_codes` to `product_variants`.
- **2025-11-25**: Added `subcategory`, `exchange_interval_km`, `exchange_interval_months` to `products`.