import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Converts a Devban Card UUID into a valid Google Calendar Event ID.
 * Google Calendar requires lowercase base32hex (a-v, 0-9), length between 5 and 1024 chars.
 */
export const getGCalEventId = (cardId: string): string => {
  const cleanUuid = cardId.replace(/-/g, '').toLowerCase();
  return `devban${cleanUuid}`;
};

/**
 * Maps a HEX color or color name from Devban column/card to the closest Google Calendar colorId (1-11).
 */
export const mapColorToGoogleColorId = (color: string | null | undefined): string => {
  if (!color) return '9'; // Default Blueberry (Blue)
  const c = color.toLowerCase();

  // Green / Verde
  if (c.includes('green') || c.includes('verde') || c.includes('#22c55e') || c.includes('#10b981') || c.includes('#4ade80') || c.includes('#16a34a')) {
    return '10'; // Basil (Bold Green)
  }
  // Red / Vermelho
  if (c.includes('red') || c.includes('vermelho') || c.includes('#ef4444') || c.includes('#f43f5e') || c.includes('#dc2626') || c.includes('#b91c1c')) {
    return '11'; // Tomato (Bold Red)
  }
  // Yellow / Amarelo
  if (c.includes('yellow') || c.includes('amarelo') || c.includes('#f59e0b') || c.includes('#eab308') || c.includes('#facc15') || c.includes('#d97706')) {
    return '5'; // Banana (Yellow)
  }
  // Orange / Laranja
  if (c.includes('orange') || c.includes('laranja') || c.includes('#f97316') || c.includes('#ff781f') || c.includes('#ea580c')) {
    return '6'; // Tangerine (Orange)
  }
  // Purple / Roxo
  if (c.includes('purple') || c.includes('roxo') || c.includes('#a855f7') || c.includes('#8b5cf6') || c.includes('#9333ea') || c.includes('#7c3aed')) {
    return '3'; // Grape (Purple)
  }
  // Cyan / Teal / Turquesa
  if (c.includes('cyan') || c.includes('teal') || c.includes('turquesa') || c.includes('#06b6d4') || c.includes('#14b8a6') || c.includes('#0891b2')) {
    return '7'; // Peacock (Cyan / Teal)
  }
  // Pink / Rosa
  if (c.includes('pink') || c.includes('rosa') || c.includes('#ec4899') || c.includes('#db2777')) {
    return '4'; // Flamingo (Pink)
  }
  // Gray / Cinza
  if (c.includes('gray') || c.includes('cinza') || c.includes('#64748b') || c.includes('#94a3b8') || c.includes('#475569')) {
    return '8'; // Graphite (Gray)
  }

  return '9'; // Default Blue
};

/**
 * Builds a rich text description containing priority, column name, tags, assignees, description, and checklist items.
 */
export const buildRichEventDescription = (
  rawDescription: string | null,
  priority: string | null,
  columnTitle: string | null,
  tags: string[],
  assignees: string[],
  checklists: Array<{ title: string; items: Array<{ title: string; is_completed: boolean }> }>
) => {
  const parts: string[] = [];

  // Column / Status
  if (columnTitle) {
    parts.push(`📊 Coluna: ${columnTitle}`);
  }

  // Priority indicator
  if (priority) {
    const priorityMap: Record<string, string> = {
      urgent: '🚨 URGENTE',
      high: '🔴 Alta',
      medium: '🟡 Média',
      low: '🔵 Baixa'
    };
    parts.push(`🎯 Prioridade: ${priorityMap[priority] || priority.toUpperCase()}`);
  }

  // Assignees
  if (assignees.length > 0) {
    parts.push(`👤 Responsável(is): ${assignees.join(', ')}`);
  }

  // Tags
  if (tags.length > 0) {
    parts.push(`🏷️ Etiquetas: ${tags.join(', ')}`);
  }

  // Main Description
  if (rawDescription) {
    const cleanDesc = rawDescription.replace(/<[^>]*>?/gm, '').trim();
    if (cleanDesc) {
      parts.push(`\n📝 Descrição:\n${cleanDesc}`);
    }
  }

  // Checklists
  if (checklists && checklists.length > 0) {
    parts.push('\n☑️ Checklists:');
    checklists.forEach(cl => {
      if (cl.title) parts.push(`  • ${cl.title}:`);
      cl.items?.forEach(item => {
        const mark = item.is_completed ? '[x]' : '[ ]';
        parts.push(`    ${mark} ${item.title}`);
      });
    });
  }

  parts.push('\n----------------------------------------\nDevban - Gerenciador Kanban Inteligente');

  return parts.join('\n');
};

/**
 * Helper to fetch full details for a card (column color, tags, assignees, checklists)
 */
export const fetchCardFullDetails = async (cardId: string) => {
  let tags: string[] = [];
  let assignees: string[] = [];
  let checklists: Array<{ title: string; items: Array<{ title: string; is_completed: boolean }> }> = [];
  let columnTitle: string | null = null;
  let columnColor: string | null = null;
  let borderColor: string | null = null;

  try {
    // 0. Fetch card column details
    const { data: cardData } = await supabase
      .from('cards')
      .select('border_color, column_id, columns(title, color)')
      .eq('id', cardId)
      .single();

    if (cardData) {
      borderColor = cardData.border_color;
      if (cardData.columns) {
        columnTitle = (cardData.columns as any).title || null;
        columnColor = (cardData.columns as any).color || null;
      }
    }

    // 1. Fetch categories / tags
    const { data: cardCats } = await supabase
      .from('card_categories')
      .select('categories(name)')
      .eq('card_id', cardId);

    if (cardCats) {
      tags = cardCats.map((c: any) => c.categories?.name).filter(Boolean);
    }

    // 2. Fetch assignees
    const { data: cardAssignees } = await supabase
      .from('card_assignees')
      .select('profiles(name)')
      .eq('card_id', cardId);

    if (cardAssignees) {
      assignees = cardAssignees.map((a: any) => a.profiles?.name).filter(Boolean);
    }

    // 3. Fetch checklists and items
    const { data: clData } = await supabase
      .from('checklists')
      .select('id, title')
      .eq('card_id', cardId);

    if (clData && clData.length > 0) {
      const clIds = clData.map(c => c.id);
      const { data: itemsData } = await supabase
        .from('checklist_items')
        .select('checklist_id, title, is_completed')
        .in('checklist_id', clIds);

      checklists = clData.map(cl => ({
        title: cl.title,
        items: (itemsData || []).filter(item => item.checklist_id === cl.id)
      }));
    }
  } catch (e) {
    console.error('Error fetching card details for Google Calendar:', e);
  }

  return { tags, assignees, checklists, columnTitle, columnColor: columnColor || borderColor };
};

/**
 * Pushes or updates a Google Calendar event in-place using a deterministic event ID (PUT/POST).
 * Prevents duplicating events when changing dates or column colors!
 */
export const upsertGoogleCalendarEvent = async (
  cardId: string,
  title: string,
  rawDescription: string | null,
  dueDate: string,
  priority: string | null = null
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;

    if (!token) return;

    const eventId = getGCalEventId(cardId);
    const { tags, assignees, checklists, columnTitle, columnColor } = await fetchCardFullDetails(cardId);
    const richDescription = buildRichEventDescription(rawDescription, priority, columnTitle, tags, assignees, checklists);
    const colorId = mapColorToGoogleColorId(columnColor);

    const startDate = new Date(dueDate);
    const endDate = new Date(startDate.getTime() + 3600000); // 1 hour duration

    const eventPayload = {
      id: eventId,
      summary: title,
      description: richDescription,
      colorId: colorId,
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() }
    };

    // 1. Try PUT (update existing event in-place)
    let res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    // 2. If event doesn't exist yet (404), POST to create it with deterministic ID
    if (res.status === 404) {
      res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });
    }

    if (res.ok) {
      toast.success('📅 Google Agenda atualizado com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao atualizar Google Calendar:', err);
  }
};

/**
 * Alias for backward compatibility
 */
export const syncCardToGoogleCalendar = upsertGoogleCalendarEvent;

/**
 * Deletes a Google Calendar event if the task due_date is removed or card deleted.
 */
export const deleteGoogleCalendarEvent = async (cardId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;

    if (!token) return;

    const eventId = getGCalEventId(cardId);
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err);
  }
};

/**
 * Fetches ALL cards with due dates and upserts every single one to Google Calendar (updating existing, creating missing).
 */
export const syncAllCardsToGoogleCalendar = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;

    if (!token) {
      toast.error('Conecte sua conta do Google para sincronizar os cartões!');
      return;
    }

    toast.info('Sincronizando cartões com o Google Agenda...');

    // Fetch all cards with a due date
    const { data: cards, error } = await supabase
      .from('cards')
      .select('*')
      .not('due_date', 'is', null);

    if (error || !cards || cards.length === 0) {
      toast.info('Nenhum cartão com data encontrada para sincronizar.');
      return;
    }

    let successCount = 0;

    for (const card of cards) {
      const eventId = getGCalEventId(card.id);
      const { tags, assignees, checklists, columnTitle, columnColor } = await fetchCardFullDetails(card.id);
      const richDescription = buildRichEventDescription(card.description, card.priority, columnTitle, tags, assignees, checklists);
      const colorId = mapColorToGoogleColorId(columnColor);

      const startDate = new Date(card.due_date);
      const endDate = new Date(startDate.getTime() + 3600000);

      const eventPayload = {
        id: eventId,
        summary: card.title,
        description: richDescription,
        colorId: colorId,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() }
      };

      // Try PUT first (update in-place)
      let res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      // If 404, POST to create
      if (res.status === 404) {
        res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventPayload)
        });
      }

      if (res.ok) {
        successCount++;
      }
    }

    toast.success(`🎉 Sincronizados ${successCount} cartões (com Cores das Colunas, Checklists e Etiquetas) no Google Agenda!`);
  } catch (err: any) {
    toast.error('Erro ao sincronizar cartões: ' + err.message);
  }
};

/**
 * Syncs only selected cards (by ID array) to Google Calendar with full rich details.
 */
export const syncSelectedCardsToGoogleCalendar = async (cardIds: string[]) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;

    if (!token) {
      toast.error('Conecte sua conta do Google para sincronizar os cartões!');
      return;
    }

    if (cardIds.length === 0) {
      toast.info('Nenhum cartão selecionado para sincronizar.');
      return;
    }

    toast.info(`Sincronizando ${cardIds.length} cartão(ões) selecionado(s) com o Google Agenda...`);

    const { data: cards, error } = await supabase
      .from('cards')
      .select('*')
      .in('id', cardIds)
      .not('due_date', 'is', null);

    if (error || !cards || cards.length === 0) {
      toast.info('Nenhum cartão selecionado com data encontrada para sincronizar.');
      return;
    }

    let successCount = 0;

    for (const card of cards) {
      await upsertGoogleCalendarEvent(card.id, card.title, card.description, card.due_date!, card.priority);
      successCount++;
    }

    toast.success(`🎉 Sincronizados ${successCount} cartão(ões) selecionado(s) no Google Agenda!`);
  } catch (err: any) {
    toast.error('Erro ao sincronizar cartões: ' + err.message);
  }
};

/**
 * Fetches all cards with due dates.
 */
export const fetchCardsWithDueDate = async () => {
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, title, due_date, is_completed, priority')
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true });

  if (error || !cards) return [];
  return cards;
};

/**
 * Generates a 1-click Google Calendar web link for any task
 */
export const getGoogleCalendarWebUrl = (
  title: string,
  description: string | null,
  dueDate: string,
  priority?: string
) => {
  const startDate = new Date(dueDate);
  const endDate = new Date(startDate.getTime() + 3600000);

  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const startStr = formatGCalDate(startDate);
  const endStr = formatGCalDate(endDate);

  const text = encodeURIComponent(title);
  const cleanDesc = description ? description.replace(/<[^>]*>?/gm, '') : '';
  const details = encodeURIComponent(`Prioridade: ${priority || 'Normal'}\n\n${cleanDesc}\n\nEnviado via Devban`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${startStr}/${endStr}`;
};
