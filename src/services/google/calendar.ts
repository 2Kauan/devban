import { supabase } from '@/lib/supabase';
import { getGCalEventId, mapColorToGoogleColorId, buildRichEventDescription } from '../../integrations/google/GoogleHelpers';
import { toast } from 'sonner';

const callGoogleProxy = async (targetUrl: string, method: string = 'GET', body?: any) => {
  const localToken = localStorage.getItem('devban_gcal_token');
  
  if (localToken) {
    try {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${localToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok || response.status !== 401) {
        return response;
      }
      
      // Token is invalid/expired
      localStorage.removeItem('devban_gcal_token');
    } catch (e) {
      console.error('Direct Google API call failed, trying proxy...', e);
    }
  }

  // Fallback to Supabase Edge Function Proxy
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-api-proxy?target=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok && (response.status === 401 || response.status === 404)) {
    toast.error('Sua sessão com o Google Agenda expirou. Por favor, clique em "Configurar" na aba de Integrações e reautorize.', {
      id: 'gcal-token-expired'
    });
  }

  return response;
};

/**
 * Fetches all cards with due dates, optionally filtered by project_id.
 */
export const fetchCardsWithDueDate = async (projectId?: string) => {
  try {
    const { data: cards, error } = await supabase
      .from('cards')
      .select('id, title, due_date, is_completed, priority, project_id, column_id')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (error || !cards) {
      console.error('Error fetching cards with due date:', error);
      return [];
    }

    const validCards = cards.filter(c => c.due_date && typeof c.due_date === 'string' && c.due_date.trim() !== '');

    if (!projectId || projectId === 'all') {
      return validCards;
    }

    const { data: cols } = await supabase
      .from('columns')
      .select('id')
      .eq('project_id', projectId);

    const colIds = new Set((cols || []).map(c => c.id));

    return validCards.filter(c => c.project_id === projectId || (c.column_id && colIds.has(c.column_id)));
  } catch (err) {
    console.error('Failed to fetch cards with due date:', err);
    return [];
  }
};

/**
 * Helper to fetch full details for a card (column title, column color, tags, assignees, checklists)
 */
export const fetchCardFullDetails = async (cardId: string, overrideColumnId?: string) => {
  let tags: string[] = [];
  let assignees: string[] = [];
  let checklists: Array<{ title: string; items: Array<{ title: string; is_completed: boolean }> }> = [];
  let columnTitle: string | null = null;
  let columnColor: string | null = null;
  let borderColor: string | null = null;

  try {
    const { data: cardData } = await supabase
      .from('cards')
      .select('border_color, column_id')
      .eq('id', cardId)
      .single();

    if (cardData) {
      borderColor = cardData.border_color;
      const colIdToUse = overrideColumnId || cardData.column_id;

      if (colIdToUse) {
        const { data: colData } = await supabase
          .from('columns')
          .select('title, color')
          .eq('id', colIdToUse)
          .single();

        if (colData) {
          columnTitle = colData.title;
          columnColor = colData.color;
        }
      }
    } else if (overrideColumnId) {
      const { data: colData } = await supabase
        .from('columns')
        .select('title, color')
        .eq('id', overrideColumnId)
        .single();

      if (colData) {
        columnTitle = colData.title;
        columnColor = colData.color;
      }
    }

    const { data: cardCats } = await supabase
      .from('card_categories')
      .select('category_id')
      .eq('card_id', cardId);

    if (cardCats && cardCats.length > 0) {
      const catIds = cardCats.map((c: any) => c.category_id);
      const { data: cats } = await supabase
        .from('categories')
        .select('name')
        .in('id', catIds);

      if (cats) {
        tags = cats.map(c => c.name).filter(Boolean);
      }
    }

    const { data: cardAssignees } = await supabase
      .from('card_assignees')
      .select('user_id')
      .eq('card_id', cardId);

    if (cardAssignees && cardAssignees.length > 0) {
      const uIds = cardAssignees.map((a: any) => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('name')
        .in('id', uIds);

      if (profiles) {
        assignees = profiles.map(p => p.name).filter(Boolean);
      }
    }

    const { data: clData } = await supabase
      .from('checklists')
      .select('id, title')
      .eq('card_id', cardId);

    if (clData && clData.length > 0) {
      const clIds = clData.map(c => c.id);
      const { data: itemsData } = await supabase
        .from('checklist_items')
        .select('checklist_id, text, checked')
        .in('checklist_id', clIds);

      checklists = clData.map(cl => ({
        title: cl.title,
        items: (itemsData || [])
          .filter(item => item.checklist_id === cl.id)
          .map(item => ({
            title: item.text,
            is_completed: item.checked
          }))
      }));
    }
  } catch (e) {
    console.error('Error fetching card details for Google Calendar:', e);
  }

  return { tags, assignees, checklists, columnTitle, columnColor: columnColor || borderColor };
};

export const isCardEligibleForGoogleSync = (cardProjectId?: string | null): boolean => {
  const saved = localStorage.getItem('devban_integrations');
  if (!saved) return true;

  try {
    const parsed = JSON.parse(saved);
    const gcal = parsed.google_calendar;
    if (!gcal) return true;

    if (gcal.active === false) {
      return false;
    }

    if (gcal.projectId && gcal.projectId !== 'all') {
      if (cardProjectId && cardProjectId !== gcal.projectId) {
        return false;
      }
    }
  } catch (e) {
    console.error('Error parsing devban_integrations:', e);
  }

  return true;
};

export const syncCardToGoogleCalendar = async (
  cardId: string,
  overrideColumnId?: string,
  overrideDueDate?: string | null
) => {
  try {
    const { data: card } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (!card || !isCardEligibleForGoogleSync(card.project_id)) return;

    const targetDueDate = overrideDueDate !== undefined ? overrideDueDate : card.due_date;
    if (!targetDueDate) {
      await deleteGoogleCalendarEvent(cardId);
      return;
    }

    const eventId = getGCalEventId(cardId);
    const { tags, assignees, checklists, columnTitle, columnColor } = await fetchCardFullDetails(cardId, overrideColumnId);
    const richDescription = buildRichEventDescription(card.description, card.priority, columnTitle, tags, assignees, checklists);
    const colorId = mapColorToGoogleColorId(columnColor || card.border_color);

    const startDate = new Date(targetDueDate);
    const endDate = new Date(startDate.getTime() + 3600000);

    const eventPayload = {
      id: eventId,
      summary: card.title,
      description: richDescription,
      colorId: colorId,
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() }
    };

    // 1. Try PUT (update existing event in-place)
    let res = await callGoogleProxy(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      'PUT',
      eventPayload
    );

    // 2. If event doesn't exist yet (404), POST to create it
    if (res.status === 404) {
      res = await callGoogleProxy(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        'POST',
        eventPayload
      );
    }

    if (res.ok) {
      toast.success('Sincronizado com o Google Agenda!');
    } else {
      console.error('Google Calendar API Error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Erro ao atualizar Google Calendar:', err);
  }
};

export const deleteGoogleCalendarEvent = async (cardId: string) => {
  try {
    const eventId = getGCalEventId(cardId);
    await callGoogleProxy(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      'DELETE'
    );
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err);
  }
};

export const syncAllCardsToGoogleCalendar = async () => {
  try {
    toast.info('Sincronizando cartões com o Google Agenda...');

    const { data: cards, error } = await supabase
      .from('cards')
      .select('*')
      .not('due_date', 'is', null);

    if (error || !cards || cards.length === 0) return;

    const eligibleCards = cards.filter(c => isCardEligibleForGoogleSync(c.project_id));
    for (const card of eligibleCards) {
      await syncCardToGoogleCalendar(card.id);
    }
    toast.success(`🎉 Sincronizados ${eligibleCards.length} cartões no Google Agenda!`);
  } catch (err: any) {
    toast.error('Erro ao sincronizar cartões: ' + err.message);
  }
};

export const syncSelectedCardsToGoogleCalendar = async (cardIds: string[]) => {
  try {
    toast.info(`Sincronizando ${cardIds.length} cartão(ões) selecionado(s) com o Google Agenda...`);

    const { data: cards, error } = await supabase
      .from('cards')
      .select('*')
      .in('id', cardIds)
      .not('due_date', 'is', null);

    if (error || !cards || cards.length === 0) return;

    for (const card of cards) {
      await syncCardToGoogleCalendar(card.id);
    }
    toast.success(`🎉 Sincronizados ${cards.length} cartão(ões) selecionado(s) no Google Agenda!`);
  } catch (err: any) {
    toast.error('Erro ao sincronizar cartões: ' + err.message);
  }
};

export const subscribeToGoogleCalendarWebhook = async (providerRefreshToken?: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-subscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider_refresh_token: providerRefreshToken })
    });

    if (res.ok) {
      console.log('Successfully subscribed to Google Calendar webhooks');
    } else {
      console.error('Failed to subscribe to Google Calendar webhooks:', await res.text());
    }
  } catch (err) {
    console.error('Error in subscribeToGoogleCalendarWebhook:', err);
  }
};

export const syncGoogleCalendarToDevban = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await callGoogleProxy('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    if (!res.ok) return;

    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      const eventId = item.id || '';
      let cardId: string | null = null;

      if (eventId.startsWith('devban')) {
        const cleanUuid = eventId.replace('devban', '');
        if (cleanUuid.length === 32) {
          cardId = `${cleanUuid.substring(0, 8)}-${cleanUuid.substring(8, 12)}-${cleanUuid.substring(12, 16)}-${cleanUuid.substring(16, 20)}-${cleanUuid.substring(20)}`;
        }
      }

      if (cardId) {
        if (item.status === 'cancelled') {
          await supabase.from('cards').update({ due_date: null }).eq('id', cardId);
        } else {
          const dueDate = item.start?.dateTime || item.start?.date;
          if (dueDate) {
            await supabase.from('cards').update({ due_date: new Date(dueDate).toISOString() }).eq('id', cardId);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error syncing Google Calendar to Devban:', err);
  }
};
