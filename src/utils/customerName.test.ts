import { describe, it, expect } from 'vitest';
import { splitCustomerName } from './customerName';

describe('splitCustomerName', () => {
  it('uses a single word as the first name with an empty last name', () => {
    expect(splitCustomerName('Rahim')).toEqual({ firstName: 'Rahim', lastName: '' });
  });

  it('splits the first word from the rest of the name', () => {
    expect(splitCustomerName('Abdul Rahim Khan')).toEqual({ firstName: 'Abdul', lastName: 'Rahim Khan' });
  });

  it('trims and collapses extra whitespace', () => {
    expect(splitCustomerName('   Abdul    Rahim  ')).toEqual({ firstName: 'Abdul', lastName: 'Rahim' });
  });

  it('returns empty names for blank input', () => {
    expect(splitCustomerName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});
