import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency (integer cents → display)', () => {
  it('formats cents to a 2-decimal USD string', () => {
    expect(formatCurrency(1999)).toBe('$19.99');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(5)).toBe('$0.05');
  });

  it('groups thousands', () => {
    expect(formatCurrency(1234567)).toBe('$12,345.67');
  });
});
