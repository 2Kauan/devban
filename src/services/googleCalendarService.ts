import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Automatically pushes an event to the user's primary Google Calendar if logged in with Google OAuth
 */
export const syncCardToGoogleCalendar = async (title: string, description: string | null, dueDate: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;

    if (!token) {
      // If not logged in via Google OAuth, return early or offer direct link
      return;
    }

    const startDate = new Date(dueDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default duration

    const eventPayload = {
      summary: title,
      description: description ? description.replace(/<[^>]*>?/gm, '') : 'Criado via Devban',
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() }
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (res.ok) {
      toast.success('📅 Tarefa adicionada ao seu Google Agenda!');
    }
  } catch (err) {
    console.error('Erro ao sincronizar com o Google Calendar:', err);
  }
};

/**
 * Generates a 1-click Google Calendar web link for any task with a due date
 */
export const getGoogleCalendarWebUrl = (title: string, description: string | null, dueDate: string) => {
  const startDate = new Date(dueDate);
  const endDate = new Date(startDate.getTime() + 3600000); // +1 hour

  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const startStr = formatGCalDate(startDate);
  const endStr = formatGCalDate(endDate);

  const text = encodeURIComponent(title);
  const details = encodeURIComponent(description ? description.replace(/<[^>]*>?/gm, '') : 'Criado via Devban');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${startStr}/${endStr}`;
};
