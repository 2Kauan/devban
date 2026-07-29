import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/utils/errorMessages';

const callGoogleTasksApi = async (targetUrl: string, method: string = 'GET', body?: any) => {
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
      localStorage.removeItem('devban_gcal_token');
    } catch (e) {
      console.error('Direct Tasks API call failed, trying proxy...', e);
    }
  }

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

  return response;
};

export const isCardEligibleForGoogleTasksSync = (cardProjectId?: string | null): boolean => {
  const saved = localStorage.getItem('devban_integrations');
  if (!saved) return true;

  try {
    const parsed = JSON.parse(saved);
    const gtasks = parsed.google_tasks;
    if (!gtasks) return true;

    if (gtasks.active === false) {
      return false;
    }

    if (gtasks.projectId && gtasks.projectId !== 'all') {
      if (cardProjectId && cardProjectId !== gtasks.projectId) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return true;
  }
};

export const syncCardToGoogleTasks = async (cardId: string, showToast = false) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: card } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (!card) return;

    if (!isCardEligibleForGoogleTasksSync(card.project_id)) return;

    // Check if we already have a task mapped in google_resources
    const { data: mappedResource } = await supabase
      .from('google_resources')
      .select('*')
      .eq('devban_entity_id', cardId)
      .eq('resource_type', 'task')
      .maybeSingle();

    // Prepare task payload
    const taskPayload = {
      title: card.title,
      notes: `${card.description || ''}\n\nPrioridade: ${card.priority?.toUpperCase() || 'NORMAL'}`,
      due: card.due_date ? new Date(card.due_date).toISOString() : undefined,
    };

    if (mappedResource) {
      // Update existing task
      const updateUrl = `https://tasks.googleapis.com/v1/tasks/${mappedResource.resource_id}`;
      const res = await callGoogleTasksApi(updateUrl, 'PATCH', taskPayload);
      if (res.ok) {
        console.log('Google Task updated successfully');
        if (showToast) toast.success('Tarefa atualizada no Google Tarefas!');
      } else {
        console.error('Error updating Google Task:', await res.text());
      }
    } else {
      // Create new task
      const createUrl = `https://tasks.googleapis.com/v1/lists/@default/tasks`;
      const res = await callGoogleTasksApi(createUrl, 'POST', taskPayload);

      if (res.ok) {
        const taskData = await res.json();
        const taskId = taskData.id;

        // Fetch or create integration row
        let { data: integration } = await supabase
          .from('google_integrations')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('integration_type', 'tasks')
          .maybeSingle();

        if (!integration) {
          const { data: newIntegration } = await supabase
            .from('google_integrations')
            .insert({
              user_id: session.user.id,
              integration_type: 'tasks',
              is_active: true
            })
            .select('id')
            .single();
          integration = newIntegration;
        }

        if (integration) {
          await supabase.from('google_resources').insert({
            integration_id: integration.id,
            resource_id: taskId,
            resource_type: 'task',
            devban_entity_id: cardId
          });
        }
        toast.success('🎉 Tarefa adicionada ao Google Tarefas!');
      } else {
        console.error('Error creating Google Task:', await res.text());
      }
    }
  } catch (err) {
    console.error('Error in syncCardToGoogleTasks:', err);
  }
};

export const deleteGoogleTask = async (cardId: string) => {
  try {
    const { data: mappedResource } = await supabase
      .from('google_resources')
      .select('*')
      .eq('devban_entity_id', cardId)
      .eq('resource_type', 'task')
      .maybeSingle();

    if (!mappedResource) return;

    const deleteUrl = `https://tasks.googleapis.com/v1/tasks/${mappedResource.resource_id}`;
    const res = await callGoogleTasksApi(deleteUrl, 'DELETE');

    if (res.ok || res.status === 404) {
      await supabase
        .from('google_resources')
        .delete()
        .eq('id', mappedResource.id);
      console.log('Google Task deleted successfully');
    }
  } catch (err) {
    console.error('Error deleting Google Task:', err);
  }
};

export const syncAllCardsToGoogleTasks = async () => {
  try {
    toast.info('Sincronizando cartões com o Google Tarefas...');

    const { data: cards, error } = await supabase
      .from('cards')
      .select('*');

    if (error || !cards || cards.length === 0) return;

    const eligibleCards = cards.filter(c => isCardEligibleForGoogleTasksSync(c.project_id));
    for (const card of eligibleCards) {
      await syncCardToGoogleTasks(card.id);
    }
    toast.success(`🎉 Sincronizados ${eligibleCards.length} cartão(ões) no Google Tarefas!`);
  } catch (err: any) {
    toast.error(getFriendlyErrorMessage(err, 'Não foi possível sincronizar com o Google Tarefas no momento.'));
  }
};

export const syncSelectedCardsToGoogleTasks = async (cardIds: string[]) => {
  try {
    toast.info(`Sincronizando ${cardIds.length} cartão(ões) com o Google Tarefas...`);

    const { data: cards, error } = await supabase
      .from('cards')
      .select('*')
      .in('id', cardIds);

    if (error || !cards || cards.length === 0) return;

    for (const card of cards) {
      await syncCardToGoogleTasks(card.id);
    }
    toast.success(`🎉 Sincronizados ${cards.length} cartão(ões) selecionado(s) no Google Tarefas!`);
  } catch (err: any) {
    toast.error(getFriendlyErrorMessage(err, 'Não foi possível sincronizar com o Google Tarefas no momento.'));
  }
};

export const syncGoogleTasksToDevban = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: resources } = await supabase
      .from('google_resources')
      .select('*')
      .eq('resource_type', 'task');

    if (!resources || resources.length === 0) return;

    const res = await callGoogleTasksApi('https://tasks.googleapis.com/v1/lists/@default/tasks?showCompleted=true&showHidden=true');
    if (!res.ok) return;

    const data = await res.json();
    const googleTasks = data.items || [];

    for (const resource of resources) {
      const gTask = googleTasks.find((t: any) => t.id === resource.resource_id);
      if (gTask) {
        const updateData: any = {};

        if (gTask.title) {
          updateData.title = gTask.title;
        }

        if (gTask.due) {
          updateData.due_date = new Date(gTask.due).toISOString();
        }

        if (gTask.status === 'completed') {
          updateData.is_completed = true;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('cards')
            .update(updateData)
            .eq('id', resource.devban_entity_id);
        }
      }
    }
  } catch (err) {
    console.error('Error syncing Google Tasks to Devban:', err);
  }
};
