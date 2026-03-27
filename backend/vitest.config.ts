import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/middleware/**', 'src/config/**'],
      exclude: ['src/**/*.test.ts', 'src/lib/prisma.ts'],
      reporter: ['text', 'text-summary'],
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
