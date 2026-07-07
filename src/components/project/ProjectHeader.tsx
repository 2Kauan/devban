import { Link } from 'react-router-dom';
import { ArrowLeft, Share2, Search, Filter, Bell } from 'lucide-react';
import type { Project as ProjectType, ProjectPermission } from '@/types/database';

interface ProjectHeaderProps {
  project: ProjectType;
  columnsCount: number;
  cardsCount: number;
  userPermission: ProjectPermission | 'viewer';
  pendingRequestsCount: number;
  onOpenAccessRequests: () => void;
  onOpenShare: () => void;
}

export function ProjectHeader({
  project,
  columnsCount,
  cardsCount,
  userPermission,
  pendingRequestsCount,
  onOpenAccessRequests,
  onOpenShare
}: ProjectHeaderProps) {
  return (
    <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>{columnsCount} colunas</span>
            <span className="w-1 h-1 bg-border rounded-full"></span>
            <span>{cardsCount} tarefas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {userPermission === 'owner' && (
          <button
            onClick={onOpenAccessRequests}
            className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
            title="Solicitações de Acesso"
          >
            <Bell size={20} />
            {pendingRequestsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>
        )}
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
          />
        </div>
        <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent rounded-lg transition-colors" title="Filtrar">
          <Filter size={18} />
        </button>
        <div className="w-px h-6 bg-border mx-1"></div>
        <button 
          onClick={onOpenShare}
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-medium rounded-lg transition-colors text-sm"
        >
          <Share2 size={16} />
          Compartilhar
        </button>
      </div>
    </header>
  );
}
