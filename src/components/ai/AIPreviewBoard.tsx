import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AIKanbanBoard } from '@/types/ai';
import { useAIImport } from '@/hooks/ai/useAIImport';
import { BrainCircuit, ArrowRight, ArrowDownRight, ArrowUpRight, AlertCircle, Clock, ListChecks, ListTree } from 'lucide-react';
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

  const updateColumnTitle = (colIndex: number, newTitle: string) => {
    const newBoard = { ...board };
    newBoard.columns[colIndex].title = newTitle;
    setBoard(newBoard);
  };

  const updateTaskField = (colIndex: number, taskIndex: number, field: 'title' | 'description', value: string) => {
    const newBoard = { ...board };
    newBoard.columns[colIndex].tasks[taskIndex][field] = value;
    setBoard(newBoard);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header de Revisão */}
      <div className="shrink-0 p-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-primary" />
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
              <input 
                className="font-bold text-foreground bg-transparent focus:outline-none focus:border-b border-primary/50 flex-1 mr-2 min-w-0"
                value={col.title}
                onChange={(e) => updateColumnTitle(cIdx, e.target.value)}
              />
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">
                {col.tasks.length}
              </span>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-4">
              {col.tasks.map((task, tIdx) => {
                // Configuração das cores de Prioridade
                const priorityColors: Record<string, string> = {
                  low: 'text-muted-foreground',
                  medium: 'text-blue-500',
                  high: 'text-amber-500',
                  urgent: 'text-destructive',
                };
                const priorityKey = task.priority || 'medium';
                const PriorityIcon = {
                  low: ArrowDownRight,
                  medium: ArrowRight,
                  high: ArrowUpRight,
                  urgent: AlertCircle,
                }[priorityKey];

                return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (cIdx * 0.1) + (tIdx * 0.05) }}
                  key={task.id} 
                  className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors group relative"
                >
                  {/* Left Column Color / Priority Indicator */}
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-md ${
                    task.priority === 'urgent' ? 'bg-destructive' :
                    task.priority === 'high' ? 'bg-amber-500' : 
                    task.priority === 'medium' ? 'bg-blue-500' : 'bg-muted'
                  }`} />
                  
                  <input 
                    className="w-full bg-transparent font-semibold text-foreground focus:outline-none focus:border-b border-primary/50 text-sm mb-2"
                    value={task.title}
                    onChange={(e) => updateTaskField(cIdx, tIdx, 'title', e.target.value)}
                  />
                  
                  <textarea 
                    className="w-full bg-transparent text-xs text-muted-foreground leading-relaxed focus:outline-none focus:ring-1 ring-primary/30 rounded resize-none custom-scrollbar"
                    value={task.description || ''}
                    rows={3}
                    onChange={(e) => updateTaskField(cIdx, tIdx, 'description', e.target.value)}
                    placeholder="Sem descrição..."
                  />
                  
                  <div className="flex items-center justify-between mt-2 pl-1">
                    <div className="flex items-center gap-2.5">
                      {/* Priority Icon */}
                      <span className={`flex items-center ${priorityColors[priorityKey] || ''} opacity-70`} title={`Prioridade: ${priorityKey}`}>
                        <PriorityIcon size={12} strokeWidth={2.5} />
                      </span>

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.tags.map(tag => (
                            <div 
                              key={tag.name}
                              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 bg-muted/20 truncate max-w-[100px]"
                            >
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                              <span className="truncate">{tag.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Due Date */}
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1" title="Prazo Identificado">
                          <Clock size={10} />
                          {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {(task.checklist && task.checklist.length > 0) || (task.subtasks && task.subtasks.length > 0) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {task.checklist && task.checklist.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/5 border border-primary/10 w-fit px-2 py-1 rounded-md">
                          <ListChecks size={13} />
                          {task.checklist.length} itens sugeridos
                        </div>
                      )}
                      
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 w-fit px-2 py-1 rounded-md">
                          <ListTree size={13} />
                          {task.subtasks.length} sub-tarefas ocultas
                        </div>
                      )}
                    </div>
                  ) : null}
                </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
