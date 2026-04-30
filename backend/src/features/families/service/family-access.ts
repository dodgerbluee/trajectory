/**
 * Family-based access: children belong to a family; only family members can see a child's data.
 * For now: one family per user. Later: multiple users can be members of the same family.
 */

import { query } from '../../../db/connection.js';

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
 * Lookup helper: family + self-owner for a child row.
 */
async function getChildAccessRow(
  childId: number
): Promise<{ family_id: number; user_id: number | null } | null> {
  const result = await query<{ family_id: number; user_id: number | null }>(
    'SELECT family_id, user_id FROM children WHERE id = $1',
    [childId]
  );
  return result.rows[0] ?? null;
}

/**
 * True if the user can edit medical data on the child (visits, illnesses,
 * measurements, attachments, etc.).
 *
 * Policy: any owner/parent in the family can write medical data — including
 * for self-rows belonging to other adult family members. (See
 * canEditChildIdentity / canDeleteChild for the stricter checks that apply
 * to identity fields and deletion of self-rows.)
 */
export async function canEditChild(userId: number, childId: number): Promise<boolean> {
  const familyId = await getFamilyIdForChild(childId);
  if (familyId == null) return false;
  return canEditFamily(userId, familyId);
}

/**
 * True if the user can edit identity fields on the child (name, date_of_birth,
 * gender, avatar, notes).
 *
 * Policy: for a self-row (children.user_id IS NOT NULL) only the owning user
 * may edit identity. For a child (user_id IS NULL) any family owner/parent
 * may edit identity, matching the legacy behavior.
 */
export async function canEditChildIdentity(userId: number, childId: number): Promise<boolean> {
  const row = await getChildAccessRow(childId);
  if (row == null) return false;
  if (row.user_id != null) {
    return row.user_id === userId;
  }
  return canEditFamily(userId, row.family_id);
}

/**
 * True if the user can delete the child row.
 *
 * Policy: a self-row (children.user_id IS NOT NULL) may only be deleted by
 * the owning user — deleting it cascades all of that user's medical history.
 * A child row (user_id IS NULL) may be deleted by any family owner/parent.
 */
export async function canDeleteChild(userId: number, childId: number): Promise<boolean> {
  const row = await getChildAccessRow(childId);
  if (row == null) return false;
  if (row.user_id != null) {
    return row.user_id === userId;
  }
  return canEditFamily(userId, row.family_id);
}

/**
 * True if the user can export data (owner or parent in at least one family).
 * Read-only members cannot export.
 */
export async function canExportData(userId: number): Promise<boolean> {
  const result = await query<{ role: string }>(
    `SELECT role FROM family_members WHERE user_id = $1 AND role IN ('owner', 'parent') LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Create a self-child row for a user: a children row with user_id pointing
 * back to the user. Returns the new child id, or null if the user already
 * has a self-row (race-safe via ON CONFLICT against the children_user_id_unique
 * constraint). Callers should treat null as "already exists" and respond 409.
 *
 * Family selection mirrors getOrCreateDefaultFamilyForUser(): owner > new family.
 *
 * Called by the "do you want a profile for yourself?" prompt and by the
 * Family-page "Add yourself" entry.
 */
export async function createSelfChildForUser(
  userId: number,
  fields: {
    name: string;
    date_of_birth: string; // YYYY-MM-DD
    gender: 'male' | 'female';
    notes?: string | null;
  }
): Promise<number | null> {
  const familyId = await getOrCreateDefaultFamilyForUser(userId);
  const inserted = await query<{ id: number }>(
    `INSERT INTO children (family_id, user_id, name, date_of_birth, gender, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING id`,
    [familyId, userId, fields.name, fields.date_of_birth, fields.gender, fields.notes ?? null]
  );
  return inserted.rows[0]?.id ?? null;
}
