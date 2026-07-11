import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  isFree?: boolean;
  isUsed?: boolean;
  onSuccess: () => void;
}

export function DeleteProjectModal({ isOpen, onClose, projectName, projectId, isFree, isUsed, onSuccess }: DeleteProjectModalProps) {
  const [confirmName, setConfirmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (confirmName !== projectName) {
      toast.error('O nome digitado não confere.');
      return;
    }

    setIsLoading(true);
    try {
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

  const showSlotWarning = isFree && isUsed;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-card w-full max-w-md rounded-2xl border border-border shadow-lg z-10 overflow-hidden relative flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                <h2 className="text-lg font-bold">Excluir Projeto</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isUsed ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl space-y-2">
                  <p className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> Ação Bloqueada</p>
                  <p className="text-sm">Você não pode excluir este projeto porque já o utilizou no Kanban.</p>
                  <p className="text-sm">Projetos que já tiveram movimentações ficam registrados permanentemente para manter a consistência dos seus limites e histórico.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o projeto <strong className="text-foreground">{projectName}</strong> e todos os seus dados associados.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Para confirmar, digite o nome do projeto:
                    </label>
                    <input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={projectName}
                      className="w-full bg-background border border-border/60 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-destructive/50 focus:ring-1 focus:ring-destructive/50 transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && confirmName === projectName) {
                          handleDelete();
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/30 border-t border-border/60">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {isUsed ? 'Entendi' : 'Cancelar'}
              </button>
              {!isUsed && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading || confirmName !== projectName}
                  className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-semibold rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    'Excluir'
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
