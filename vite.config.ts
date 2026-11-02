import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes('node_modules/leaflet') ||
            id.includes('node_modules/leaflet-draw') ||
            id.includes('node_modules/leaflet.markercluster')
          ) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          if (id.includes('node_modules/react-rnd')) {
            return 'vendor-rnd';
          }
        }
      }
    }
  }
});
