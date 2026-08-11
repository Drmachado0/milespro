import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [
            'src/**/*.adversarial.test.{ts,tsx}',
            'src/test/integration/**',
          ],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.adversarial.test.{ts,tsx}'],
          setupFiles: ['./src/test/integration/setup.ts'],
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 60000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Thresholds track actual coverage (~63/46/62/52%), not the 80% target —
      // ratchet these up as coverage improves rather than dropping the gate.
      thresholds: {
        lines: 60,
        functions: 45,
        branches: 50,
        statements: 60,
      },
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/test/**',
        'src/integrations/**',
      ],
    },
  },
});
