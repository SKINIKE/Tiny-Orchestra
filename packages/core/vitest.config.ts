import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      lines: 0,
      functions: 0,
      statements: 0,
      branches: 0,
    },
  },
});
