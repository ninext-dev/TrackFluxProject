-- Script para criar dados de teste para a gráfica
-- Execute este script no Supabase SQL Editor

-- 1. Inserir departamento PA Gráfica se não existir
INSERT INTO classifications (name, type) 
VALUES ('PA Gráfica', 'DEPARTMENT')
ON CONFLICT (type, name) DO NOTHING;

-- 2. Obter o ID do departamento PA Gráfica
DO $$
DECLARE
    dept_id uuid;
    product_id_1 uuid;
    product_id_2 uuid;
    product_id_3 uuid;
    day_id_1 uuid;
    day_id_2 uuid;
    day_id_3 uuid;
BEGIN
    -- Obter ID do departamento
    SELECT id INTO dept_id FROM classifications WHERE name = 'PA Gráfica' AND type = 'DEPARTMENT';
    
    -- 3. Inserir produtos de teste
    INSERT INTO products (code, name, brand, department_id, unit_of_measure, is_active)
    VALUES 
        ('GRAF001', 'Embalagem Plástica Premium', 'Lejor', dept_id, 'UN', true),
        ('GRAF002', 'Rótulo Adesivo Colorido', 'Reforpan', dept_id, 'UN', true),
        ('GRAF003', 'Sacola Personalizada', 'Lejor', dept_id, 'UN', true)
    ON CONFLICT (code) DO NOTHING
    RETURNING id;
    
    -- Obter IDs dos produtos
    SELECT id INTO product_id_1 FROM products WHERE code = 'GRAF001';
    SELECT id INTO product_id_2 FROM products WHERE code = 'GRAF002';
    SELECT id INTO product_id_3 FROM products WHERE code = 'GRAF003';
    
    -- 4. Inserir dias de produção gráfica
    INSERT INTO graphics_production_days (date)
    VALUES 
        (CURRENT_DATE - INTERVAL '5 days'),
        (CURRENT_DATE - INTERVAL '3 days'),
        (CURRENT_DATE - INTERVAL '1 day')
    ON CONFLICT (date) DO NOTHING;
    
    -- Obter IDs dos dias
    SELECT id INTO day_id_1 FROM graphics_production_days WHERE date = CURRENT_DATE - INTERVAL '5 days';
    SELECT id INTO day_id_2 FROM graphics_production_days WHERE date = CURRENT_DATE - INTERVAL '3 days';
    SELECT id INTO day_id_3 FROM graphics_production_days WHERE date = CURRENT_DATE - INTERVAL '1 day';
    
    -- 5. Inserir produções gráficas de teste
    INSERT INTO graphics_productions (
        graphics_production_day_id,
        product_id,
        quantity,
        status,
        billing_status,
        unit_cost,
        total_cost
    )
    VALUES 
        (day_id_1, product_id_1, 1500, 'COMPLETED', 'BILLED', 2.50, 3750.00),
        (day_id_1, product_id_2, 800, 'COMPLETED', 'BILLED', 1.80, 1440.00),
        (day_id_2, product_id_2, 1200, 'COMPLETED', 'NOT_BILLED', 1.80, 2160.00),
        (day_id_2, product_id_3, 600, 'PENDING', 'NOT_BILLED', 3.20, 1920.00),
        (day_id_3, product_id_1, 2000, 'COMPLETED', 'BILLED', 2.50, 5000.00),
        (day_id_3, product_id_3, 900, 'COMPLETED', 'NOT_BILLED', 3.20, 2880.00)
    ON CONFLICT DO NOTHING;
    
END $$;

-- Verificar os dados inseridos
SELECT 
    gp.id,
    gpd.date,
    p.code,
    p.name,
    gp.quantity,
    gp.unit_cost,
    gp.total_cost,
    gp.status,
    gp.billing_status
FROM graphics_productions gp
JOIN graphics_production_days gpd ON gp.graphics_production_day_id = gpd.id
JOIN products p ON gp.product_id = p.id
JOIN classifications c ON p.department_id = c.id
WHERE c.name = 'PA Gráfica'
ORDER BY gpd.date DESC, p.name;