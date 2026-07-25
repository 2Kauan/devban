export const getGCalEventId = (cardId: string): string => {
  const cleanUuid = cardId.replace(/-/g, '').toLowerCase();
  return `devban${cleanUuid}`;
};

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
