export type AIGenerationMode = 'planning' | 'summary' | 'sprint' | 'documentation';

export interface AIKanbanTask {
  id: string; // Temporary ID for frontend tracking
  title: string;
  description?: string;
  category_id?: string;
  assigned_to?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  checklist?: string[]; // Simplified checklist items
  tags?: { name: string; color: string }[];
}

export interface AIKanbanColumn {
  id: string; // Temporary ID
  title: string; // Backlog, To Do, In Progress, etc.
  tasks: AIKanbanTask[];
}

export interface AIKanbanBoard {
  title: string;
  description?: string;
  columns: AIKanbanColumn[];
  suggested_categories?: { id: string; name: string; color: string }[];
}

export interface AIProcessingState {
  status: 'idle' | 'uploading' | 'ocr' | 'generating' | 'success' | 'error';
  progress: number; // 0 to 100
  message: string;
}
