import type { AIKanbanBoard, AIGenerationMode } from '@/types/ai';
import { buildKanbanPrompt } from './promptBuilder';

const FALLBACK_MODELS = [
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.2-11b-vision-instruct'
];

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

      // Preenche fundo branco em caso de PNGs com transparência
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
 * Service to communicate with the LLM API (via Edge Function eventually, using local env for now)
 */
export const aiService = {
  generateKanban: async (
    _projectId: string, 
    mode: AIGenerationMode,
    text: string,
    files: File[] = []
  ): Promise<AIKanbanBoard> => {
    // O texto agora já chega concatenado com a extração de PDFs ou arquivos de texto
    const promptText = text.trim() ? text : 'Gere um kanban padrão baseado nestes arquivos e imagens fornecidos.';
    
    const prompt = buildKanbanPrompt(mode, promptText);
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('Chave da OpenRouter (VITE_OPENROUTER_API_KEY) não encontrada. Verifique seu arquivo .env.local.');
    }

    // Processa e comprime imagens para envio multimodal (Base64) se houver
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

    let lastError: Error | null = null;

    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[DevBan AI] Tentando modelo: ${model}...`);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:5173', // Your site URL
            'X-Title': 'DevBan',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: messageContent
              }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Erro na API (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0]?.message?.content;

        if (!rawContent) {
          throw new Error('Retorno vazio da API de IA.');
        }

        // Limpa formatação markdown caso a IA ignore a instrução
        const cleanJsonString = rawContent
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const parsedData = JSON.parse(cleanJsonString);
        
        // Verifica minimamente a estrutura básica exigida
        if (!parsedData.columns || !Array.isArray(parsedData.columns)) {
           throw new Error('A estrutura JSON retornada pela IA é inválida ou não contém colunas.');
        }

        console.log(`[DevBan AI] Sucesso com o modelo: ${model}`);
        return parsedData as AIKanbanBoard;
        
      } catch (error: any) {
        console.warn(`[DevBan AI] Falha ao usar o modelo ${model}:`, error.message);
        lastError = error;
        // Continue to the next model in the loop
      }
    }

    // Se o loop terminou e não retornou, todos os modelos falharam
    throw new Error(`Todos os modelos falharam no fallback. Último erro: ${lastError?.message}`);
  }
};
