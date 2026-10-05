import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    hmr: process.env.VITE_NO_HMR ? false : true,
  },
});
