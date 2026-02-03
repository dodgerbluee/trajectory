-- Mock Data Seeder SQL Script
-- Creates comprehensive mock data for development testing

-- Create family
INSERT INTO families (id, name, created_at, updated_at) 
VALUES (gen_random_uuid(), 'Mock Family', NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create user (buckley@dev.local)
-- Note: In production, you'd hash a real password
INSERT INTO users (id, email, password_hash, role, created_at, updated_at) 
VALUES (gen_random_uuid(), 'buckley@dev.local', crypt('devpass123', 'bcrypt'), 'parent', NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create family member
INSERT INTO family_members (user_id, family_id, role, created_at, updated_at) 
VALUES (gen_random_uuid(), gen_random_uuid(), 'parent', NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create Ella (8 years old, born 2017-02-02)
INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'Ella', 'female', '2017-02-02', 7.2, 3, 20, 'default-girl.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create Matthew (10 years old, born 2015-02-02)
INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'Matthew', 'male', '2015-02-02', 8.5, 14, 22, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create Miguel (7 years old, born 2018-02-02)
INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'Miguel', 'male', '2018-02-02', 7.8, 6, 21, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create Charlie (4 years old, born 2021-02-02)
INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'Charlie', 'male', '2021-02-02', 6.9, 2, 19, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Create Chekov (8 months old, born 2024-06-02)
INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'Chekov', 'male', '2024-06-02', 8.1, 4, 20, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;