import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            // In Docker Compose the backend service is reachable as 'backend'.
            // Locally (no Docker) it's localhost.
            // Override with VITE_BACKEND_URL if needed.
            '/api': {
                target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
});

