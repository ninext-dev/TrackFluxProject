/*
  # Add graphics permission to user_permissions

  1. Changes
    - Add graphics permission to existing admin users
    - This ensures admin users can access the graphics module
*/

-- Insert graphics permission for admin users
INSERT INTO user_permissions (user_id, module)
SELECT id, 'graphics'
FROM auth.users
WHERE email = 'admin@reforpan.com'
AND NOT EXISTS (
  SELECT 1 FROM user_permissions 
  WHERE user_id = auth.users.id 
  AND module = 'graphics'
);