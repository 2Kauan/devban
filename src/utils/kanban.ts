import type { KanbanCardType } from '@/types/kanban';

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function compareByPriority(a: KanbanCardType, b: KanbanCardType): number {
  const orderA = PRIORITY_ORDER[a.priority] ?? 2;
  const orderB = PRIORITY_ORDER[b.priority] ?? 2;
  if (orderA !== orderB) return orderA - orderB;
  return a.position - b.position;
}

export function compareByCategory(a: KanbanCardType, b: KanbanCardType): number {
  const catA = a.categories && a.categories.length > 0 ? a.categories[0].name : '';
  const catB = b.categories && b.categories.length > 0 ? b.categories[0].name : '';

  // Cards with categories come first, cards without categories go to the bottom
  if (catA && !catB) return -1;
  if (!catA && catB) return 1;
  if (!catA && !catB) return a.position - b.position;

  const comp = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'base' });
  if (comp !== 0) return comp;
  return a.position - b.position;
}

export function reorderCardsByPriority(cards: KanbanCardType[]): KanbanCardType[] {
  const sorted = [...cards].sort(compareByPriority);

  return sorted.map((card, index) => ({
    ...card,
    position: (index + 1) * 1000,
  }));
}

export function reorderCardsByCategory(cards: KanbanCardType[]): KanbanCardType[] {
  const sorted = [...cards].sort(compareByCategory);

  return sorted.map((card, index) => ({
    ...card,
    position: (index + 1) * 1000,
  }));
}
