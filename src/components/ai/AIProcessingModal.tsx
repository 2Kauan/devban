import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AIProcessingState } from '@/types/ai';

interface AIProcessingModalProps {
  state: AIProcessingState;
  onClose: () => void;
}

export function AIProcessingModal({ state, onClose }: AIProcessingModalProps) {
  if (state.status === 'idle') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Progress Bar Background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-muted">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="mt-4 mb-6">
            {state.status === 'error' ? (
              <AlertCircle size={48} className="text-red-500" />
            ) : state.status === 'success' ? (
              <CheckCircle2 size={48} className="text-green-500" />
            ) : (
              <Loader2 size={48} className="text-primary animate-spin" />
            )}
          </div>

          <h3 className="text-lg font-bold text-foreground mb-2">
            {state.status === 'error' ? 'Falha no Processamento' : state.status === 'success' ? 'Concluído!' : 'Analisando Documentos'}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">
            {state.message}
          </p>

          {(state.status === 'error' || state.status === 'success') && (
            <button 
              onClick={onClose}
              className="w-full py-2 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Fechar
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
