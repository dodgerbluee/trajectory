-- Make trajectory user an admin
UPDATE users SET is_instance_admin = true WHERE username = 'trajectory';