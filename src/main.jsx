import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/pushInit.js'

import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://viralcraftmedia-demo.onrender.com'
axios.defaults.withCredentials = true

registerServiceWorker().then(reg => {
  if (reg) {
    console.log('SW registered at startup');
  }
}).catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
