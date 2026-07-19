import type { KanbanCardType } from '@/types/kanban';
import { motion } from 'framer-motion';

interface CalendarEventProps {
  event: KanbanCardType;
  onClick: (event: KanbanCardType) => void;
  isHighlighted?: boolean;
}

export function CalendarEvent({ event, onClick, isHighlighted }: CalendarEventProps) {
  const category = event.categories?.[0];
  let color = category?.color || event.border_color || 'blue-500';
  
  // Extrair horário se existir na string ISO (ex: "2023-10-12T14:30:00")
  let timeStr = '';
  if (event.due_date && event.due_date.includes('T')) {
    const timePart = event.due_date.split('T')[1];
    if (timePart && timePart !== '00:00:00.000Z') {
      timeStr = timePart.substring(0, 5);
    }
  }

  let isLate = false;
  const isCompleted = event.is_completed || false;
  if (event.due_date && !isCompleted) {
    const due = new Date(event.due_date);
    if (due < new Date()) {
      isLate = true;
    }
  }

  if (isCompleted) {
    color = 'green-500';
  } else if (isLate) {
    color = 'red-500';
  }

  // Handle native drag
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.effectAllowed = 'move';
    // Pequeno delay para a UI ficar limpa durante o drag
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.target as HTMLElement;
    el.style.opacity = '1';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => {
        // Deixa o evento de drag passar para a célula pai (dia)
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(event);
        }}
        className={`relative flex items-center px-2 py-1 mb-1 text-xs rounded-md cursor-pointer overflow-hidden transition-all hover:scale-[1.02] shadow-sm ${isHighlighted ? 'ring-2 ring-primary' : ''} ${event.is_completed ? 'opacity-60 grayscale-[0.2]' : ''}`}
        style={{
          backgroundColor: `rgba(var(--color-${color}), 0.1)`,
        }}
      >
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
          style={{ backgroundColor: color.startsWith('#') ? color : `var(--color-${color})` }}
        />
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${color}`} />
        
        <div className="flex-1 truncate pl-1 font-medium text-foreground">
          {timeStr && <span className="text-muted-foreground mr-1 text-[10px] font-normal">{timeStr}</span>}
          {event.title}
        </div>
      </motion.div>
    </div>
  );
}
