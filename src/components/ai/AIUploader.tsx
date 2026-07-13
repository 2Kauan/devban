import { useState, useRef, type DragEvent } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Send, Target, FastForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIGenerationMode } from '@/types/ai';

interface AIUploaderProps {
  onGenerate: (mode: AIGenerationMode, text: string, files: File[]) => void;
}

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
      <div className="flex flex-wrap gap-3">
        {(['planning', 'sprint', 'summary'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === m 
                ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {m === 'planning' && <><Target size={16} /> Planejamento</>}
            {m === 'sprint' && <><FastForward size={16} /> Sprint Backlog</>}
            {m === 'summary' && <><FileText size={16} /> Resumo de Reunião</>}
          </button>
        ))}
      </div>
      
      <AnimatePresence mode="wait">
        <motion.p 
          key={mode}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-muted-foreground ml-1"
        >
          {mode === 'planning' && 'Gera um Kanban estrutural focado na visão macro e grandes fases do projeto.'}
          {mode === 'sprint' && 'Quebra o escopo em tarefas curtas e acionáveis para o dia a dia.'}
          {mode === 'summary' && 'Extrai apenas as "ações práticas" e acordos definidos em uma reunião.'}
        </motion.p>
      </AnimatePresence>

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
        <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Arraste e solte seus documentos aqui
          </h3>
          <p className="text-muted-foreground max-w-sm">
            Suporta PDF, Imagens (PNG, JPG) e Texto. A IA lerá o conteúdo para gerar as tarefas.
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
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
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
      <div className="relative group flex flex-col">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ou cole anotações, requisitos de sistema, transcrições..."
          className="w-full h-32 bg-card border border-border rounded-2xl p-4 pr-16 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all custom-scrollbar block"
        />
        <button 
          onClick={handleGenerate}
          disabled={!inputText.trim() && files.length === 0}
          className="absolute right-3 bottom-3 p-2.5 bg-primary text-primary-foreground rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
