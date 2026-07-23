import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Builds a rich text description containing priority, tags, assignees, description, and checklist items.
 */
export const buildRichEventDescription = (
  rawDescription: string | null,
  priority: string | null,
  tags: string[],
  assignees: string[],
  checklists: Array<{ title: string; items: Array<{ title: string; is_completed: boolean }> }>
) => {
  const parts: string[] = [];

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

  parts.push('\n----------------------------------------\nEnviado automaticamente pelo Devban');

  return parts.join('\n');
};

/**
 * Helper to fetch full details for a card (tags, assignees, checklists)
 */
export const fetchCardFullDetails = async (cardId: string) => {
  let tags: string[] = [];
  let assignees: string[] = [];
  let checklists: Array<{ title: string; items: Array<{ title: string; is_completed: boolean }> }> = [];

  try {
    // 1. Fetch categories
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

  return { tags, assignees, checklists };
};

/**
 * Automatically pushes an individual card with full details to Google Calendar API
 */
export const syncCardToGoogleCalendar = async (
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

    const { tags, assignees, checklists } = await fetchCardFullDetails(cardId);
    const richDescription = buildRichEventDescription(rawDescription, priority, tags, assignees, checklists);

    const startDate = new Date(dueDate);
    const endDate = new Date(startDate.getTime() + 3600000); // 1 hour duration

    const eventPayload = {
      summary: title,
      description: richDescription,
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
      toast.success('📅 Tarefa sincronizada com o Google Agenda!');
    }
  } catch (err) {
    console.error('Erro ao sincronizar com Google Calendar:', err);
  }
};

/**
 * Fetches ALL cards with due dates and syncs every single one to Google Calendar with full rich details!
 */
export const syncAllCardsToGoogleCalendar = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;

    if (!token) {
      toast.error('Conecte sua conta do Google para sincronizar os cartões!');
      return;
    }

    toast.info('Sincronizando todos os cartões com o Google Agenda...');

    // 1. Fetch all cards with a due date
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
      const { tags, assignees, checklists } = await fetchCardFullDetails(card.id);
      const richDescription = buildRichEventDescription(card.description, card.priority, tags, assignees, checklists);

      const startDate = new Date(card.due_date);
      const endDate = new Date(startDate.getTime() + 3600000);

      const eventPayload = {
        summary: card.title,
        description: richDescription,
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
        successCount++;
      }
    }

    toast.success(`🎉 Sincronizados ${successCount} cartões (com Checklists, Etiquetas e Responsáveis) no Google Agenda!`);
  } catch (err: any) {
    toast.error('Erro ao sincronizar cartões: ' + err.message);
  }
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
