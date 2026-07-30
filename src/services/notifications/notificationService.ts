import { LocalNotifications } from '@capacitor/local-notifications';
import { subHours, subDays, subMinutes, isPast } from 'date-fns';

export class NotificationService {
  /**
   * Request permissions for local notifications.
   * Returns true if granted.
   */
  static async requestPermissions(): Promise<boolean> {
    let capacitorGranted = false;
    let webGranted = false;

    try {
      // Pede permissão pro SO ou Navegador pelo Capacitor
      const status = await LocalNotifications.requestPermissions();
      capacitorGranted = status.display === 'granted';
    } catch (error) {
      console.warn('Falha ao pedir permissão de notificações no Capacitor:', error);
    }

    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        webGranted = permission === 'granted';
      }
    } catch (error) {
      console.warn('Falha ao pedir permissão de notificações no Navegador:', error);
    }

    return capacitorGranted || webGranted;
  }

  /**
   * Envia uma notificação imediata usando Capacitor ou Web Notification API
   */
  static async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      const notificationId = Math.floor(Math.random() * 1000000);
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notificationId,
            schedule: { at: new Date() },
            smallIcon: 'ic_stat_logo',
            iconColor: '#AA3BFF'
          }
        ]
      });
      console.log(`[Notification] Notificação via Capacitor disparada: ${title}`);
    } catch (error) {
      console.warn('Falha ao disparar notificação via Capacitor:', error);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/logo-branca.png' });
        console.log(`[Notification] Notificação via Web API disparada: ${title}`);
      } catch (err) {
        console.warn('Falha ao disparar notificação via Web API:', err);
      }
    }
  }

  /**
   * Agenda múltiplos alertas de prazo de uma tarefa no AlarmManager do Android
   * para dispararem AUTOMATICAMENTE no horário exato, mesmo com o aplicativo fechado.
   */
  static async scheduleAllTaskReminders(cardId: string, title: string, dueDateStr: string | null): Promise<void> {
    if (!dueDateStr) return;

    try {
      const dueDate = new Date(dueDateStr);
      if (isNaN(dueDate.getTime())) return;

      // Alertas futuros que devem ser pré-agendados no sistema operacional:
      const alerts = [
        {
          suffix: '_1d',
          time: subDays(dueDate, 1),
          title: 'DevBan - Prazo Amanhã',
          body: `Falta 1 dia para o vencimento da tarefa "${title}".`
        },
        {
          suffix: '_1h',
          time: subHours(dueDate, 1),
          title: 'DevBan - Prazo em 1 Hora',
          body: `Você tem 1 hora para concluir a tarefa "${title}".`
        },
        {
          suffix: '_5m',
          time: subMinutes(dueDate, 5),
          title: 'DevBan - Vencimento Próximo',
          body: `Faltam 5 minutos para a tarefa "${title}" vencer!`
        },
        {
          suffix: '_due',
          time: dueDate,
          title: 'DevBan - Tarefa Vencendo Agora',
          body: `Chegou o horário de vencimento da tarefa "${title}"!`
        }
      ];

      const notificationsToSchedule = [];

      for (const alert of alerts) {
        // Ignora se o horário do alerta já passou
        if (isPast(alert.time)) continue;

        const notificationId = this.generateNumericId(cardId + alert.suffix);

        notificationsToSchedule.push({
          id: notificationId,
          title: alert.title,
          body: alert.body,
          schedule: { at: alert.time },
          smallIcon: 'ic_stat_logo',
          iconColor: '#AA3BFF',
          extra: { cardId }
        });
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[Notification] ${notificationsToSchedule.length} alarme(s) pré-agendados em segundo plano para "${title}"`);
      }
    } catch (error) {
      console.warn('Falha ao agendar lembretes em segundo plano:', error);
    }
  }

  /**
   * Schedule a reminder for a task 1 hour before its due date.
   */
  static async scheduleTaskReminder(cardId: string, title: string, dueDate: string | null): Promise<void> {
    return this.scheduleAllTaskReminders(cardId, title, dueDate);
  }

  /**
   * Cancel an existing reminder for a task.
   */
  static async cancelTaskReminder(cardId: string): Promise<void> {
    try {
      const suffixes = ['_1d', '_1h', '_5m', '_due', ''];
      const notificationsToCancel = suffixes.map(s => ({
        id: this.generateNumericId(cardId + s)
      }));
      
      await LocalNotifications.cancel({
        notifications: notificationsToCancel
      });
      console.log(`[Notification] Alarmes cancelados para o card: ${cardId}`);
    } catch (error) {
      console.warn('Falha ao cancelar notificação:', error);
    }
  }

  /**
   * Gera um ID numérico estável a partir da string (UUID)
   */
  private static generateNumericId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
