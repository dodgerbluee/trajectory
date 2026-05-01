/**
 * Helpers for ordering profile lists (people + adults) shown on Home.
 *
 * Adults (18+) are pushed to the end of the avatar row / family grid, so the
 * primary focus stays on people. Within each group (kids, adults) the
 * original relative order is preserved — Array.prototype.sort with a stable
 * compare function keeps insertion order for ties (modern JS sorts are
 * guaranteed stable).
 *
 * "Adult" is determined purely by date_of_birth (≥18 years). This catches
 * self-rows (the account holder), spouse profiles, and any other adult
 * family-member profile without depending on user_id presence.
 */

import type { Person } from '@shared/types/api';
import { calculateAge } from '@lib/date-utils';

const ADULT_AGE_YEARS = 18;

/** Returns true if the profile's age is ≥ 18 years. */
export function isAdultProfile(person: Person): boolean {
  if (!person.date_of_birth) return false;
  const { years } = calculateAge(person.date_of_birth);
  return years >= ADULT_AGE_YEARS;
}

/**
 * Returns a new array where adults (18+) are moved to the end while people
 * retain their original relative order. Does not mutate the input.
 */
export function sortPeopleWithAdultsLast(people: Person[]): Person[] {
  return [...people].sort((a, b) => {
    const aAdult = isAdultProfile(a) ? 1 : 0;
    const bAdult = isAdultProfile(b) ? 1 : 0;
    return aAdult - bAdult;
  });
}
