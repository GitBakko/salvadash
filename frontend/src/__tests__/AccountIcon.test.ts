import { describe, it, expect } from 'vitest';
import { readableTextColor } from '../components/AccountIcon';

// Render-level integration is verified via E2E + production build.
// jsdom + lucide-react/framer-motion + React 19 hangs vitest on Windows.

describe('readableTextColor', () => {
  it('returns black on light backgrounds', () => {
    expect(readableTextColor('#ffffff')).toBe('#0a0a0f');
    expect(readableTextColor('#facc15')).toBe('#0a0a0f'); // yellow
    expect(readableTextColor('#3DDC97')).toBe('#0a0a0f'); // mint
  });

  it('returns white on dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#1a1a1a')).toBe('#ffffff'); // near-black
    expect(readableTextColor('#ff4567')).toBe('#ffffff'); // brand red
    expect(readableTextColor('#0a4f8f')).toBe('#ffffff'); // dark blue
  });

  it('falls back to white on invalid input', () => {
    expect(readableTextColor('not-a-color')).toBe('#ffffff');
    expect(readableTextColor('')).toBe('#ffffff');
    expect(readableTextColor('#xyz')).toBe('#ffffff');
  });

  it('accepts 3-digit hex shorthand', () => {
    expect(readableTextColor('#fff')).toBe('#0a0a0f');
    expect(readableTextColor('#000')).toBe('#ffffff');
  });

  it('accepts hex without leading #', () => {
    expect(readableTextColor('ffffff')).toBe('#0a0a0f');
    expect(readableTextColor('000000')).toBe('#ffffff');
  });
});
