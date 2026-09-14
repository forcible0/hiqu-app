import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // Hatanın tam dosya/satır numarasını gösterir
    minify: false    // Kodu okunabilir kılar
  }
})