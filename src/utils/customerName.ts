export interface SplitCustomerName {
  firstName: string;
  lastName: string;
}

/**
 * Splits a free-form customer name into the first/last name pair the API expects.
 * The first word becomes the first name and everything else the last name, so a
 * single-word name yields an empty last name (allowed by the server).
 */
export const splitCustomerName = (name: string): SplitCustomerName => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const [firstName = '', ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
};
