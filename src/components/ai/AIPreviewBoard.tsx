import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AIKanbanBoard } from '@/types/ai';
import { useAIImport } from '@/hooks/ai/useAIImport';
import { Sparkles, ArrowRight, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIPreviewBoardProps {
  board: AIKanbanBoard;
  projectId: string;
  onCancel: () => void;
}

export function AIPreviewBoard({ board: initialBoard, projectId, onCancel }: AIPreviewBoardProps) {
  const [board, setBoard] = useState(initialBoard);
  const { importBoard, isImporting } = useAIImport();
  const navigate = useNavigate();

  const handleImport = async () => {
    const success = await importBoard(projectId, board);
    if (success) {
      onCancel(); // Limpa a memória rápida
      navigate(`/project/${projectId}`); // Redireciona para o Kanban
    }
  };

  // Permite edição leve dos títulos gerados antes da importação
  const updateTaskTitle = (colIndex: number, taskIndex: number, newTitle: string) => {
    const newBoard = { ...board };
    newBoard.columns[colIndex].tasks[taskIndex].title = newTitle;
    setBoard(newBoard);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header de Revisão */}
      <div className="shrink-0 p-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary" />
            Revisão do Planejamento
          </h2>
          <p className="text-muted-foreground mt-1">
            A IA gerou {board.columns.length} colunas com tarefas. Revise e edite se necessário antes de importar.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            disabled={isImporting}
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Descartar
          </button>
          <button 
            onClick={handleImport}
            disabled={isImporting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
          >
            {isImporting ? 'Importando...' : 'Importar para o Projeto'}
            {!isImporting && <ArrowRight size={18} />}
          </button>
        </div>
      </div>

      {/* Kanban Preview Horizontal Scroll */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 custom-scrollbar">
        {board.columns.map((col, cIdx) => (
          <div key={col.id} className="w-[320px] shrink-0 flex flex-col max-h-full">
            {/* Column Header */}
            <div className="bg-muted/40 rounded-t-xl p-3 border-b-2 border-primary/20 mb-3 flex items-center justify-between">
              <h3 className="font-bold text-foreground">{col.title}</h3>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">
                {col.tasks.length}
              </span>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
              {col.tasks.map((task, tIdx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (cIdx * 0.1) + (tIdx * 0.05) }}
                  key={task.id} 
                  className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors group relative"
                >
                  {/* Priority Indicator */}
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-md ${
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  
                  <input 
                    className="w-full bg-transparent font-semibold text-foreground focus:outline-none focus:border-b border-primary/50 text-sm mb-2"
                    value={task.title}
                    onChange={(e) => updateTaskTitle(cIdx, tIdx, e.target.value)}
                  />
                  
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                  
                  {task.checklist && task.checklist.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 w-fit px-2 py-1 rounded-md">
                      <ListChecks size={14} />
                      {task.checklist.length} itens de checklist
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
