import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente se presenti (utile per lo sviluppo locale e Vercel/Netlify)
  // Casting process to any to avoid TypeScript error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Questo permette al codice esistente "process.env.API_KEY" di funzionare
      // mappandolo alla variabile d'ambiente reale durante la build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})