import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Allow JSX syntax inside .js files (CRA-style)
    loader: 'jsx',
  },
  server: {
    port: 3000,
  },
});
