import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  if (command === 'build' && ['staging', 'production'].includes(mode)) {
    const provider = env.VITE_CAPTCHA_PROVIDER || 'turnstile'
    if (!['turnstile', 'hcaptcha'].includes(provider)) {
      throw new Error('VITE_CAPTCHA_PROVIDER must be turnstile or hcaptcha.')
    }
    const keyName = provider === 'hcaptcha' ? 'VITE_HCAPTCHA_SITE_KEY' : 'VITE_TURNSTILE_SITE_KEY'
    if (!env[keyName]?.trim()) {
      throw new Error(`${keyName} is required for ${mode} builds. Configure the public site key before deploying.`)
    }
  }
  return {
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          axios: ['axios']
        }
      }
    }
  }
  }
})
