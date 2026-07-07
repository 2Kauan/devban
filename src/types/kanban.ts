import type { Category } from './database';

export interface KanbanColumnType {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  color?: string | null;
  position: number;
}

export interface KanbanCardType {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  border_color: string | null;
  position: number;
  created_by: string | null;
  assigned_to: string | null;
  categories?: Category[];
}
