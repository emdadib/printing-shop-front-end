/** Safe subset of the employee record the orders API returns with each order. */
export interface OrderCreator {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

/**
 * Display name of the employee who created an order.
 * Prefers "First Last", falls back to the username, then to `fallback`.
 */
export const getOrderCreatorName = (user?: OrderCreator | null, fallback = '—'): string => {
  if (!user) return fallback;
  const fullName = [user.firstName, user.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return fullName || (user.username ?? '').trim() || fallback;
};
