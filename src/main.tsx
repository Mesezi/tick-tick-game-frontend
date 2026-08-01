import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { GoogleCallbackApp } from './GoogleCallbackApp.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Route /auth/callback to the OAuth handler — everything else gets the main app
const isAuthCallback = window.location.pathname === '/auth/callback';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isAuthCallback ? <GoogleCallbackApp /> : <App />} 
    </QueryClientProvider>
  </StrictMode>,
);
