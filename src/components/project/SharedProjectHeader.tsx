import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Project as ProjectType } from '@/types/database';

interface SharedProjectHeaderProps {
  project: ProjectType;
  columnsCount: number;
  cardsCount: number;
}

export function SharedProjectHeader({
  project,
  columnsCount,
  cardsCount,
}: SharedProjectHeaderProps) {
  return (
    <header className="bg-card border-b border-border py-2 px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate" title={project.name}>{project.name}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
            <>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase">Modo Visualização</span>
              <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
            </>
            <span>{columnsCount} colunas</span>
            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
            <span>{cardsCount} tarefas</span>
          </div>
        </div>
      </div>
    </header>
  );
}
