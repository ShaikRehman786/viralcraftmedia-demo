import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/pushInit.js'

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
