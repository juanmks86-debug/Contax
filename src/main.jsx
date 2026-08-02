import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { InventoryProvider } from './context/InventoryContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InventoryProvider>
      <App />
    </InventoryProvider>
  </React.StrictMode>
);

// Register service worker for offline capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('SW registrado con éxito:', reg.scope))
      .catch((err) => console.log('Fallo al registrar SW:', err));
  });
}
