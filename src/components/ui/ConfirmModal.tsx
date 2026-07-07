import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Excluir', cancelText = 'Cancelar' }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onCancel}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card w-full max-w-sm rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)] border border-border overflow-hidden relative z-[61]"
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={24} className="text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors font-bold text-sm">
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                  }}
                  className="px-5 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-red-700 shadow-md transition-all font-bold text-sm active:scale-95"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
