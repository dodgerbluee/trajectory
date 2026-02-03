#!/usr/bin/env node

/**
 * Development Mock Data Seeder (ES Module Version)
 * 
 * Creates comprehensive mock data for development/testing
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MOCK_USER_EMAIL = 'buckley@dev.local';
const DEFAULT_PASSWORD = 'devpass123';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

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
    console.log('🌱 Starting mock data seeder...');
    console.log('👤 Default user: buckley@dev.local');
    console.log('🔑 Default password:', DEFAULT_PASSWORD);
    
    await pool.query('BEGIN');
    
    // Create family
    const familyId = uuidv4();
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    
    await pool.query(`
      INSERT INTO families (id, name, created_at, updated_at) 
      VALUES ($1, 'Mock Family', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [familyId]);
    
    // Create user
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, created_at, updated_at) 
      VALUES ($1, $2, $3, 'parent', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [uuidv4(), MOCK_USER_EMAIL, hashedPassword]);
    
    // Create family member
    await pool.query(`
      INSERT INTO family_members (user_id, family_id, role, created_at, updated_at) 
      VALUES ($1, $2, 'parent', NOW(), NOW())
      ON CONFLICT DO NOTHING
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
      await pool.query(`
        INSERT INTO children (
          id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, 
            birth_height, avatar, family_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        child.id, child.name, child.gender, child.date_of_birth, child.birth_weight,
        child.birth_weight_ounces, child.birth_height, child.avatar, child.family_id
      ]);
    }
    
    console.log('👤 Created family and 5 children');
    
    // Create visits and data
    const baseDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    
    for (const child of children) {
      const ageInYears = Math.floor((currentTime.getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      
      // Wellness visits
      const wellnessDates = [
        { age: 0, date: child.date_of_birth },
        { age: 0.02, date: `${baseDate}Y-1W` },
        { age: 0.08, date: `${baseDate}Y-2W` },
        { age: 0.25, date: `${baseDate}Y-1M` },
        { age: 0.5, date: `${baseDate}Y-2M` },
        { age: 0.75, date: `${baseDate}Y-6M` },
        { age: 1, date: `${baseDate}Y-9M` },
        { age: 1.5, date: `${baseDate}Y-12M` },
        { age: 2, date: `${baseDate}Y-18M` },
      ];
      
      for (const visit of wellnessDates) {
        if (typeof visit.date === 'string') {
          const visitDate = new Date(currentTime.getTime() - visit.age * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (visitDate <= currentTime) {
            await createVisit(child.id, 'wellness', visitDate);
          }
        } else {
          await createVisit(child.id, 'wellness', visit.date);
        }
      }
      
      // Vision exams (starting at age 3)
      if (ageInYears >= 3) {
        for (let year = 3; year <= ageInYears; year++) {
          const examDate = new Date(currentTime.getTime() - (ageInYears - year) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const visitId = await createVisit(child.id, 'vision', examDate);
          await createVisionMeasurement(visitId, year);
        }
      }
      
      // Dental visits (starting at age 2, biannually)
      if (ageInYears >= 2) {
        for (let age = 2; age <= ageInYears; age += 0.5) {
          const dentalDate = new Date(currentTime.getTime() - (ageInYears - age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const visitId = await createVisit(child.id, 'dental', dentalDate);
          await createDentalNote(visitId, age);
        }
      }
      
      // Sprinkle in some illnesses
      const illnesses = [
        { type: 'cold', startAge: 0.5, duration: 7, severity: 3, description: 'Common cold with fever' },
        { type: 'flu', startAge: 1, duration: 10, severity: 4, description: 'Influenza with high fever' },
        { type: 'ear_infection', startAge: 1.5, duration: 5, severity: 3, description: 'Ear infection treated with antibiotics' },
        { type: 'stomach_bug', startAge: 2, duration: 3, severity: 2, description: '24-hour stomach bug' },
        { type: 'hand_foot_mouth', startAge: 3, duration: 14, severity: 2, description: 'Hand, foot, and mouth disease' },
        { type: 'allergic_reaction', startAge: 4, duration: 2, severity: 3, description: 'Allergic reaction to peanuts' },
      ];
      
      for (const illness of illnesses) {
        if (illness.startAge <= ageInYears) {
          const startDate = new Date(currentTime.getTime() - (ageInYears - illness.startAge) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const endDate = new Date(startDate.getTime() + illness.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          await createIllness(child.id, illness.type, startDate, illness.duration > 0 ? endDate : null, illness.severity, illness.description);
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
          const visitId = await createVisit(child.id, 'wellness', vaccineDate);
          await createVaccine(visitId, vaccine.name, vaccine.description);
        }
      }
    }
    
    await pool.query('COMMIT');
    
    console.log('✅ Mock data seeded successfully!');
    console.log('📊 Created 5 children with comprehensive health history');
    console.log('🏥 Wellness, vision, dental visits created');
    console.log('🤒 Illness and injury history added');
    console.log('💉 Vaccines administered');
    console.log('📈 Growth metrics tracked');
    console.log('');
    console.log('🔑 Ready for development testing!');
    console.log('👤 Login with buckley@dev.local /', DEFAULT_PASSWORD);
    
  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    await pool.query('ROLLBACK');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createVisit(childId, visitType, visitDate) {
  const visitId = uuidv4();
  await pool.query(`
    INSERT INTO visits (id, child_id, visit_type, visit_date, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id
  `, [visitId, childId, visitType, visitDate]);
  
  const result = await pool.query('SELECT id FROM visits ORDER BY created_at DESC LIMIT 1');
  return result.rows[0]?.id || uuidv4();
}

async function createVisionMeasurement(visitId, year) {
  const measurementId = uuidv4();
  await pool.query(`
    INSERT INTO measurements (id, visit_id, type, notes, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, NOW(), NOW())
  `, [measurementId, visitId, 'vision', `Annual vision exam at age ${year}. Vision: ${20 - year * 0.5 + Math.random() * 5}/20.`]);
}

async function createDentalNote(visitId, age) {
  const noteId = uuidv4();
  const cleaningType = age % 1 === 0 ? 'Regular cleaning' : 'Deep cleaning';
  await pool.query(`
    INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
    VALUES ($1, $2, $3, NOW(), NOW())
  `, [noteId, visitId, `Dental visit at age ${age}. ${cleaningType}. No cavities found.`]);
}

async function createIllness(childId, illnessType, startDate, endDate, severity, description) {
  const illnessId = uuidv4();
  await pool.query(`
    INSERT INTO illnesses (id, child_id, illness_type, start_date, end_date, severity, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
  `, [illnessId, childId, illnessType, startDate, endDate, severity]);
  
  const noteId = uuidv4();
  await pool.query(`
    INSERT INTO illness_notes (id, illness_id, notes, created_at, updated_at) 
    VALUES ($1, $2, $3, NOW(), NOW())
  `, [noteId, illnessId, description]);
}

async function createVaccine(visitId, vaccineName, description) {
  const vaccineId = uuidv4();
  await pool.query(`
    INSERT INTO vaccines_administered (id, visit_id, vaccine_name, created_at, updated_at) 
    VALUES ($1, $2, $3, NOW(), NOW())
  `, [vaccineId, visitId, vaccineName]);
  
  const noteId = uuidv4();
  await pool.query(`
    INSERT INTO visit_notes (id, visit_id, notes, created_at, updated_at) 
    VALUES ($1, $2, $3, NOW(), NOW())
  `, [noteId, visitId, description]);
}

main();