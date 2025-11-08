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
          // Core vendor chunks
          'react-vendor': ['react', 'react-dom'],

          // Split Firebase into separate chunks for better lazy loading
          'firebase-core': ['firebase/app'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-realtime': ['firebase/database'],
          'firebase-auth': ['firebase/auth'],

          // UI libraries
          'ui-vendor': ['react-router-dom', 'framer-motion'],

          // Feature chunks - loaded on demand
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
          'game-core': [
            './src/pages/DashboardPage.tsx',
            './src/services/GameService.ts'
          ],
          'game-trading': [
            './src/services/tradingService.ts',
            './src/services/flexibleTradingService.ts'
          ],
          'game-analytics': [
            './src/services/analyticsService.ts',
            './src/services/analyticsExportService.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500,
    // Optimize build performance
    target: 'es2020',
    minify: 'esbuild'
  },
  define: {
    // Replace process.env with import.meta.env for Vite
    'process.env': 'import.meta.env',
  },
})