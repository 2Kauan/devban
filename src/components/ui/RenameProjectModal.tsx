import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  onSuccess: () => void;
}

export function RenameProjectModal({ isOpen, onClose, projectName, projectId, onSuccess }: RenameProjectModalProps) {
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewName(projectName);
    }
  }, [isOpen, projectName]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === projectName) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: newName.trim() })
        .eq('id', projectId);
      
      if (error) throw error;
      toast.success('Nome do projeto atualizado!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao editar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
              <div className="flex items-center gap-2 text-foreground">
                <Edit2 size={20} />
                <h2 className="text-lg font-bold">Editar Nome do Projeto</h2>
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Novo nome
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do projeto"
                  className="w-full bg-background border border-border/60 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/30 border-t border-border/60">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleRename}
                disabled={isLoading || !newName.trim()}
                className="px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
