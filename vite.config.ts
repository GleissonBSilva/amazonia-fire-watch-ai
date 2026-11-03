import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/tts' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { text } = JSON.parse(body || '{}');
              if (!text) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Texto não fornecido.' }));
                return;
              }

              const cleanText = text
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                .replace(/[#*`_~]/g, '')
                .replace(/•/g, ', ')
                .slice(0, 1500);

              const chunks: string[] = [];
              let remaining = cleanText.trim();
              while (remaining.length > 0) {
                if (remaining.length <= 175) {
                  chunks.push(remaining);
                  break;
                }
                let splitIdx = remaining.lastIndexOf('. ', 175);
                if (splitIdx === -1) splitIdx = remaining.lastIndexOf(', ', 175);
                if (splitIdx === -1) splitIdx = remaining.lastIndexOf(' ', 175);
                if (splitIdx === -1) splitIdx = 175;
                else splitIdx += 1;
                chunks.push(remaining.slice(0, splitIdx).trim());
                remaining = remaining.slice(splitIdx).trim();
              }

              const audioBuffers: Buffer[] = [];
              for (const c of chunks) {
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(c)}&tl=pt-BR&client=tw-ob`;
                const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (r.ok) {
                  audioBuffers.push(Buffer.from(await r.arrayBuffer()));
                }
              }

              if (audioBuffers.length > 0) {
                const fullAudio = Buffer.concat(audioBuffers);
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Content-Length', fullAudio.length);
                res.end(fullAudio);
                return;
              }

              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Erro ao gerar áudio neural.' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 3000,
    open: true,
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
        },
      },
    },
  },
});
