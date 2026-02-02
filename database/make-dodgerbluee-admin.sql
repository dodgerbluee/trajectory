-- Make user dodgerbluee an instance admin. Run after the user has registered.
-- From host: docker compose exec database psql -U trajectory_user -d trajectory -f /scripts/make-dodgerbluee-admin.sql
-- Or: docker compose run make-admin
UPDATE users SET is_instance_admin = true WHERE username = 'dodgerbluee';
