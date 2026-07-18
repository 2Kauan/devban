import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Category } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';

interface TagSelectorProps {
  selectedTags: Category[];
  projectTags: Category[];
  onToggleTag: (tag: Category) => void;
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag?: (tag: Category) => void;
  canEdit?: boolean;
}

const TAG_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
];

export function TagSelector({ selectedTags, projectTags, onToggleTag, onCreateTag, onDeleteTag, canEdit = true }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const creatingFormRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && popoverContentRef.current) {
      const timer = setTimeout(() => {
        popoverContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isCreating && creatingFormRef.current) {
      const timer = setTimeout(() => {
        creatingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isCreating]);

  const handleCreate = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex flex-wrap gap-2 items-center">
        {selectedTags.map(tag => (
          <span 
            key={tag.id}
            className="px-2.5 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            {canEdit && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onToggleTag(tag);
                }}
                className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="bg-background border border-border border-dashed rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted-foreground hover:text-background transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} /> {selectedTags.length > 0 ? 'Adicionar' : 'Adicionar Etiqueta'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            ref={popoverContentRef}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20"
          >
            <div className="p-3 border-b border-border/50 bg-muted/30">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {isCreating ? 'Nova Etiqueta' : 'Etiquetas do Projeto'}
              </h4>
            </div>

            <div className="p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
              {isCreating ? (
                <div ref={creatingFormRef} className="space-y-4 p-1">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Nome da Etiqueta</label>
                    <input 
                      type="text"
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Ex: Frontend, Bug..."
                      className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Cor</label>
                    <div className="flex flex-wrap gap-2">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${newTagColor === color ? 'ring-2 ring-primary ring-offset-1 ring-offset-card scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }}
                        >
                          {newTagColor === color && <Check size={14} className="text-white drop-shadow-md" />}
                        </button>
                      ))}
                      
                      <div className="w-[1px] h-6 bg-border mx-1" />
                      
                      <label className="relative flex items-center justify-center cursor-pointer group" title="Cor personalizada (Hexadecimal)">
                        <input
                          type="color"
                          value={newTagColor || '#ffffff'}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div 
                          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center border-dashed group-hover:border-primary ${!TAG_COLORS.includes(newTagColor) ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-card scale-110' : 'border-muted-foreground/50'}`}
                          style={{ backgroundColor: !TAG_COLORS.includes(newTagColor) ? newTagColor : 'transparent' }}
                        >
                          {!TAG_COLORS.includes(newTagColor) && <Check size={14} className="text-white drop-shadow-md mix-blend-difference" />}
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="flex-1 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={handleCreate}
                      disabled={!newTagName.trim()}
                      className="flex-1 px-3 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {projectTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma etiqueta criada no projeto.</p>
                  ) : (
                    projectTags.map(tag => {
                      const isSelected = selectedTags.some(t => t.id === tag.id);
                      return (
                        <div
                          key={tag.id}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group"
                        >
                          <button
                            type="button"
                            onClick={() => onToggleTag(tag)}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            <div className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: tag.color }} />
                            <span className="text-sm font-medium text-foreground truncate">{tag.name}</span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected && <Check size={14} className="text-primary" />}
                            {canEdit && onDeleteTag && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTag(tag);
                                }}
                                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                title="Excluir etiqueta"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  <div className="pt-2 mt-2 border-t border-border/50">
                    <button 
                      type="button"
                      onClick={() => setIsCreating(true)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus size={16} />
                      Criar Nova Etiqueta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
