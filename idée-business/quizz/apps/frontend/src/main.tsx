import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode disabled temporarily for PvP WebSocket development
// (it causes double mount/unmount which breaks event listeners)
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
