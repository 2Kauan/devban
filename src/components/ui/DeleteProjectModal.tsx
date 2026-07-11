import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  isUsed?: boolean;
  isFree?: boolean;
  onSuccess: () => void;
}

export function DeleteProjectModal({ isOpen, onClose, projectName, projectId, isUsed, isFree, onSuccess }: DeleteProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // Fallback de segurança: garantir que a vaga gratuita fique marcada como consumida
      // caso a trigger do banco falhe por questões de RLS
      if (isUsed && isFree) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from('profiles').update({ free_slot_consumed: true }).eq('id', userData.user.id);
        }
      }

      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      toast.success('Projeto excluído com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao excluir projeto: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isLoading && onClose()}
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
                    Tem certeza que deseja apagar o projeto <strong className="text-foreground">{projectName}</strong>? Todas as tarefas e configurações serão excluídas permanentemente.
                  </p>
                </div>
              </div>

              {isUsed ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex gap-3 items-start mt-5">
                  <span className="shrink-0 text-destructive mt-0.5"><AlertTriangle size={16} /></span>
                  <div className="text-[13px] text-destructive leading-relaxed font-medium">
                    <p className="font-bold mb-1">Atenção: Vaga Consumida</p>
                    <p>Como você já mexeu no Kanban, você poderá excluir este projeto, mas terá que adquirir um plano para criar um novo, pois a vaga já foi consumida.</p>
                    <p className="mt-1">Se o projeto não tivesse sido mexido, você poderia criar outro sem pagar. Deseja prosseguir?</p>
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
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-5 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20 transition-all font-bold text-sm flex items-center gap-2 active:scale-95"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Sim, quero apagar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
