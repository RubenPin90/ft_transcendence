import { defineConfig } from 'vite'

export default defineConfig({
  root: './client/ts',
  build: {
    outDir: '../js',
    emptyOutDir: true,
    rollupOptions: {
      input: './client/ts/main.ts',
      output: {
        entryFileNames: 'client.js',
      },
    },
  },
})
