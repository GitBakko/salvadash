import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/middleware/**', 'src/config/**', 'src/routes/**'],
      exclude: ['src/**/*.test.ts', 'src/lib/prisma.ts'],
      reporter: ['text', 'text-summary'],
      // Regression gate. Routes are now in scope (covered by the real-DB flow +
      // mocked integration tests), which dilutes the global numbers, so global
      // floors sit just below the with-DB actuals while per-path floors keep the
      // critical pure cores pinned high. Enforced in CI's test job (which runs
      // with the salvadash_test DB, so the real-DB suites execute).
      thresholds: {
        statements: 48,
        branches: 80,
        functions: 65,
        lines: 48,
        'src/lib/calculations.ts': { statements: 95, branches: 90, functions: 100, lines: 95 },
        'src/lib/money.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/middleware/**': { statements: 90, branches: 85, functions: 90, lines: 90 },
      },
    },
    env: {
      JWT_ACCESS_SECRET: 'test-access-secret-key-for-vitest',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-vitest',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_USER: 'test@test.com',
      SMTP_PASS: 'test',
      SMTP_FROM: 'test@test.com',
      NODE_ENV: 'test',
    },
  },
});
