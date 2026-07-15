import { LocalNotifications } from '@capacitor/local-notifications';

import { subHours, isPast } from 'date-fns';

export class NotificationService {
  /**
   * Request permissions for local notifications.
   * Returns true if granted.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      // Pede permissão pro SO ou Navegador
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (error) {
      console.warn('Falha ao pedir permissão de notificações:', error);
      return false;
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
