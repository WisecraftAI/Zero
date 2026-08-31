import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { applyTheme, readStoredTheme, resolveStoredTheme } from './lib/themes';
import { store } from './store';
import './index.scss';

// index.html resolves the theme before first paint; this only covers the case
// where that inline script did not run (e.g. a host page without it).
if (!document.documentElement.getAttribute('data-theme')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(resolveStoredTheme(readStoredTheme(), prefersDark));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
