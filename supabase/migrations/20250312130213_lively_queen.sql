/*
  # Add Graphics Departments

  1. New Classifications
    - Add PA Gráfica department
    - Add MP Tinta Gráfica department
    - Add MP Filme Gráfica department

  2. Notes
    - These departments are required for the graphics production system
    - Ensures department lookups don't fail
*/

-- Insert graphics departments if they don't exist
INSERT INTO classifications (name, type)
SELECT 'PA Gráfica', 'DEPARTMENT'
WHERE NOT EXISTS (
  SELECT 1 FROM classifications 
  WHERE name = 'PA Gráfica' AND type = 'DEPARTMENT'
);

INSERT INTO classifications (name, type)
SELECT 'MP Tinta Gráfica', 'DEPARTMENT'
WHERE NOT EXISTS (
  SELECT 1 FROM classifications 
  WHERE name = 'MP Tinta Gráfica' AND type = 'DEPARTMENT'
);

INSERT INTO classifications (name, type)
SELECT 'MP Filme Gráfica', 'DEPARTMENT'
WHERE NOT EXISTS (
  SELECT 1 FROM classifications 
  WHERE name = 'MP Filme Gráfica' AND type = 'DEPARTMENT'
);