import { useState, useRef, type DragEvent } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Send, Target, FastForward } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import type { AIGenerationMode } from '@/types/ai';

interface AIUploaderProps {
  onGenerate: (mode: AIGenerationMode, text: string, files: File[]) => void;
}

const modeItems = [
  { key: 'planning' as const, icon: Target, label: 'Criar Projeto', desc: 'Cria um novo quadro com a estrutura completa do projeto.' },
  { key: 'sprint' as const, icon: FastForward, label: 'Tarefas da Semana', desc: 'Organiza as tarefas da semana de forma prática e acionável.' },
  { key: 'summary' as const, icon: FileText, label: 'Extrair Ações da Semana', desc: 'Extrai ações e decisões definidas na reunião da semana.' },
];

export function AIUploader({ onGenerate }: AIUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<'planning' | 'summary' | 'sprint'>('planning');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    // Only accept basic text, images, and pdfs for now
    const validFiles = newFiles.filter(f => 
      f.type.startsWith('image/') || 
      f.type === 'application/pdf' || 
      f.type.startsWith('text/')
    );
    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // limit to 5
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!inputText.trim() && files.length === 0) return;
    onGenerate(mode, inputText, files);
  };

  return (
    <div className="w-full space-y-6">
      {/* Mode Selection */}
      <LayoutGroup>
        <div className="flex flex-wrap gap-3">
          {modeItems.map((item) => {
            const Icon = item.icon;
            const isActive = mode === item.key;
            return (
              <motion.button
                key={item.key}
                layout
                onClick={() => setMode(item.key)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive 
                    ? 'text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{ zIndex: isActive ? 1 : 0 }}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-bg"
                    className="absolute inset-0 bg-primary rounded-full shadow-md"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <motion.span
                  className="relative flex items-center gap-2"
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <motion.span
                    animate={{ rotate: isActive ? [0, -10, 10, 0] : 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <Icon size={16} />
                  </motion.span>
                  {item.label}
                </motion.span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p 
            key={mode}
            initial={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="text-sm text-muted-foreground ml-1 mt-1"
          >
            {modeItems.find(m => m.key === mode)?.desc}
          </motion.p>
        </AnimatePresence>
      </LayoutGroup>

      <div 
        className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 bg-card overflow-hidden ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.01]' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4 md:p-6 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UploadCloud size={24} />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Arraste e solte seus documentos aqui
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Suporta PDF, Imagens (PNG, JPG) e Texto.
          </p>
          
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            multiple 
            accept="image/*,.pdf,text/*"
            onChange={(e) => {
              if (e.target.files) handleFiles(Array.from(e.target.files));
            }}
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 px-4 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Procurar Arquivos
          </button>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="bg-muted/30 border-t border-border p-4 flex flex-wrap gap-3">
            <AnimatePresence>
              {files.map((file, idx) => (
                <motion.div 
                  key={`${file.name}-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 text-sm shadow-sm"
                >
                  {file.type.startsWith('image/') ? <ImageIcon size={14} className="text-blue-500" /> : <FileText size={14} className="text-red-500" />}
                  <span className="max-w-[120px] truncate font-medium">{file.name}</span>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-muted-foreground hover:text-red-500 ml-1"
                  >
                    &times;
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Manual Text Input */}
      <div className="relative group flex flex-col mt-4">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ou cole anotações, requisitos de sistema, transcrições..."
          className="w-full h-32 bg-card border-2 border-border/50 rounded-3xl p-5 pr-16 resize-none focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 shadow-sm hover:shadow-md custom-scrollbar block text-foreground"
        />
        <button 
          onClick={handleGenerate}
          disabled={!inputText.trim() && files.length === 0}
          className="absolute right-3 bottom-3 p-3.5 bg-primary text-primary-foreground rounded-2xl shadow-lg hover:shadow-primary/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center group/btn"
        >
          <Send size={18} className="transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
