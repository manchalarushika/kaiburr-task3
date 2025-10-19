import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Configure the dev server
    server: {
        // Set up a proxy rule to redirect all requests starting with /api
        // from the frontend (e.g., http://localhost:5173/api/tasks)
        // to the backend (http://localhost:8080/api/tasks).
        proxy: {
            '/api': 'http://localhost:8080'
        }
    }
})
