/**
 * Family-based access: children belong to a family; only family members can see a child's data.
 * For now: one family per user. Later: multiple users can be members of the same family.
 */

import { query } from '../db/connection.js';

/**
 * Return family IDs the user is a member of (for filtering children).
 */
export async function getFamilyIdsForUser(userId: number): Promise<number[]> {
  const result = await query<{ family_id: number }>(
    'SELECT family_id FROM family_members WHERE user_id = $1',
    [userId]
  );
  return result.rows.map((r) => r.family_id);
}

/**
 * Return child IDs the user can access (for filtering visits, illnesses, etc.).
 */
export async function getAccessibleChildIds(userId: number): Promise<number[]> {
  const familyIds = await getFamilyIdsForUser(userId);
  if (familyIds.length === 0) return [];
  const result = await query<{ id: number }>(
    'SELECT id FROM children WHERE family_id = ANY($1::int[])',
    [familyIds]
  );
  return result.rows.map((r) => r.id);
}

/**
 * Return the user's default family ID (e.g. for creating a new child).
 * Creates a family and adds the user as owner if they have none.
 */
export async function getOrCreateDefaultFamilyForUser(userId: number): Promise<number> {
  const existing = await query<{ family_id: number }>(
    'SELECT family_id FROM family_members WHERE user_id = $1 AND role = $2 LIMIT 1',
    [userId, 'owner']
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].family_id;
  }
  const insert = await query<{ id: number }>(
    `INSERT INTO families (name) VALUES ('My Family') RETURNING id`
  );
  const familyId = insert.rows[0].id;
  await query(
    'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
    [familyId, userId, 'owner']
  );
  return familyId;
}

/**
 * True if the user can access the child (is in the child's family).
 */
export async function canAccessChild(userId: number, childId: number): Promise<boolean> {
  const result = await query<{ family_id: number }>(
    `SELECT c.family_id FROM children c
     INNER JOIN family_members fm ON fm.family_id = c.family_id
     WHERE c.id = $1 AND fm.user_id = $2`,
    [childId, userId]
  );
  return result.rows.length > 0;
}

export type FamilyRole = 'owner' | 'parent' | 'read_only';

/**
 * User's role in the family, or null if not a member.
 */
export async function getFamilyRole(userId: number, familyId: number): Promise<FamilyRole | null> {
  const result = await query<{ role: string }>(
    'SELECT role FROM family_members WHERE user_id = $1 AND family_id = $2',
    [userId, familyId]
  );
  const row = result.rows[0];
  if (!row || !['owner', 'parent', 'read_only'].includes(row.role)) return null;
  return row.role as FamilyRole;
}

/**
 * True if the user can edit the family (owner or parent; read_only cannot edit).
 */
export async function canEditFamily(userId: number, familyId: number): Promise<boolean> {
  const role = await getFamilyRole(userId, familyId);
  return role === 'owner' || role === 'parent';
}

/**
 * Family ID for a child, or null if child does not exist.
 */
export async function getFamilyIdForChild(childId: number): Promise<number | null> {
  const result = await query<{ family_id: number }>(
    'SELECT family_id FROM children WHERE id = $1',
    [childId]
  );
  return result.rows[0]?.family_id ?? null;
}

/**
 * True if the user can edit the child (is owner or parent in the child's family).
 */
export async function canEditChild(userId: number, childId: number): Promise<boolean> {
  const familyId = await getFamilyIdForChild(childId);
  if (familyId == null) return false;
  return canEditFamily(userId, familyId);
}
