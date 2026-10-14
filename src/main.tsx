import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './utils/analytics'

initAnalytics();

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
void fetch(`${apiUrl}/health`, { mode: 'no-cors' }).catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

requestAnimationFrame(() => {
  document.documentElement.classList.add('app-ready');
});
