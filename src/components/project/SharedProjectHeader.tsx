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
    <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold uppercase">Modo Visualização</span>
              <span className="w-1 h-1 bg-border rounded-full"></span>
            </>
            <span>{columnsCount} colunas</span>
            <span className="w-1 h-1 bg-border rounded-full"></span>
            <span>{cardsCount} tarefas</span>
          </div>
        </div>
      </div>
    </header>
  );
}
