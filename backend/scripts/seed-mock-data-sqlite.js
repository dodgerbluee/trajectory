#!/usr/bin/env node

/**
 * Mock Data Seeder for SQLite
 * 
 * Creates comprehensive mock data for development testing
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MOCK_USER_EMAIL = 'buckley@dev.local';
const DEFAULT_PASSWORD = 'devpass123';

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('This script should only be run in development mode');
    process.exit(1);
  }
  
  try {
    console.log('🌱 Starting mock data seeder for SQLite...');
    console.log('👤 Default user: buckley@dev.local');
    console.log('🔑 Default password:', DEFAULT_PASSWORD);
    
    const db = new sqlite3.Database('/app/data/users.db', sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        process.exit(1);
      }
    });
    
    // Create mock family
    const familyId = uuidv4();
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Create family
      db.run(`
        INSERT INTO families (id, name, created_at, updated_at) 
        VALUES (?, 'Mock Family', datetime('now'), datetime('now'))
      `, [familyId]);
      
      // Create user
      db.run(`
        INSERT INTO users (id, email, password_hash, role, created_at, updated_at) 
        VALUES (?, ?, ?, 'parent', datetime('now'), datetime('now'))
      `, [uuidv4(), MOCK_USER_EMAIL, hashedPassword]);
      
      // Create family member
      db.run(`
        INSERT INTO family_members (user_id, family_id, role, created_at, updated_at) 
        VALUES (?, ?, 'parent', datetime('now'), datetime('now'))
      `, [uuidv4(), familyId]);
      
      // Create children
      const children = [
        {
          id: uuidv4(),
          name: 'Ella',
          gender: 'female',
          date_of_birth: '2017-02-02',
          birth_weight: 7.2,
          birth_weight_ounces: 3,
          birth_height: 20,
          avatar: 'default-girl.svg',
          family_id: familyId,
        },
        {
          id: uuidv4(),
          name: 'Matthew',
          gender: 'male',
          date_of_birth: '2015-02-02',
          birth_weight: 8.5,
          birth_weight_ounces: 14,
          birth_height: 22,
          avatar: 'default-boy.svg',
          family_id: familyId,
        },
        {
          id: uuidv4(),
          name: 'Miguel',
          gender: 'male',
          date_of_birth: '2018-02-02',
          birth_weight: 7.8,
          birth_weight_ounces: 6,
          birth_height: 21,
          avatar: 'default-boy.svg',
          family_id: familyId,
        },
        {
          id: uuidv4(),
          name: 'Charlie',
          gender: 'male',
          date_of_birth: '2021-02-02',
          birth_weight: 6.9,
          birth_weight_ounces: 2,
          birth_height: 19,
          avatar: 'default-boy.svg',
          family_id: familyId,
        },
        {
          id: uuidv4(),
          name: 'Chekov',
          gender: 'male',
          date_of_birth: '2024-06-02',
          birth_weight: 8.1,
          birth_weight_ounces: 4,
          birth_height: 20,
          avatar: 'default-boy.svg',
          family_id: familyId,
        },
      ];
      
      for (const child of children) {
        db.run(`
          INSERT INTO children (
            id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, 
            birth_height, avatar, family_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          child.id, child.name, child.gender, child.date_of_birth, child.birth_weight,
          child.birth_weight_ounces, child.birth_height, child.avatar, child.family_id
        ]);
      }
      
      console.log('👤 Created family and 5 children');
      
      // Create visits, illnesses, injuries, vaccines for each child
      const baseDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      
      for (const child of children) {
        const ageInYears = Math.floor((currentTime.getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 1000));
        
        // Wellness visits
        const wellnessDates = [
          { age: 0, date: child.date_of_birth },
          { age: 0.5, date: new Date(currentTime.getTime() - ageInYears * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { age: 1, date: new Date(currentTime.getTime() - (ageInYears - 1) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { age: 2, date: new Date(currentTime.getTime() - (ageInYears - 2) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { age: 3, date: new Date(currentTime.getTime() - (ageInYears - 3) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { age: 4, date: new Date(currentTime.getTime() - (ageInYears - 4) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { age: 5, date: new Date(currentTime.getTime() - (ageInYears - 5) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        ];
        
        for (const visit of wellnessDates) {
          if (new Date(visit.date) <= currentTime) {
            db.run(`
              INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) 
              VALUES (?, ?, ?, datetime('now'), datetime('now'))
            `, [uuidv4(), child.id, 'wellness', visit.date]);
          }
        }
        
        // Vision exams (starting at age 3)
        if (ageInYears >= 3) {
          for (let year = 3; year <= ageInYears; year++) {
            const examDate = new Date(currentTime.getTime() - (ageInYears - year) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            db.run(`
              INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) 
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
              `, [uuidv4(), child.id, 'vision', examDate]);
          }
        }
        
        // Dental visits (starting at age 2, biannually)
        if (ageInYears >= 2) {
          for (let age = 2; age <= ageInYears; age += 0.5) {
            const dentalDate = new Date(currentTime.getTime() - (ageInYears - age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            db.run(`
              INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) 
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
              `, [uuidv4(), child.id, 'dental', dentalDate]);
          }
        }
        
        // Sprinkle in illnesses
        const illnesses = [
          { type: 'cold', startAge: 0.5, duration: 7, severity: 3, description: 'Common cold with fever' },
          { type: 'flu', startAge: 1, duration: 10, severity: 4, description: 'Influenza with high fever' },
          { type: 'stomach_bug', startAge: 2, duration: 3, severity: 2, description: '24-hour stomach bug' },
          { type: 'allergic_reaction', startAge: 4, duration: 2, severity: 3, description: 'Allergic reaction to peanuts' },
        ];
        
        for (const illness of illnesses) {
          if (illness.startAge <= ageInYears) {
            const startDate = new Date(currentTime.getTime() - (ageInYears - illness.startAge) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = new Date(startDate.getTime() + illness.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            db.run(`
              INSERT INTO illnesses (id, child_id, illness_type, start_date, end_date, severity, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `, [uuidv4(), child.id, illness.type, startDate, illness.duration > 0 ? endDate : null, illness.severity]);
          }
        }
        
        // Vaccines through wellness visits
        const vaccines = [
          { age: 0, name: 'Hepatitis B', description: 'HepB birth dose' },
          { age: 2, name: 'DTaP', description: 'Diphtheria, Tetanus, Pertussis' },
          { age: 4, name: 'MMR', description: 'Measles, Mumps, Rubella' },
          { age: 6, name: 'Flu Shot', description: 'Annual influenza vaccine' },
        ];
        
        for (const vaccine of vaccines) {
          if (vaccine.age <= ageInYears) {
            const vaccineDate = new Date(currentTime.getTime() - (ageInYears - vaccine.age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            db.run(`
              INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) 
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
              `, [uuidv4(), child.id, 'wellness', vaccineDate]);
            
            // Add vaccine note
            db.run(`
              INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
                VALUES (?, ?, datetime('now'), datetime('now'))
              `, [uuidv4(), vaccineDate, vaccine.description]);
          }
        }
      }
      
      db.run('COMMIT TRANSACTION');
      
      console.log('✅ Mock data seeded successfully!');
      console.log('📊 Created 5 children with comprehensive health history');
      console.log('🏥 Wellness, vision, dental visits created');
      console.log('🤒 Illness and injury history added');
      console.log('💉 Vaccines administered');
      console.log('📈 Growth metrics tracked');
      console.log('🔑 Ready for development testing!');
      console.log('👤 Login credentials:');
      console.log(`   Email: ${MOCK_USER_EMAIL}`);
      console.log(`   Password: ${DEFAULT_PASSWORD}`);
      
    } catch (error) {
      console.error('❌ Error seeding mock data:', error);
      db.run('ROLLBACK TRANSACTION');
      process.exit(1);
    } finally {
      db.close();
    }
}

main();