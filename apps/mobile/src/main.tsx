import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as KonstaApp } from 'konsta/react';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KonstaApp theme="material" dark>
      <App />
    </KonstaApp>
  </StrictMode>
);
