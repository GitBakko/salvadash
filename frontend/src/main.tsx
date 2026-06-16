import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import { ErrorBoundary, RouteErrorFallback } from './components/ErrorBoundary';
import './app.css';

// ─── Router ────────────────────────────────────────────────
// defaultErrorComponent renders inside the route Outlet, so a single route's
// render error doesn't take down the shell (header/nav).
const router = createRouter({ routeTree, defaultErrorComponent: RouteErrorFallback });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ─── Query Client ──────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
});

// ─── Render ────────────────────────────────────────────────
const rootEl = document.getElementById('root')!;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
