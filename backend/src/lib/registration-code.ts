/**
 * First-user registration code: in-memory, generated on demand, logged only on server.
 * Single active code; cleared after first user is created.
 */

import crypto from 'crypto';

// Alphabet excluding ambiguous chars: 0, O, I, 1, l
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const CODE_LENGTH = 12; // without dashes; format XXXX-XXXX-XXXX

let activeCode: string | null = null;

function randomChar(): string {
  const i = crypto.randomInt(0, ALPHABET.length);
  return ALPHABET[i]!;
}

/**
 * Generate a new registration code (12 chars, format XXXX-XXXX-XXXX).
 * Stores in memory and logs to console (only place the code is printed).
 */
export function initializeRegistrationCode(): string {
  const parts: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    parts.push(randomChar());
    if (i === 3 || i === 7) parts.push('-');
  }
  const code = parts.join('');
  activeCode = code;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔐 FIRST USER REGISTRATION CODE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   ${code}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⚠️  This code is required to create the first user account.');
  console.log('⚠️  The code will be invalidated after the first user is created.');
  console.log('═══════════════════════════════════════════════════════════');

  return code;
}

/**
 * Validate the provided code against the active code.
 * Normalizes: strip dashes, uppercase.
 */
export function validateRegistrationCode(input: string): boolean {
  if (!activeCode) return false;
  const normalized = input.replace(/-/g, '').toUpperCase();
  const expected = activeCode.replace(/-/g, '').toUpperCase();
  return normalized.length === CODE_LENGTH && normalized === expected;
}

/**
 * Clear the active code (call after first user is created).
 */
export function clearRegistrationCode(): void {
  activeCode = null;
}

/**
 * True if a code has been generated and not yet used/cleared.
 */
export function isRegistrationCodeActive(): boolean {
  return activeCode !== null;
}
