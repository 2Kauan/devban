import { useState } from 'react';
import { aiService } from '@/services/ai/aiService';
import type { AIGenerationMode, AIKanbanBoard, AIProcessingState } from '@/types/ai';

export function useAIProcessor(projectId: string) {
  // Tenta carregar da memória rápida
  const getSavedBoard = () => {
    try {
      const saved = localStorage.getItem(`ai_board_${projectId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const initialBoard = getSavedBoard();

  const [state, setState] = useState<AIProcessingState>({
    status: initialBoard ? 'success' : 'idle',
    progress: initialBoard ? 100 : 0,
    message: ''
  });
  
  const [result, setResult] = useState<AIKanbanBoard | null>(initialBoard);

  const process = async (mode: AIGenerationMode, text: string, files: File[]) => {
    try {
      setState({ status: 'uploading', progress: 10, message: 'Enviando arquivos...' });
      await new Promise(r => setTimeout(r, 600));

      setState({ status: 'ocr', progress: 40, message: 'Lendo conteúdo (OCR)...' });
      await new Promise(r => setTimeout(r, 1000));

      setState({ status: 'generating', progress: 70, message: 'Inteligência Artificial estruturando o Kanban...' });
      
      const board = await aiService.generateKanban(projectId, mode, text, files);

      setState({ status: 'success', progress: 100, message: 'Quadro gerado com sucesso!' });
      setResult(board);
      
      // Salva na memória rápida
      localStorage.setItem(`ai_board_${projectId}`, JSON.stringify(board));
    } catch (error: any) {
      setState({ status: 'error', progress: 0, message: error.message || 'Erro ao processar com a IA.' });
    }
  };

  const reset = () => {
    setState({ status: 'idle', progress: 0, message: '' });
    setResult(null);
    localStorage.removeItem(`ai_board_${projectId}`);
  };

  return { state, result, process, reset };
}
