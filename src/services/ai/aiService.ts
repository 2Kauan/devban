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

    let detailMsg = '';

    // 1. Tenta invocar via SDK do Supabase
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-kanban', {
        body: { prompt, messageContent }
      });

      if (!error && data && data.columns && Array.isArray(data.columns)) {
        return data as AIKanbanBoard;
      }

      if (error && (error as any).context) {
        try {
          const errBody = await (error as any).context.json();
          if (errBody?.error) detailMsg = errBody.error;
        } catch (_) {}
      }
      if (!detailMsg && error?.message) detailMsg = error.message;
      if (data?.error) detailMsg = data.error;
    } catch (err: any) {
      console.warn('[DevBan AI] Tentativa via SDK falhou, tentando fetch direto:', err);
    }

    // 2. Fallback via fetch direto para a Edge Function (melhor compatibilidade com APK móvel)
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const token = session?.access_token || anonKey;
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-kanban`;

      const response = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, messageContent })
      });

      const json = await response.json();
      if (response.ok && json?.columns && Array.isArray(json.columns)) {
        return json as AIKanbanBoard;
      }
      if (json?.error) {
        detailMsg = json.error;
      }
    } catch (fetchErr: any) {
      console.error('[DevBan AI] Erro no fetch direto da Edge Function:', fetchErr);
    }

    // 3. Fallback Tier 3: Chamada direta via API do OpenRouter com modelos gratuitos
    const clientModels = [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-r1:free'
    ];

    for (const model of clientModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://devban.app',
            'X-Title': 'DevBan AI'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: typeof messageContent === 'string' ? messageContent : prompt
              }
            ]
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent) continue;

        const cleanJsonString = rawContent
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();

        const parsedData = JSON.parse(cleanJsonString);
        if (parsedData.columns && Array.isArray(parsedData.columns)) {
          return parsedData as AIKanbanBoard;
        }
      } catch (clientErr) {
        console.warn(`[DevBan AI] Fallback modelo cliente ${model} falhou:`, clientErr);
      }
    }

    throw new Error(`Falha na IA (${detailMsg || 'Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.'}).`);
  }
};

