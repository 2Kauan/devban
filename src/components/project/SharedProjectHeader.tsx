import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import type { Project as ProjectType } from '@/types/database';

interface SharedProjectHeaderProps {
  project: ProjectType;
  columnsCount: number;
  cardsCount: number;
  isJoining: boolean;
  onJoinProject: () => void;
  isAuthenticated: boolean;
}

export function SharedProjectHeader({
  project,
  columnsCount,
  cardsCount,
  isJoining,
  onJoinProject,
  isAuthenticated
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
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold uppercase">Modo Visualização Pública</span>
              <span className="w-1 h-1 bg-border rounded-full"></span>
            </>
            <span>{columnsCount} colunas</span>
            <span className="w-1 h-1 bg-border rounded-full"></span>
            <span>{cardsCount} tarefas</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <button
            onClick={onJoinProject}
            disabled={isJoining}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            {isJoining ? 'Enviando Pedido...' : 'Solicitar Acesso à Equipe'}
          </button>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground hover:bg-border rounded-lg font-medium transition-colors"
          >
            <LogIn size={18} />
            Fazer Login para Solicitar
          </Link>
        )}
      </div>
    </header>
  );
}
