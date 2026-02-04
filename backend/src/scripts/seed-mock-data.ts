#!/usr/bin/env node

/**
 * Development Mock Data Seeder
 *
 * Creates mock data for development/testing.
 *
 * Usage (inside Docker):
 *   docker compose exec app node dist/scripts/seed-mock-data.js [options]
 *
 * Usage (local development):
 *   npx tsx src/scripts/seed-mock-data.ts [options]
 *
 * Options:
 *   --clear      Clear existing data before seeding
 *   --username   Set custom username for login (default: dev)
 *   --password   Set custom password (default: devpass123)
 *   --help       Show this help message
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables (for local dev; Docker sets them directly)
dotenv.config();

const { Pool } = pg;

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const clearData = args.includes('--clear');
const passwordIdx = args.indexOf('--password');
const usernameIdx = args.indexOf('--username');

const DEFAULT_PASSWORD = passwordIdx >= 0 && args[passwordIdx + 1] ? args[passwordIdx + 1] : 'devpass123';
const MOCK_USERNAME = usernameIdx >= 0 && args[usernameIdx + 1] ? args[usernameIdx + 1] : 'dev';
const MOCK_USER_EMAIL = `${MOCK_USERNAME}@test.local`;

if (showHelp) {
  console.log(`
Mock Data Seeder - Creates development test data

Usage:
  Docker:  docker compose exec app node dist/scripts/seed-mock-data.js [options]
  Local:   npx tsx src/scripts/seed-mock-data.ts [options]

Options:
  --clear      Clear existing mock data before seeding
  --username   Set custom username for login (default: dev)
  --password   Set custom password (default: devpass123)
  --help       Show this help message

Examples:
  docker compose exec app node dist/scripts/seed-mock-data.js
  docker compose exec app node dist/scripts/seed-mock-data.js --clear
  docker compose exec app node dist/scripts/seed-mock-data.js --username admin --password secret
`);
  process.exit(0);
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper functions
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function getAgeInYears(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getAgeInMonths(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

// Clear existing data
async function clearMockData() {
  console.log('🗑️  Clearing existing data...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete in order respecting foreign keys
    await client.query('DELETE FROM audit_events');
    await client.query('DELETE FROM visit_attachments');
    await client.query('DELETE FROM measurement_attachments');
    await client.query('DELETE FROM child_attachments');
    await client.query('DELETE FROM illness_illness_types');
    await client.query('DELETE FROM illnesses');
    await client.query('DELETE FROM visit_illnesses');
    await client.query('DELETE FROM visits');
    await client.query('DELETE FROM measurements');
    await client.query('DELETE FROM medical_events');
    await client.query('DELETE FROM children');
    await client.query('DELETE FROM family_invites');
    await client.query('DELETE FROM family_members');
    await client.query('DELETE FROM families');
    await client.query('DELETE FROM user_sessions');
    await client.query('DELETE FROM password_reset_tokens');
    await client.query('DELETE FROM login_attempts');
    await client.query('DELETE FROM users');

    await client.query('COMMIT');
    console.log('   ✓ Existing data cleared');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Create user and family
async function createUserAndFamily(): Promise<{ userId: number; familyId: number }> {
  console.log('👤 Creating user and family...');

  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  // Create user
  const userResult = await pool.query(`
    INSERT INTO users (email, password_hash, username, email_verified, onboarding_completed)
    VALUES ($1, $2, $3, true, true)
    RETURNING id
  `, [MOCK_USER_EMAIL, hashedPassword, MOCK_USERNAME]);
  const userId = userResult.rows[0].id;

  // Create family
  const familyResult = await pool.query(`
    INSERT INTO families (name)
    VALUES ($1)
    RETURNING id
  `, ['Development Family']);
  const familyId = familyResult.rows[0].id;

  // Link user to family as owner
  await pool.query(`
    INSERT INTO family_members (family_id, user_id, role)
    VALUES ($1, $2, 'owner')
  `, [familyId, userId]);

  console.log(`   ✓ User: ${MOCK_USERNAME}`);
  console.log(`   ✓ Family ID: ${familyId}`);

  return { userId, familyId };
}

// Child data
interface ChildData {
  id?: number;
  name: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  birth_weight: number;
  birth_weight_ounces: number;
  birth_height: number;
}

// Create children
async function createChildren(familyId: number): Promise<ChildData[]> {
  console.log('👶 Creating children...');

  const children: ChildData[] = [
    { name: 'Ella', gender: 'female', date_of_birth: '2017-02-02', birth_weight: 7.2, birth_weight_ounces: 3, birth_height: 20 },
    { name: 'Matthew', gender: 'male', date_of_birth: '2015-02-02', birth_weight: 8.5, birth_weight_ounces: 14, birth_height: 22 },
    { name: 'Miguel', gender: 'male', date_of_birth: '2018-02-02', birth_weight: 7.8, birth_weight_ounces: 6, birth_height: 21 },
    { name: 'Charlie', gender: 'male', date_of_birth: '2021-02-02', birth_weight: 6.9, birth_weight_ounces: 2, birth_height: 19 },
    { name: 'Chekov', gender: 'male', date_of_birth: '2024-06-02', birth_weight: 8.1, birth_weight_ounces: 4, birth_height: 20.5 },
  ];

  for (const child of children) {
    const result = await pool.query(`
      INSERT INTO children (family_id, name, gender, date_of_birth, birth_weight, birth_weight_ounces, birth_height)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [familyId, child.name, child.gender, child.date_of_birth, child.birth_weight, child.birth_weight_ounces, child.birth_height]);
    child.id = result.rows[0].id;

    const age = getAgeInYears(child.date_of_birth);
    console.log(`   ✓ ${child.name} (${child.gender}, ${age} years old)`);
  }

  return children;
}

// Create wellness visits
async function createWellnessVisits(children: ChildData[]) {
  console.log('🏥 Creating wellness visits...');

  const wellnessMilestones = [
    { monthsAge: 0, title: 'Newborn', vaccines: ['Hepatitis B (1st dose)'] },
    { monthsAge: 1, title: '1 Month', vaccines: [] },
    { monthsAge: 2, title: '2 Month', vaccines: ['DTaP (1st)', 'IPV (1st)', 'Hib (1st)', 'PCV13 (1st)', 'Rotavirus (1st)'] },
    { monthsAge: 4, title: '4 Month', vaccines: ['DTaP (2nd)', 'IPV (2nd)', 'Hib (2nd)', 'PCV13 (2nd)', 'Rotavirus (2nd)'] },
    { monthsAge: 6, title: '6 Month', vaccines: ['DTaP (3rd)', 'Hepatitis B (2nd)', 'Influenza'] },
    { monthsAge: 9, title: '9 Month', vaccines: [] },
    { monthsAge: 12, title: '12 Month', vaccines: ['MMR (1st)', 'Varicella (1st)', 'Hepatitis A (1st)', 'PCV13 (4th)'] },
    { monthsAge: 15, title: '15 Month', vaccines: ['Hib (4th)', 'DTaP (4th)'] },
    { monthsAge: 18, title: '18 Month', vaccines: ['Hepatitis A (2nd)'] },
    { monthsAge: 24, title: '2 Year', vaccines: ['Influenza'] },
    { monthsAge: 36, title: '3 Year', vaccines: ['Influenza'] },
    { monthsAge: 48, title: '4 Year', vaccines: ['DTaP (5th)', 'IPV (4th)', 'MMR (2nd)', 'Varicella (2nd)'] },
    { monthsAge: 60, title: '5 Year', vaccines: ['Influenza'] },
    { monthsAge: 72, title: '6 Year', vaccines: ['Influenza'] },
    { monthsAge: 84, title: '7 Year', vaccines: ['Influenza'] },
    { monthsAge: 96, title: '8 Year', vaccines: ['Influenza'] },
    { monthsAge: 108, title: '9 Year', vaccines: ['Influenza'] },
    { monthsAge: 120, title: '10 Year', vaccines: ['Influenza', 'Tdap'] },
  ];

  let visitCount = 0;
  const today = new Date();

  for (const child of children) {
    const dob = new Date(child.date_of_birth);
    const ageInMonths = getAgeInMonths(child.date_of_birth);

    for (const milestone of wellnessMilestones) {
      if (milestone.monthsAge > ageInMonths) continue;

      const visitDate = new Date(dob);
      visitDate.setMonth(visitDate.getMonth() + milestone.monthsAge);
      if (visitDate > today) continue;

      const visitDateStr = visitDate.toISOString().split('T')[0];
      const ageYears = milestone.monthsAge / 12;
      const weight = child.birth_weight + (ageYears * 5) + randomInRange(-0.5, 0.5);
      const height = child.birth_height + (ageYears * 2.5) + randomInRange(-0.3, 0.3);
      const headCirc = milestone.monthsAge < 36 ? 35 + (milestone.monthsAge * 0.3) + randomInRange(-0.2, 0.2) : null;

      await pool.query(`
        INSERT INTO visits (
          child_id, visit_date, visit_type, title, location, doctor_name,
          weight_value, weight_percentile, height_value, height_percentile,
          head_circumference_value, head_circumference_percentile,
          vaccines_administered, notes
        ) VALUES ($1, $2, 'wellness', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        child.id, visitDateStr, milestone.title, 'Pediatric Associates', 'Dr. Smith',
        Math.round(weight * 10) / 10, randomInRange(25, 75),
        Math.round(height * 10) / 10, randomInRange(25, 75),
        headCirc ? Math.round(headCirc * 10) / 10 : null, headCirc ? randomInRange(25, 75) : null,
        milestone.vaccines.length > 0 ? milestone.vaccines.join(',') : null,
        `${milestone.title} wellness checkup. Development on track.`,
      ]);
      visitCount++;
    }
  }
  console.log(`   ✓ Created ${visitCount} wellness visits`);
}

// Create vision visits
async function createVisionVisits(children: ChildData[]) {
  console.log('👁️  Creating vision visits...');
  let visitCount = 0;

  for (const child of children) {
    const age = getAgeInYears(child.date_of_birth);
    if (age < 3) continue;

    for (let examAge = 3; examAge <= age; examAge++) {
      const examDate = new Date(child.date_of_birth);
      examDate.setFullYear(examDate.getFullYear() + examAge);
      examDate.setMonth(examDate.getMonth() + 6);
      if (examDate > new Date()) continue;

      const needsGlasses = examAge >= 6 && Math.random() > 0.7;

      await pool.query(`
        INSERT INTO visits (child_id, visit_date, visit_type, location, doctor_name, vision_prescription, needs_glasses, ordered_glasses, notes)
        VALUES ($1, $2, 'vision', $3, $4, $5, $6, $7, $8)
      `, [
        child.id, examDate.toISOString().split('T')[0], 'Vision Care Center', 'Dr. Johnson',
        needsGlasses ? `OD: -${randomInRange(0.5, 2.0)} OS: -${randomInRange(0.5, 2.0)}` : '20/20',
        needsGlasses, needsGlasses,
        `Annual vision exam at age ${examAge}.${needsGlasses ? ' Glasses prescribed.' : ' Vision normal.'}`,
      ]);
      visitCount++;
    }
  }
  console.log(`   ✓ Created ${visitCount} vision visits`);
}

// Create dental visits
async function createDentalVisits(children: ChildData[]) {
  console.log('🦷 Creating dental visits...');
  let visitCount = 0;

  for (const child of children) {
    const age = getAgeInYears(child.date_of_birth);
    if (age < 2) continue;

    for (let visitAge = 2; visitAge <= age; visitAge += 0.5) {
      const visitDate = new Date(child.date_of_birth);
      visitDate.setFullYear(visitDate.getFullYear() + Math.floor(visitAge));
      visitDate.setMonth(visitDate.getMonth() + (visitAge % 1 === 0 ? 3 : 9));
      if (visitDate > new Date()) continue;

      const isCheckup = visitAge % 1 === 0;
      const cavitiesFound = Math.random() > 0.8 ? Math.floor(Math.random() * 2) + 1 : 0;

      await pool.query(`
        INSERT INTO visits (child_id, visit_date, visit_type, location, doctor_name, dental_procedure_type, cleaning_type, cavities_found, cavities_filled, xrays_taken, fluoride_treatment, sealants_applied, notes)
        VALUES ($1, $2, 'dental', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        child.id, visitDate.toISOString().split('T')[0], 'Happy Smiles Dentistry', 'Dr. Lee',
        isCheckup ? 'Checkup & Cleaning' : 'Cleaning', isCheckup ? 'Regular' : 'Prophylaxis',
        cavitiesFound, cavitiesFound, isCheckup && visitAge >= 4, true, visitAge >= 6 && Math.random() > 0.5,
        `${isCheckup ? 'Biannual checkup' : 'Cleaning'}.${cavitiesFound > 0 ? ` ${cavitiesFound} cavities filled.` : ' No cavities.'}`,
      ]);
      visitCount++;
    }
  }
  console.log(`   ✓ Created ${visitCount} dental visits`);
}

// Create sick visits
async function createSickVisits(children: ChildData[]) {
  console.log('🤒 Creating sick visits...');
  const illnessTypes = ['flu', 'cold', 'strep', 'ear_infection', 'stomach_bug', 'rsv', 'croup', 'pink_eye'];
  let visitCount = 0;

  for (const child of children) {
    const age = getAgeInYears(child.date_of_birth);
    const numSickVisits = Math.max(2, Math.floor(age * 2.5));

    for (let i = 0; i < numSickVisits; i++) {
      const daysAgo = Math.floor(Math.random() * (age * 365));
      const visitDate = getDateDaysAgo(daysAgo);
      if (new Date(visitDate) < new Date(child.date_of_birth)) continue;

      const illnessType = illnessTypes[Math.floor(Math.random() * illnessTypes.length)];
      const hasFever = Math.random() > 0.3;
      const temp = hasFever ? randomInRange(100.4, 103.5) : null;

      const result = await pool.query(`
        INSERT INTO visits (child_id, visit_date, visit_type, location, doctor_name, symptoms, temperature, illness_start_date, notes)
        VALUES ($1, $2, 'sick', $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        child.id, visitDate, 'Pediatric Associates', 'Dr. Smith',
        `${illnessType.replace('_', ' ')} symptoms`, temp,
        addDays(visitDate, -Math.floor(Math.random() * 3)),
        `Sick visit for ${illnessType.replace('_', ' ')}.${hasFever ? ` Fever of ${temp}°F.` : ''}`,
      ]);

      await pool.query(`INSERT INTO visit_illnesses (visit_id, illness_type) VALUES ($1, $2)`, [result.rows[0].id, illnessType]);
      visitCount++;
    }
  }
  console.log(`   ✓ Created ${visitCount} sick visits`);
}

// Create standalone illnesses
async function createIllnesses(children: ChildData[]) {
  console.log('🤧 Creating illness records...');
  const illnessTypes = ['flu', 'cold', 'strep', 'ear_infection', 'stomach_bug', 'hand_foot_mouth', 'covid'];
  let illnessCount = 0;

  for (const child of children) {
    const age = getAgeInYears(child.date_of_birth);
    const numIllnesses = Math.floor(Math.random() * 4) + 3;

    for (let i = 0; i < numIllnesses; i++) {
      const daysAgo = Math.floor(Math.random() * (age * 365));
      const startDate = getDateDaysAgo(daysAgo);
      if (new Date(startDate) < new Date(child.date_of_birth)) continue;

      const duration = Math.floor(Math.random() * 10) + 3;
      const illnessType = illnessTypes[Math.floor(Math.random() * illnessTypes.length)];
      const severity = Math.floor(Math.random() * 7) + 2;
      const hasFever = Math.random() > 0.4;

      const result = await pool.query(`
        INSERT INTO illnesses (child_id, start_date, end_date, symptoms, temperature, severity, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        child.id, startDate, addDays(startDate, duration),
        `${illnessType.replace('_', ' ')} - general discomfort`,
        hasFever ? randomInRange(100.0, 103.0) : null, severity,
        `Recovered after ${duration} days.`,
      ]);

      await pool.query(`INSERT INTO illness_illness_types (illness_id, illness_type) VALUES ($1, $2)`, [result.rows[0].id, illnessType]);
      illnessCount++;
    }
  }
  console.log(`   ✓ Created ${illnessCount} illness records`);
}

// Create standalone measurements
async function createMeasurements(children: ChildData[]) {
  console.log('📏 Creating growth measurements...');
  let measurementCount = 0;

  for (const child of children) {
    const dob = new Date(child.date_of_birth);
    const today = new Date();
    const ageInMonths = getAgeInMonths(child.date_of_birth);

    // Monthly for first 2 years, then quarterly
    const intervals = ageInMonths <= 24
      ? Array.from({ length: Math.min(ageInMonths, 24) }, (_, i) => i + 1)
      : Array.from({ length: 24 }, (_, i) => i + 1).concat(
          Array.from({ length: Math.floor((ageInMonths - 24) / 3) }, (_, i) => 24 + (i + 1) * 3)
        );

    for (const monthAge of intervals) {
      const measureDate = new Date(dob);
      measureDate.setMonth(measureDate.getMonth() + monthAge);
      if (measureDate > today) continue;

      const ageYears = monthAge / 12;
      const weight = child.birth_weight + (ageYears * 5) + randomInRange(-0.3, 0.3);
      const height = child.birth_height + (ageYears * 2.5) + randomInRange(-0.2, 0.2);
      const headCirc = monthAge < 36 ? 35 + (monthAge * 0.3) + randomInRange(-0.1, 0.1) : null;

      await pool.query(`
        INSERT INTO measurements (child_id, measurement_date, label, weight_value, weight_percentile, height_value, height_percentile, head_circumference_value, head_circumference_percentile)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        child.id, measureDate.toISOString().split('T')[0], `${monthAge} month`,
        Math.round(weight * 10) / 10, randomInRange(20, 80),
        Math.round(height * 10) / 10, randomInRange(20, 80),
        headCirc ? Math.round(headCirc * 10) / 10 : null, headCirc ? randomInRange(20, 80) : null,
      ]);
      measurementCount++;
    }
  }
  console.log(`   ✓ Created ${measurementCount} measurements`);
}

// Main execution
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Mock Data Seeder for Trajectory                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    console.log(`📦 Connected to database: ${result.rows[0].db}\n`);

    if (clearData) {
      await clearMockData();
      console.log('');
    }

    const { familyId } = await createUserAndFamily();
    const children = await createChildren(familyId);
    console.log('');

    await createWellnessVisits(children);
    await createVisionVisits(children);
    await createDentalVisits(children);
    await createSickVisits(children);
    await createIllnesses(children);
    await createMeasurements(children);

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ✅ Seeding Complete!                       ║
╚═══════════════════════════════════════════════════════════════╝

🔑 Login credentials:
   Username: ${MOCK_USERNAME}
   Password: ${DEFAULT_PASSWORD}

👶 Children created:
${children.map(c => `   • ${c.name} (${getAgeInYears(c.date_of_birth)} years old)`).join('\n')}
`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
