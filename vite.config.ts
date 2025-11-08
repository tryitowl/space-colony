import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/database', 'firebase/auth'],
          'ui-vendor': ['react-router-dom'],
          
          // Feature chunks
          'admin': [
            './src/pages/AdminDashboard.tsx',
            './src/pages/AdminLogin.tsx',
            './src/services/adminAuthService.ts'
          ],
          'facilitator': [
            './src/pages/FacilitatorDashboard.tsx',
            './src/pages/TestFacilitator.tsx',
            './src/pages/SimpleFacilitator.tsx'
          ],
          'game': [
            './src/pages/DashboardPage.tsx',
            './src/services/GameService.ts',
            './src/services/tradingService.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  define: {
    // Replace process.env with import.meta.env for Vite
    'process.env': 'import.meta.env',
  },
})