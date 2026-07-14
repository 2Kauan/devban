import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Search, Bell, Trash2, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project as ProjectType, ProjectPermission } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';


interface ProjectHeaderProps {
  project: ProjectType;
  columnsCount: number;
  cardsCount: number;
  userPermission: ProjectPermission | 'viewer';
  pendingRequestsCount: number;
  onOpenAccessRequests: () => void;
  onOpenShare: () => void;
  onOpenSidebar?: () => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export function ProjectHeader({
  project,
  columnsCount,
  cardsCount,
  userPermission,
  pendingRequestsCount,
  onOpenAccessRequests,
  onOpenShare,
  searchQuery,
  onSearch
}: ProjectHeaderProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      // Fallback de segurança: garantir que a vaga gratuita fique marcada como consumida
      // caso a trigger do banco falhe por questões de RLS
      if (project.is_used && project.is_free) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from('profiles').update({ free_slot_consumed: true }).eq('id', userData.user.id);
        }
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
      
      toast.success('Projeto excluído permanentemente.');
      setShowDeleteConfirm(false);
      setTimeout(() => {
        navigate('/projects');
      }, 300); // Wait for modal exit animation to prevent insertBefore DOM error
    } catch (error: any) {
      toast.error('Erro ao excluir projeto: ' + error.message);
      setIsDeleting(false);
    }
  };

  return (
    <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>{columnsCount} colunas</span>
            <span className="w-1 h-1 bg-border rounded-full"></span>
            <span>{cardsCount} tarefas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-4 md:mt-0">
        {userPermission === 'owner' && (
          <button
            onClick={onOpenAccessRequests}
            className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors shrink-0"
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
            value={searchQuery || ''}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
          />
        </div>
        <div className="w-px h-6 bg-border mx-1"></div>
        <button 
          onClick={onOpenShare}
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>

        {userPermission === 'owner' && (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground font-medium rounded-lg transition-colors text-sm whitespace-nowrap shrink-0"
            title="Apagar Projeto"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card w-full max-w-[440px] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)] border border-border/60 overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-6 pb-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                    <Trash2 size={20} />
                  </div>
                  <div className="pt-0.5">
                    <h2 className="text-lg font-bold tracking-tight text-foreground mb-1.5">Apagar Projeto</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Tem certeza que deseja apagar o projeto <strong className="text-foreground">{project.name}</strong>? Todas as tarefas e configurações serão excluídas permanentemente.
                    </p>
                  </div>
                </div>
                
                {project.is_used ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex gap-3 items-start mt-5 ml-14">
                    <span className="shrink-0 text-destructive mt-0.5"><AlertTriangle size={16} /></span>
                    <div className="text-[13px] text-destructive leading-relaxed font-medium">
                      <p className="font-bold mb-1">Atenção: Vaga Consumida</p>
                      <p>Como você já mexeu no Kanban, você poderá excluir este projeto, mas terá que comprar um novo.</p>
                      <p className="mt-1">Se não tivesse sido mexido, você poderia criar outro sem pagar.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-border/40 rounded-xl p-3.5 flex gap-3 items-start mt-5 ml-14">
                    <span className="shrink-0 text-muted-foreground mt-0.5"><Lightbulb size={16} /></span>
                    <p className="text-[13px] text-muted-foreground/90 font-medium leading-relaxed">
                      A boa notícia: seu limite será reajustado! Uma nova vaga será liberada para você criar um projeto no lugar deste.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border/40">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-semibold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20 transition-all font-bold text-sm flex items-center gap-2 active:scale-95"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Sim, quero apagar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
