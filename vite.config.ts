// ============================================
// FILE: vite.config.ts
// ============================================
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    port: 5173,
    strictPort: false,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  ssr: {
    noExternal: [
      '@mantine/core',
      '@mantine/hooks', 
      '@mantine/notifications',
      '@mantine/dates',
      '@mantine/charts'
    ],
  },
  optimizeDeps: {
    include: ['@mantine/core', '@mantine/hooks'],
  },
  build: {
    manifest: true,
    cssCodeSplit: false,
  },
});
