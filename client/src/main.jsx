import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SpaceBackground from './components/SpaceBackground';
import './index.css';

const AUTH_TOKEN_KEY = 'zero-auth-token';
const nativeFetch = window.fetch.bind(window);

window.fetch = async (input, init = {}) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return nativeFetch(input, init);

  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return nativeFetch(input, { ...init, headers });
};

const savedTheme = localStorage.getItem('zero-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SpaceBackground />
    <App />
  </React.StrictMode>
);
