/**
 * Instance admin: users with is_instance_admin can manage other users and instance settings.
 */

import { query } from '../db/connection.js';

/**
 * Returns true if the user has instance admin privilege.
 */
export async function getIsInstanceAdmin(userId: number): Promise<boolean> {
  const result = await query<{ is_instance_admin: boolean }>(
    'SELECT is_instance_admin FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.is_instance_admin === true;
}
