import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { ThemeProvider } from './lib/ThemeProvider';

const queryClient = new QueryClient();

if (window.location.pathname === '/hooks/remote') {
  const result = new URLSearchParams(window.location.search);
  const status = result.get('mcp_oauth');
  if (status === 'success' || status === 'error') {
    const params = new URLSearchParams({ mcp_oauth: status });
    const name = result.get('name');
    if (name) params.set('connector', name);
    window.history.replaceState(null, '', '/#/connectors?' + params);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
