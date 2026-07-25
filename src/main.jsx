import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/pushInit.js'

import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_URL
axios.defaults.withCredentials = true

// Production Security Hardening: Disable console logging except console.error
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

registerServiceWorker().catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
