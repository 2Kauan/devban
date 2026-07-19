import { LocalNotifications } from '@capacitor/local-notifications';

import { subHours, isPast } from 'date-fns';

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
            schedule: { at: new Date() }
          }
        ]
      });
      console.log(`[Notification] Notificação via Capacitor disparada: ${title}`);
    } catch (error) {
      console.warn('Falha ao disparar notificação via Capacitor:', error);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
        console.log(`[Notification] Notificação via Web API disparada: ${title}`);
      } catch (err) {
        console.warn('Falha ao disparar notificação via Web API:', err);
      }
    }
  }

  /**
   * Schedule a reminder for a task 1 hour before its due date.
   */
  static async scheduleTaskReminder(cardId: string, title: string, dueDate: string | null): Promise<void> {
    try {
      // Cancela qualquer alarme antigo para não apitar duplicado se a pessoa mudou a data
      await this.cancelTaskReminder(cardId);

      if (!dueDate) return;

      const due = new Date(dueDate);
      const reminderTime = subHours(due, 1); // Exatamente 1 hora antes

      // Se a hora do alarme já passou, nem agenda
      if (isPast(reminderTime)) return;

      // O Capacitor exige que o ID da notificação seja um número. 
      // Vamos gerar um hash numérico a partir do ID do cartão (UUID)
      const notificationId = this.generateNumericId(cardId);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Tarefa Próxima do Vencimento',
            body: `A tarefa "${title}" vence em 1 hora!`,
            id: notificationId,
            schedule: { at: reminderTime },
            extra: { cardId }
          }
        ]
      });
      console.log(`[Notification] Alarme agendado para: ${reminderTime.toLocaleString()}`);
    } catch (error) {
      console.warn('Falha ao agendar notificação:', error);
    }
  }

  /**
   * Cancel an existing reminder for a task.
   */
  static async cancelTaskReminder(cardId: string): Promise<void> {
    try {
      const notificationId = this.generateNumericId(cardId);
      
      const pending = await LocalNotifications.getPending();
      const exists = pending.notifications.some(n => n.id === notificationId);
      
      if (exists) {
        await LocalNotifications.cancel({
          notifications: [{ id: notificationId }]
        });
        console.log(`[Notification] Alarme cancelado para o card: ${cardId}`);
      }
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
