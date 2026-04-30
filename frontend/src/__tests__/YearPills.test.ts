import { describe, it, expect } from 'vitest';
import { toggleYear } from '../components/YearPills';

describe('toggleYear', () => {
  it('multi mode: adds when missing', () => {
    expect(toggleYear(['2024'], '2025', true).sort()).toEqual(['2024', '2025']);
  });
  it('multi mode: removes when present', () => {
    expect(toggleYear(['2024', '2025'], '2025', true)).toEqual(['2024']);
  });
  it('multi mode: cannot remove last active', () => {
    expect(toggleYear(['2024'], '2024', true)).toEqual(['2024']);
  });
  it('single mode: replaces active', () => {
    expect(toggleYear(['2024'], '2025', false)).toEqual(['2025']);
  });
});
