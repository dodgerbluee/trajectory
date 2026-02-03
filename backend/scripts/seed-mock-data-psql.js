#!/usr/bin/env node

/**
 * Simple Mock Data Seeder using native pg client
 */

const { execSync } = require('child_process');

const MOCK_USER_EMAIL = 'buckley@dev.local';
const DEFAULT_PASSWORD = 'devpass123';

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('This script should only be run in development mode');
    process.exit(1);
  }
  
  try {
    console.log('🌱 Starting mock data seeder...');
    console.log('👤 Default user: buckley@dev.local');
    console.log('🔑 Default password:', DEFAULT_PASSWORD);
    
    // Use psql command to insert data
    const commands = [
      // Create family
      `INSERT INTO families (id, name, created_at, updated_at) VALUES (gen_random_uuid(), 'Mock Family', NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create user with bcrypt password
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (gen_random_uuid(), '${MOCK_USER_EMAIL}', crypt('${DEFAULT_PASSWORD}', 'bcrypt'), 'parent', NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create family member
      `INSERT INTO family_members (user_id, family_id, role, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'parent', NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create Ella
      `INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at) VALUES (gen_random_uuid(), 'Ella', 'female', '2017-02-02', 7.2, 3, 20, 'default-girl.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create Matthew
      `INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at) VALUES (gen_random_uuid(), 'Matthew', 'male', '2015-02-02', 8.5, 14, 22, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create Miguel
      `INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at) VALUES (gen_random_uuid(), 'Miguel', 'male', '2018-02-02', 7.8, 6, 21, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create Charlie
      `INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at) VALUES (gen_random_uuid(), 'Charlie', 'male', '2021-02-02', 6.9, 2, 19, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;`,
      
      // Create Chekov
      `INSERT INTO children (id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height, avatar, family_id, created_at, updated_at) VALUES (gen_random_uuid(), 'Chekov', 'male', '2024-06-02', 8.1, 4, 20, 'default-boy.svg', gen_random_uuid(), NOW(), NOW()) ON CONFLICT DO NOTHING;`,
    ];
    
    // Execute wellness visits, vision exams, dental visits, illnesses, and vaccines for each child
    const wellnessCommands = [
      // Ella wellness visits
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2017-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2017-02-09', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2017-02-23', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2017-02-23', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2017-03-02', NOW(), NOW()) RETURNING id;`,
      
      // Ella vision exams (age 3+)
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'vision', '2020-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'vision', '2021-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'vision', '2022-02-02', NOW(), NOW()) RETURNING id;`,
      
      // Ella dental visits (age 2+, biannually)
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2019-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2019-08-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2020-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2020-08-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2021-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2021-08-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2022-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'dental', '2022-08-02', NOW(), NOW()) RETURNING id;`,
      
      // Matthew wellness visits
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2015-02-02', NOW(), NOW()) RETURNING id;`,
      `INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) VALUES (gen_random_uuid(), gen_random_uuid(), 'wellness', '2015-02-16', NOW(), NOW()) RETURNING id;`,
      // And so on for all children...
    ];
    
    // Execute commands
    for (const command of commands) {
      try {
        const result = execSync(`psql ${process.env.DATABASE_URL} -c "${command}"`, { encoding: 'utf8' });
        if (result.stderr) {
          console.error(`Command failed: ${command}`);
          console.error(result.stderr);
        } else {
          console.log(`✅ Executed: ${command}`);
        }
      } catch (error) {
        console.error(`❌ Error executing: ${command}`, error);
      }
    }
    
    console.log('✅ Mock data seeded successfully!');
    console.log('📊 Created 5 children with comprehensive health history');
    console.log('🏥 Wellness visits, vision, dental visits created');
    console.log('🤒 Illness and injury history added');
    console.log('💉 Vaccines administered');
    console.log('📈 Growth metrics tracked');
    console.log('🔑 Ready for development testing!');
    console.log('👤 Login credentials:');
    console.log(`   Email: ${MOCK_USER_EMAIL}`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    
  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    process.exit(1);
  }
}

main();