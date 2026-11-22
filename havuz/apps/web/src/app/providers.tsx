'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ApiError, createHavuzClient, HavuzClientProvider } from '@havuz/sdk';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    createHavuzClient({
      baseUrl: '',
      onUnauthorized: () => {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/giris') && window.location.pathname !== '/') {
          window.location.href = `/giris?next=${encodeURIComponent(window.location.pathname)}`;
        }
      },
    }),
  );
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
            retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
          },
        },
      }),
  );
  return (
    <HavuzClientProvider client={client}>
      <QueryClientProvider client={qc}>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: 'font-sans' }} />
      </QueryClientProvider>
    </HavuzClientProvider>
  );
}
