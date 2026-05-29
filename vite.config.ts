import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://api.coze.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/hotboard': {
        target: 'https://uapis.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hotboard/, '/api/v1/misc/hotboard'),
      },
    },
  },
})
