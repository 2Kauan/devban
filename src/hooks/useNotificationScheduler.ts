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

        // Fetch all cards
        const { data: cardsData, error: cardsError } = await supabase
          .from('cards')
          .select('id, title, due_date, column_id, priority, project_id')
          .in('project_id', projectIds);

        if (cardsError || !cardsData) return;

        const activeCards = cardsData.filter(card => !completedColumnIds.has(card.column_id));
        const now = new Date();

        for (const card of activeCards) {
          // 1. Urgent Priority Alerts (Every 30 mins if app open)
          if (card.priority === 'urgent') {
            const lastAlertKey = `last_urgent_alert_${card.id}`;
            const lastAlertStr = localStorage.getItem(lastAlertKey);
            const lastAlert = lastAlertStr ? new Date(lastAlertStr) : null;
            
            if (!lastAlert || (now.getTime() - lastAlert.getTime() > 30 * 60 * 1000)) {
              NotificationService.sendImmediateNotification('Devban - TAREFA URGENTE', `A tarefa "${card.title}" está marcada como urgente!`, card.id, card.project_id);
              localStorage.setItem(lastAlertKey, now.toISOString());
            }
          }

          // 2. Pre-agendar alertas no AlarmManager do Android para dispararem AUTOMATICAMENTE em segundo plano
          if (card.due_date) {
            await NotificationService.scheduleAllTaskReminders(card.id, card.title, card.due_date, card.project_id);
          }
        }
      } catch (err) {
        console.error('[NotificationScheduler] Error checking deadlines:', err);
      }
    };

    // Run immediately on load, and then every 60 seconds
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);

    return () => clearInterval(interval);
  }, [user]);
}
