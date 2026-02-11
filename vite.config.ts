
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Use path.resolve() to get the current working directory (project root).
  const root = resolve();
  const env = loadEnv(mode, root, '');
  
  return {
    plugins: [react()],
    // Base path set to './' to ensure assets are resolved correctly 
    // within the chrome-extension:// protocol and standard web hosting.
    base: './',
    build: {
      outDir: 'dist', // Explicitly setting the output directory
      rollupOptions: {
        input: {
          // Entry point 1: The Main Web App
          main: resolve(root, 'index.html'),
          // Entry point 2: The Chrome Extension Side Panel
          // In this environment, the project root conceptually serves as the 'src' folder.
          // We resolve the path relative to this root to avoid resolution errors.
          sidepanel: resolve(root, 'extension/sidepanel.html'),
        },
      },
    },
    // Mapping environment variables to the client-side execution context.
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
    },
  };
});
