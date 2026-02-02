#!/usr/bin/env node

/**
 * Development Mock Data Seeder
 * 
 * Creates a comprehensive set of mock data for development/testing
 * 
 * Children (5):
 * 1. Ella - 8 years old (born 2017-02-02)
 * 2. Matthew - 10 years old (born 2015-02-02) 
 * 3. Miguel - 7 years old (born 2018-02-02)
 * 4. Charlie - 4 years old (born 2021-02-02)
 * 5. Chekov - 8 months old (born 2024-06-02)
 * 
 * Default User: buckley with password you provide
 */

import { pool } from '../src/db/connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const MOCK_USER_EMAIL = 'buckley@dev.local';
const DEFAULT_PASSWORD = 'devpass123';

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function createMockFamilyAndUsers() {
  console.log('Creating mock family and users...');
  
  const familyId = uuidv4();
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  // Create family
  await pool.query(`
    INSERT INTO families (id, name, created_at, updated_at) 
    VALUES ($1, 'Mock Family', NOW(), NOW())
  `, [familyId]);
  
  // Create buckley user (main user)
  await pool.query(`
    INSERT INTO users (id, email, password_hash, role, created_at, updated_at) 
    VALUES ($1, $2, $3, 'parent', NOW(), NOW())
  `, [uuidv4(), MOCK_USER_EMAIL, hashedPassword]);
  
  // Create buckley family member
  await pool.query(`
    INSERT INTO family_members (user_id, family_id, role, created_at, updated_at) 
    VALUES ($1, $2, 'parent', NOW(), NOW())
  `, [uuidv4(), familyId]);
  
  return familyId;
}

async function createChildren(familyId) {
  console.log('Creating mock children...');
  
  const children = [
    {
      id: uuidv4(),
      name: 'Ella',
      gender: 'female',
      date_of_birth: '2017-02-02', // 8 years old from 2025-02-02
      birth_weight: 7.2,
      birth_weight_ounces: 3,
      birth_height: 20,
      avatar: 'default-girl.svg',
      family_id: familyId,
      created_at: new Date('2017-02-02T10:00:00Z').toISOString(),
      updated_at: new Date('2017-02-02T10:00:00Z').toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Matthew',
      gender: 'male',
      date_of_birth: '2015-02-02', // 10 years old from 2025-02-02
      birth_weight: 8.5,
      birth_weight_ounces: 14,
      birth_height: 22,
      avatar: 'default-boy.svg',
      family_id: familyId,
      created_at: new Date('2015-02-02T11:30:00Z').toISOString(),
      updated_at: new Date('2015-02-02T11:30:00Z').toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Miguel',
      gender: 'male',
      date_of_birth: '2018-02-02', // 7 years old from 2025-02-02
      birth_weight: 7.8,
      birth_weight_ounces: 6,
      birth_height: 21,
      avatar: 'default-boy.svg',
      family_id: familyId,
      created_at: new Date('2018-02-02T09:15:00Z').toISOString(),
      updated_at: new Date('2018-02-02T09:15:00Z').toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Charlie',
      gender: 'male',
      date_of_birth: '2021-02-02', // 4 years old from 2025-02-02
      birth_weight: 6.9,
      birth_weight_ounces: 2,
      birth_height: 19,
      avatar: 'default-boy.svg',
      family_id: familyId,
      created_at: new Date('2021-02-02T14:20:00Z').toISOString(),
      updated_at: new Date('2021-02-02T14:20:00Z').toISOString(),
    },
    {
      id: uuidv4(),
      name: 'Chekov',
      gender: 'male',
      date_of_birth: '2024-06-02', // 8 months old from 2025-02-02
      birth_weight: 8.1,
      birth_weight_ounces: 4,
      birth_height: 20,
      avatar: 'default-boy.svg',
      family_id: familyId,
      created_at: new Date('2024-06-02T16:45:00Z').toISOString(),
      updated_at: new Date('2024-06-02T16:45:00Z').toISOString(),
    },
  ];
  
  for (const child of children) {
    await pool.query(`
      INSERT INTO children (
        id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, 
        birth_height, avatar, family_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      child.id,
      child.name,
      child.gender,
      child.date_of_birth,
      child.birth_weight,
      child.birth_weight_ounces,
      child.birth_height,
      child.avatar,
      child.family_id,
    ]);
  }
  
  return children;
}

async function createVisits(children) {
  console.log('Creating mock wellness visits...');
  
  const baseDate = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD
  
  for (const child of children) {
    const ageInYears = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Wellness visits at key developmental milestones
    const wellnessVisits = [
      { date: `${ageInYears}Y-1W`, description: 'Newborn checkup', notes: 'Healthy newborn, feeding well' },
      { date: `${ageInYears}Y-2W`, description: 'First month checkup', notes: 'Good weight gain' },
      { date: `${ageInYears}Y-1M`, description: '2 month wellness', notes: 'Developmental milestones on track' },
      { date: `${ageInYears}Y-2M`, description: '4 month wellness', notes: 'Starting to respond to stimuli' },
      { date: `${ageInYears}Y-6M`, description: '6 month wellness', notes: 'Sitting up with support' },
      { date: `${ageInYears}Y-9M`, description: '9 month wellness', notes: 'Crawling and pulling up' },
      { date: `${ageInYears}Y-12M`, description: '12 month wellness', notes: 'First words, standing independently' },
      { date: `${ageInYears}Y-18M`, description: '18 month wellness', notes: 'Running and climbing' },
      { age: 2, description: '2 year wellness', notes: 'Toddler development progressing well' },
      { age: 3, description: '3 year wellness', notes: 'Preschool readiness assessment' },
      { age: 4, description: '4 year wellness', notes: 'Pre-K evaluation' },
      { age: 5, description: '5 year wellness', notes: 'Kindergarten preparation' },
      { age: 6, description: '6 year wellness', notes: 'Elementary school health check' },
    ];
    
    for (const visit of wellnessVisits) {
      const visitDate = typeof visit.date === 'string' 
        ? new Date(visit.date).toISOString().split('T')[0]
        : new Date(Date.now() - visit.age * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (new Date(visitDate) > new Date()) {
        continue; // Skip future visits
      }
      
      await pool.query(`
        INSERT INTO visits (
          id, child_id, visit_type, visit_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [uuidv4(), child.id, 'wellness', visitDate]);
      
      const visitId = await getLatestVisitId();
      
      // Add comprehensive measurements
      const ageInMonths = Math.floor(ageInYears * 12);
      const weight = Math.round(8 + ageInYears * 2 + Math.random() * 2); // Vary weight slightly
      const height = Math.round(20 + ageInYears * 2.5 + Math.random() * 1);
      
      await pool.query(`
        INSERT INTO measurements (
          id, visit_id, type, weight_value, height_value, head_circumference_value,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [uuidv4(), visitId, 'growth', weight, height, Math.round(40 + ageInMonths * 0.5)]);
      
      // Add notes to visit
      if (visit.notes) {
        await pool.query(`
          INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [uuidv4(), visitId, visit.notes]);
      }
    }
  }
}

async function createVisionExams(children) {
  console.log('Creating mock vision exams...');
  
  for (const child of children) {
    const ageInYears = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Vision exams starting at age 3
    if (ageInYears >= 3) {
      for (let year = 3; year <= ageInYears; year++) {
        const examDate = new Date(Date.now() - (ageInYears - year) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        await pool.query(`
          INSERT INTO visits (
            id, child_id, visit_type, visit_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [uuidv4(), child.id, 'vision', examDate]);
        
        const visitId = await getLatestVisitId();
        
        // Add vision measurements
        const visionAcuity = 20 - year * 0.5 + Math.random() * 5; // Declining vision over time
        const visionNotes = `Annual vision exam at age ${year}. Vision: ${visionAcuity}/20.`;
        
        await pool.query(`
          INSERT INTO measurements (
            id, visit_id, type, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [uuidv4(), visitId, 'vision', visionNotes]);
      }
    }
  }
}

async function createDentalVisits(children) {
  console.log('Creating mock dental visits...');
  
  for (const child of children) {
    const ageInYears = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Dental visits starting at age 2, biannually
    if (ageInYears >= 2) {
      for (let age = 2; age <= ageInYears; age += 0.5) {
        const dentalDate = new Date(Date.now() - (ageInYears - age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        await pool.query(`
          INSERT INTO visits (
            id, child_id, visit_type, visit_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [uuidv4(), child.id, 'dental', dentalDate]);
        
        const visitId = await getLatestVisitId();
        
        // Add dental notes
        const cleaningType = age % 1 === 0 ? 'Regular cleaning' : 'Deep cleaning';
        const dentalNotes = `Dental visit at age ${age}. ${cleaningType}. No cavities found.`;
        
        await pool.query(`
          INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [uuidv4(), visitId, dentalNotes]);
      }
    }
  }
}

async function createSprinkleIllnesses(children) {
  console.log('Creating mock illness history...');
  
  for (const child of children) {
    const ageInYears = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    const illnesses = [
      { type: 'cold', startAge: 0.5, duration: 7, severity: 3, description: 'Common cold with fever' },
      { type: 'flu', startAge: 1, duration: 10, severity: 4, description: 'Influenza with high fever' },
      { type: 'ear_infection', startAge: 1.5, duration: 5, severity: 3, description: 'Ear infection treated with antibiotics' },
      { type: 'stomach_bug', startAge: 2, duration: 3, severity: 2, description: '24-hour stomach bug' },
      { type: 'hand_foot_mouth', startAge: 3, duration: 14, severity: 2, description: 'Hand, foot, and mouth disease' },
      { type: 'allergic_reaction', startAge: 4, duration: 2, severity: 3, description: 'Allergic reaction to peanuts' },
    ];
    
    for (const illness of illnesses) {
      if (illness.startAge > ageInYears) {
        continue; // Skip illnesses that haven't happened yet
      }
      
      const startDate = new Date(Date.now() - (ageInYears - illness.startAge) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date(startDate.getTime() + illness.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await pool.query(`
        INSERT INTO illnesses (
          id, child_id, illness_type, start_date, end_date, severity, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [uuidv4(), child.id, illness.type, startDate, illness.duration > 0 ? endDate : null, illness.severity]);
      
      // Add illness notes
      await pool.query(`
        INSERT INTO illness_notes (id, illness_id, notes, created_at, updated_at) 
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [uuidv4(), uuidv4(), illness.description]);
    }
  }
}

async function createInjuries(children) {
  console.log('Creating mock injuries...');
  
  for (const child of children) {
    const ageInYears = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    const injuries = [
      { age: 2, type: 'fall', description: 'Fall from playground equipment', severity: 2 },
      { age: 3, type: 'cut', description: 'Cut from sharp object', severity: 1 },
      { age: 5, type: 'sports', description: 'Sports injury during soccer', severity: 3 },
      { age: 7, type: 'burn', description: 'Minor burn from hot surface', severity: 2 },
    ];
    
    for (const injury of injuries) {
      if (injury.age > ageInYears) {
        continue; // Skip future injuries
      }
      
      const injuryDate = new Date(Date.now() - (ageInYears - injury.age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await pool.query(`
        INSERT INTO visits (
          id, child_id, visit_type, visit_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [uuidv4(), child.id, 'injury', injuryDate]);
      
      const visitId = await getLatestVisitId();
      
      // Add injury notes
      await pool.query(`
        INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [uuidv4(), visitId, injury.description]);
    }
  }
}

async function createVaccines(children) {
  console.log('Creating mock vaccines...');
  
  for (const child of children) {
    const ageInYears = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Vaccines from wellness visits
    const vaccines = [
      { age: 0, name: 'Hepatitis B', description: 'HepB birth dose' },
      { age: 2, name: 'DTaP', description: 'Diphtheria, Tetanus, Pertussis' },
      { age: 4, name: 'MMR', description: 'Measles, Mumps, Rubella' },
      { age: 6, name: 'Flu Shot', description: 'Annual influenza vaccine' },
    ];
    
    for (const vaccine of vaccines) {
      if (vaccine.age > ageInYears) {
        continue; // Skip future vaccines
      }
      
      const vaccineDate = new Date(Date.now() - (ageInYears - vaccine.age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Add vaccines to wellness visits
      await pool.query(`
        INSERT INTO visits (
          id, child_id, visit_type, visit_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [uuidv4(), child.id, 'wellness', vaccineDate]);
      
      const visitId = await getLatestVisitId();
      
      await pool.query(`
        INSERT INTO vaccines_administered (
          id, visit_id, vaccine_name, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
      `, [uuidv4(), visitId, vaccine.name]);
      
      // Add vaccine notes
      await pool.query(`
        INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [uuidv4(), visitId, vaccine.description]);
    }
  }
}

async function getLatestVisitId() {
  const result = await pool.query('SELECT id FROM visits ORDER BY created_at DESC LIMIT 1');
  return result.rows[0]?.id || uuidv4();
}

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('This script should only be run in development mode');
    process.exit(1);
  }
  
  try {
    console.log('🌱 Starting mock data seeder...');
    console.log('👤 Default user: buckley@dev.local');
    console.log('🔑 Default password:', DEFAULT_PASSWORD);
    
    await pool.query('BEGIN');
    
    const familyId = await createMockFamilyAndUsers();
    const children = await createChildren(familyId);
    
    await createVisits(children);
    await createVisionExams(children);
    await createDentalVisits(children);
    await createSprinkleIllnesses(children);
    await createInjuries(children);
    await createVaccines(children);
    
    await pool.query('COMMIT');
    
    console.log('✅ Mock data seeded successfully!');
    console.log('📊 Created 5 children with comprehensive health history');
    console.log('🏥 Wellness, vision, dental, injury, illness data created');
    console.log('💉 Vaccines administered through wellness visits');
    console.log('📈 Growth metrics tracked over time');
    console.log('');
    console.log('You can now login with buckley@dev.local /', DEFAULT_PASSWORD);
    
  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    await pool.query('ROLLBACK');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();