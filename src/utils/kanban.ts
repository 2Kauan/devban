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

export function reorderCardsByPriority(cards: KanbanCardType[]): KanbanCardType[] {
  const sorted = [...cards].sort(compareByPriority);

  return sorted.map((card, index) => ({
    ...card,
    position: (index + 1) * 1000,
  }));
}
