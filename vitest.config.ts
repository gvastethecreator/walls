import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      css: true,
      setupFiles: './test/setup.ts',
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/main.tsx',
          'src/identify.ts',
          'src/vite-env.d.ts',
          'src/test/**',
        ],
      },
    },
  }),
);
