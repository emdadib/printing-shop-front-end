import { describe, it, expect } from 'vitest';
import { getOrderCreatorName } from './orderCreator';

describe('getOrderCreatorName', () => {
  it('joins first and last name', () => {
    expect(getOrderCreatorName({ firstName: 'Rahim', lastName: 'Uddin' })).toBe('Rahim Uddin');
  });

  it('uses just the first name when the last name is empty', () => {
    expect(getOrderCreatorName({ firstName: 'Rahim', lastName: '' })).toBe('Rahim');
    expect(getOrderCreatorName({ firstName: ' Rahim ', lastName: null })).toBe('Rahim');
  });

  it('falls back to the username when there is no name', () => {
    expect(getOrderCreatorName({ firstName: '', lastName: '', username: 'rahim01' })).toBe('rahim01');
  });

  it('returns the fallback when the order has no creator', () => {
    expect(getOrderCreatorName(undefined)).toBe('—');
    expect(getOrderCreatorName(null, '')).toBe('');
    expect(getOrderCreatorName({ firstName: '', lastName: '', username: '' }, 'Unknown')).toBe('Unknown');
  });
});
