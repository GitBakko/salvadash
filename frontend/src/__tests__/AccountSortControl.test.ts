import { describe, it, expect } from 'vitest';
import { sortAccounts } from '../components/AccountSortControl';

// Render-level integration is verified via E2E + production build.
// The pure `sortAccounts` helper is the load-bearing piece of view logic
// and is covered here.

describe('sortAccounts', () => {
  const items = [
    { name: 'Charlie', amount: 100, orderIndex: 2 },
    { name: 'alpha', amount: 50, orderIndex: 0 },
    { name: 'Bravo', amount: 200, orderIndex: 1 },
  ];

  it('sorts by name ascending (case-insensitive, locale-aware)', () => {
    const out = sortAccounts(items, 'name', 'asc');
    expect(out.map((i) => i.name)).toEqual(['alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by name descending', () => {
    const out = sortAccounts(items, 'name', 'desc');
    expect(out.map((i) => i.name)).toEqual(['Charlie', 'Bravo', 'alpha']);
  });

  it('sorts by amount descending (largest first)', () => {
    const out = sortAccounts(items, 'amount', 'desc');
    expect(out.map((i) => i.amount)).toEqual([200, 100, 50]);
  });

  it('sorts by amount ascending', () => {
    const out = sortAccounts(items, 'amount', 'asc');
    expect(out.map((i) => i.amount)).toEqual([50, 100, 200]);
  });

  it('custom mode sorts by orderIndex ascending', () => {
    const out = sortAccounts(items, 'custom', 'asc');
    expect(out.map((i) => i.name)).toEqual(['alpha', 'Bravo', 'Charlie']);
  });

  it('custom mode preserves input order when orderIndex is absent', () => {
    const noOrder = [
      { name: 'X', amount: 1 },
      { name: 'A', amount: 2 },
      { name: 'M', amount: 3 },
    ];
    const out = sortAccounts(noOrder, 'custom', 'asc');
    expect(out.map((i) => i.name)).toEqual(['X', 'A', 'M']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { name: 'b', amount: 1 },
      { name: 'a', amount: 2 },
    ];
    const snapshot = input.map((i) => i.name);
    sortAccounts(input, 'name', 'asc');
    expect(input.map((i) => i.name)).toEqual(snapshot);
  });
});
