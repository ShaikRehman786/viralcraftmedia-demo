import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/pushInit.js'

import axios from 'axios'

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const configuredUrl = import.meta.env.VITE_API_URL;
const productionBackend = 'https://viralcraftmedia-demo.onrender.com';

// Strict Environment Isolation:
// Development (localhost) -> http://localhost:5000
// Production (remote domain) -> https://viralcraftmedia-demo.onrender.com
if (isLocalhost) {
  axios.defaults.baseURL = configuredUrl || 'http://localhost:5000';
} else {
  axios.defaults.baseURL = (!configuredUrl || configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1'))
    ? productionBackend
    : configuredUrl;
}


axios.defaults.withCredentials = true


// Production Security Hardening: Disable console logging except console.error
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Defer SW registration until idle so it never blocks first interaction on mobile
const idleRegister = window.requestIdleCallback || ((cb) => setTimeout(cb, 2500));
idleRegister(() => registerServiceWorker().catch(() => {}), { timeout: 4000 });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
