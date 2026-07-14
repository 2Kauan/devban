import { useEffect } from 'react';
import { AppRoutes } from '@/routes';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { processSyncQueue } from '@/lib/offlineSync';
import { NotificationService } from '@/services/notifications/notificationService';

export default function App() {
  useEffect(() => {
    // Escuta quando o celular recupera o sinal de internet
    window.addEventListener('online', processSyncQueue);
    
    // Tenta rodar a fila na primeira inicialização caso já tenha internet
    if (navigator.onLine) {
      processSyncQueue();
    }

    // Pede permissão para notificações no dispositivo móvel
    NotificationService.requestPermissions();
    
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
