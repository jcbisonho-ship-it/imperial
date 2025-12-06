-- TEST DATA FIXTURES
-- Run this SQL script in the Supabase SQL Editor to populate your database with test data.

-- 1. Create a Test Customer
INSERT INTO public.customers (id, name, email, phone, cpf, address)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'João da Silva (Teste)', 'joao.teste@example.com', '11999999999', '12345678900', 'Rua dos Testes, 123')
ON CONFLICT (id) DO NOTHING;

-- 2. Create a Test Vehicle linked to Customer
INSERT INTO public.vehicles (id, customer_id, plate, brand, model, year, color)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEST-1234', 'Toyota', 'Corolla', '2022', 'Prata')
ON CONFLICT (id) DO NOTHING;

-- 3. Create a Test Product (Oil)
INSERT INTO public.products (id, description, code_internal, category, product_type, unit_of_measure)
VALUES 
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Óleo Sintético 5W30', 'OLEO-001', 'Lubrificantes', 'simples', 'L')
ON CONFLICT (id) DO NOTHING;

-- 4. Create Product Variant with Stock
INSERT INTO public.product_variants (id, product_id, variant_code, stock, cost_price, sale_price, min_stock, margin_pct)
VALUES 
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'OLEO-5W30-1L', 100, 25.00, 50.00, 10, 100)
ON CONFLICT (id) DO NOTHING;

-- 5. Create a Test Service
INSERT INTO public.servicos (id, nome, valor_referencia, tempo_duracao_minutos)
VALUES 
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Troca de Óleo', 80.00, 30)
ON CONFLICT (id) DO NOTHING;

-- 6. Create an Approved Budget (Ready for OS Conversion)
INSERT INTO public.budgets (id, customer_id, vehicle_id, customer_name, vehicle_description, total_cost, status, created_at, budget_number)
VALUES 
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'João da Silva (Teste)', 'Toyota Corolla (TEST-1234)', 180.00, 'approved', now(), nextval('seq_budget_number'))
ON CONFLICT (id) DO NOTHING;

-- 7. Add Items to Budget
INSERT INTO public.budget_items (id, budget_id, item_type, description, quantity, unit_price, total_price, product_id, product_variant_id)
VALUES
    (uuid_generate_v4(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'product', 'Óleo Sintético 5W30 (OLEO-5W30-1L)', 2, 50.00, 100.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'),
    (uuid_generate_v4(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'service', 'Troca de Óleo', 1, 80.00, 80.00, null, null);