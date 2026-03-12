import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/src/index.css';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Call the element loader before the render call
defineCustomElements(window);