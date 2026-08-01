import type { AIKanbanBoard, AIGenerationMode } from '@/types/ai';
import { buildKanbanPrompt } from './promptBuilder';
import { supabase } from '@/lib/supabase';

/**
 * Redimensiona e comprime a imagem para no máximo 1200px para garantir envio leve (<200KB) e rápido para a visão da IA.
 */
const compressAndScaleImage = (file: File, maxDimension = 1200, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
};

/**
 * Service to communicate with the LLM API safely via Supabase Edge Function
 */
export const aiService = {
  generateKanban: async (
    _projectId: string, 
    mode: AIGenerationMode,
    text: string,
    files: File[] = []
  ): Promise<AIKanbanBoard> => {
    const promptText = text.trim() ? text : 'Gere um kanban padrão baseado nestes arquivos e imagens fornecidos.';
    const prompt = buildKanbanPrompt(mode, promptText);

    const imageFiles = files ? files.filter(f => f.type.startsWith('image/')) : [];
    let imageContentItems: any[] = [];

    if (imageFiles.length > 0) {
      try {
        const dataUrls = await Promise.all(imageFiles.map(file => compressAndScaleImage(file)));
        imageContentItems = dataUrls.map(url => ({
          type: 'image_url',
          image_url: { url }
        }));
      } catch (err) {
        console.warn('[DevBan AI] Erro ao comprimir e converter imagem para Data URL:', err);
      }
    }

    const messageContent = imageContentItems.length > 0
      ? [
          { type: 'text', text: prompt },
          ...imageContentItems
        ]
      : prompt;

    const { data, error } = await supabase.functions.invoke('ai-generate-kanban', {
      body: { prompt, messageContent }
    });

    if (error || !data) {
      throw new Error(`Falha na IA (${error?.message || 'Retorno vazio do servidor'}).`);
    }

    if (!data.columns || !Array.isArray(data.columns)) {
      throw new Error('A estrutura JSON retornada pela IA é inválida ou não contém colunas.');
    }

    return data as AIKanbanBoard;
  }
};

