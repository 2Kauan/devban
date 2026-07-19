import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/notifications/notificationService';

export function useNotificationScheduler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkDeadlines = async () => {
      // Check if notifications are enabled
      const enabled = localStorage.getItem('devban_notifications_enabled') === 'true';
      if (!enabled) return;

      try {
        // Get all user's projects
        const { data: projectsData, error: projError } = await supabase
          .from('projects')
          .select('id');

        if (projError || !projectsData || projectsData.length === 0) return;
        const projectIds = projectsData.map(p => p.id);

        // Fetch columns to filter out completed ones
        const { data: columnsData } = await supabase
          .from('columns')
          .select('id, is_completed')
          .in('project_id', projectIds);

        const completedColumnIds = new Set(
          columnsData?.filter(col => col.is_completed).map(col => col.id) || []
        );

        // Fetch all cards with due dates
        const { data: cardsData, error: cardsError } = await supabase
          .from('cards')
          .select('id, title, due_date, column_id')
          .in('project_id', projectIds)
          .not('due_date', 'is', null);

        if (cardsError || !cardsData) return;

        const activeCards = cardsData.filter(card => !completedColumnIds.has(card.column_id));
        const now = new Date();

        for (const card of activeCards) {
          if (!card.due_date) continue;
          const dueDate = new Date(card.due_date);
          const diffMs = dueDate.getTime() - now.getTime();
          const diffMins = diffMs / 60000;

          let thresholdKey = '';
          let message = '';

          if (diffMins > 0 && diffMins <= 1.5) {
            thresholdKey = '1m';
            message = `Falta 1 minuto para concluir a tarefa "${card.title}"!`;
          } else if (diffMins > 4 && diffMins <= 6) {
            thresholdKey = '5m';
            message = `Faltam 5 minutos para concluir a tarefa "${card.title}"!`;
          } else if (diffMins > 55 && diffMins <= 65) {
            thresholdKey = '1h';
            message = `Você tem 1 hora para fazer a tarefa "${card.title}". Prazo final: ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
          } else if (diffMins > 1430 && diffMins <= 1450) {
            thresholdKey = '1d';
            message = `Falta 1 dia para o vencimento da tarefa "${card.title}". Prazo final: ${dueDate.toLocaleDateString()} às ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
          }

          if (thresholdKey && message) {
            const sentRecordKey = `sent_${card.id}_${thresholdKey}`;
            const alreadySent = localStorage.getItem(sentRecordKey);
            if (!alreadySent) {
              NotificationService.sendImmediateNotification('Devban - Prazo de Entrega', message);
              localStorage.setItem(sentRecordKey, 'true');
            }
          }
        }
      } catch (err) {
        console.error('[NotificationScheduler] Error checking deadlines:', err);
      }
    };

    // Run immediately on load, and then every 30 seconds
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30000);

    return () => clearInterval(interval);
  }, [user]);
}
