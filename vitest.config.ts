import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    // Setup environment variables for tests
    setupFiles: ['__tests__/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts'
      ]
    },
    // Allow tests to run in parallel but with proper timeouts for API calls
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}); 