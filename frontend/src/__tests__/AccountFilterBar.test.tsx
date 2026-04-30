import { describe, it, expect } from 'vitest';
import { toggleAccountId } from '../components/AccountFilterBar';

// Render-level integration is verified via E2E + production build.
// jsdom + lucide-react/framer-motion + React 19 hangs vitest on Windows for this component.

describe('toggleAccountId', () => {
  it('adds an id when not present', () => {
    expect(toggleAccountId([], 'a1')).toEqual(['a1']);
    expect(toggleAccountId(['a2'], 'a1')).toEqual(['a2', 'a1']);
  });

  it('removes an id when present', () => {
    expect(toggleAccountId(['a1'], 'a1')).toEqual([]);
    expect(toggleAccountId(['a1', 'a2'], 'a1')).toEqual(['a2']);
  });

  it('does not mutate the input array', () => {
    const input = ['a1', 'a2'];
    const out = toggleAccountId(input, 'a3');
    expect(input).toEqual(['a1', 'a2']);
    expect(out).not.toBe(input);
  });

  it('treats toggle as idempotent across two applications', () => {
    const id = 'a1';
    const start = ['a2'];
    expect(toggleAccountId(toggleAccountId(start, id), id)).toEqual(start);
  });
});
