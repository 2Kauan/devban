import type { Category, Profile } from './database';

export interface KanbanColumnType {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  color?: string | null;
  position: number;
  is_completed?: boolean;
}

export interface KanbanCardType {
  id: string;
  project_id: string;
  column_id: string;
  parent_id?: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  border_color: string | null;
  position: number;
  created_by: string | null;
  assignees?: Profile[];
  categories?: Category[];
  comments_count?: number;
  external_link?: string | null;
}
