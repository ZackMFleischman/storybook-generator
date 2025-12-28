import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { RootStoreProvider } from './stores/RootStore';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootStoreProvider>
      <App />
    </RootStoreProvider>
  </React.StrictMode>
);
