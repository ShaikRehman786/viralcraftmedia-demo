import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import WebDevRouter from '../apps/web-dev/WebDevRouter.jsx';
import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const configuredUrl = import.meta.env.VITE_API_URL;
const productionBackend = 'https://viralcraftmedia-demo.onrender.com';

if (isLocalhost) {
  axios.defaults.baseURL = configuredUrl || 'http://localhost:5000';
} else {
  axios.defaults.baseURL = (!configuredUrl || configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1'))
    ? productionBackend
    : configuredUrl;
}

axios.defaults.withCredentials = true;

if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WebDevRouter />
  </StrictMode>
);
