import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2, Search, Filter, Bell, Menu, Pencil, Check, X } from 'lucide-react';
import type { Project as ProjectType, ProjectPermission } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

import { UserProfileButton } from '@/components/ui/UserProfileButton';

interface ProjectHeaderProps {
  project: ProjectType;
  columnsCount: number;
  cardsCount: number;
  userPermission: ProjectPermission | 'viewer';
  pendingRequestsCount: number;
  onOpenAccessRequests: () => void;
  onOpenShare: () => void;
  onOpenSidebar: () => void;
}

export function ProjectHeader({
  project,
  columnsCount,
  cardsCount,
  userPermission,
  pendingRequestsCount,
  onOpenAccessRequests,
  onOpenShare,
  onOpenSidebar
}: ProjectHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentName, setCurrentName] = useState(project.name);
  const [nameChanged, setNameChanged] = useState(project.name_changed);

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === currentName) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: newName.trim(), name_changed: true })
        .eq('id', project.id);

      if (error) throw error;

      setCurrentName(newName.trim());
      setNameChanged(true);
      toast.success('Nome do projeto atualizado com sucesso!');
      setIsEditingName(false);
    } catch (error: any) {
      toast.error('Erro ao atualizar nome: ' + error.message);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={onOpenSidebar}>
          <Menu size={24} />
        </button>
        <Link to="/dashboard" className="w-8 h-8 hidden md:flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSavingName}
                autoFocus
                className="text-xl font-bold text-foreground bg-background border border-border rounded px-2 py-1 outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button onClick={handleSaveName} disabled={isSavingName} className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                <Check size={16} />
              </button>
              <button onClick={() => setIsEditingName(false)} disabled={isSavingName} className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-xl font-bold text-foreground leading-tight">{currentName}</h1>
              {userPermission === 'owner' && !nameChanged && (
                <button
                  onClick={() => {
                    setNewName(currentName);
                    setIsEditingName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                  title="Alterar nome (Apenas uma vez)"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>{columnsCount} colunas</span>
            <span className="w-1 h-1 bg-border rounded-full"></span>
            <span>{cardsCount} tarefas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
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
        <div className="relative flex-1 min-w-[150px] sm:w-64">
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
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
        
        <div className="w-px h-6 bg-border mx-1"></div>
        <UserProfileButton />
      </div>
    </header>
  );
}
