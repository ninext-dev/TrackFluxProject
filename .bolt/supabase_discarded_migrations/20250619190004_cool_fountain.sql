-- Criar política para permitir leitura no bucket pcp-results
INSERT INTO storage.policies (
  id,
  bucket_id,
  name,
  definition,
  check_definition,
  command,
  roles
) VALUES (
  gen_random_uuid(),
  'pcp-results',
  'Allow authenticated users to read files',
  'auth.role() = ''authenticated''',
  'auth.role() = ''authenticated''',
  'SELECT',
  '{authenticated}'
);

-- Alternativamente, se você quiser permitir acesso anônimo também:
-- INSERT INTO storage.policies (
--   id,
--   bucket_id,
--   name,
--   definition,
--   check_definition,
--   command,
--   roles
-- ) VALUES (
--   gen_random_uuid(),
--   'pcp-results',
--   'Allow public read access',
--   'true',
--   'true',
--   'SELECT',
--   '{authenticated,anon}'
-- );