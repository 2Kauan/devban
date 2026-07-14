import { useEffect } from 'react';
import { AppRoutes } from '@/routes';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { processSyncQueue } from '@/lib/offlineSync';

export default function App() {
  useEffect(() => {
    // Escuta quando o celular recupera o sinal de internet
    window.addEventListener('online', processSyncQueue);
    
    // Tenta rodar a fila na primeira inicialização caso já tenha internet
    if (navigator.onLine) {
      processSyncQueue();
    }
    
    return () => {
      window.removeEventListener('online', processSyncQueue);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
