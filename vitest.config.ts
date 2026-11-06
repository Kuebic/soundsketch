import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Convex functions run in an edge-like runtime; convex-test expects it.
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
  },
})
