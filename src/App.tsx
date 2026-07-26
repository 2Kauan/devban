import { useEffect } from 'react';
import { AppRoutes } from '@/routes';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { processSyncQueue } from '@/lib/offlineSync';
import { NotificationService } from '@/services/notifications/notificationService';
import { useNotificationScheduler } from '@/hooks/useNotificationScheduler';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNative } from '@/lib/capacitor';
import { supabase } from '@/lib/supabase';

export const APP_VERSION = '1.0.0';

export default function App() {
  useNotificationScheduler();

  useEffect(() => {
    // Escuta quando o celular recupera o sinal de internet
    window.addEventListener('online', processSyncQueue);
    
    // Tenta rodar a fila na primeira inicialização caso já tenha internet
    if (navigator.onLine) {
      processSyncQueue();
    }

    // Pede permissão para notificações no dispositivo móvel
    NotificationService.requestPermissions();

    // Gerencia atualizações OTA (Live Updates)
    const checkUpdates = async () => {
      if (!isNative) return;
      try {
        // Notifica que o app iniciou corretamente (evita rollback)
        await CapacitorUpdater.notifyAppReady();

        // Busca a última versão disponível na tabela app_updates do Supabase
        const { data, error } = await supabase
          .from('app_updates')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar atualizações OTA:', error);
          return;
        }

        if (data && data.version !== APP_VERSION) {
          console.log('Nova versão OTA encontrada:', data.version);
          
          // Baixa a atualização (.zip contendo a pasta dist)
          const version = await CapacitorUpdater.download({
            url: data.url,
            version: data.version
          });
          
          // Aplica a nova versão
          await CapacitorUpdater.set(version);
          console.log('Atualização OTA aplicada. O app carregará a nova versão no próximo reinício.');
        }
      } catch (e) {
        console.error('Falha no processo de Live Update:', e);
      }
    };
    
    checkUpdates();
    
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
