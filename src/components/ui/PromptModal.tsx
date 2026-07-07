import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function PromptModal({ isOpen, title, placeholder, onClose, onSubmit }: PromptModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) setValue('');
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card w-full max-w-sm rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)] border border-border overflow-hidden relative z-10"
          >
            <div className="flex justify-between items-center p-5 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground">
                {title}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); if(value.trim()) onSubmit(value); }} className="p-5 space-y-4">
              <input 
                type="text" 
                autoFocus
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={placeholder || 'Digite aqui...'}
                className="w-full px-4 py-3 bg-background border-2 border-border/60 hover:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground font-medium"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors font-bold text-sm">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!value.trim()}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover shadow-md transition-all font-bold text-sm active:scale-95 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
