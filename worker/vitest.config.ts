import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
