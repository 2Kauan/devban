import type { AIKanbanBoard, AIGenerationMode } from '@/types/ai';
import { buildKanbanPrompt } from './promptBuilder';

const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3-8b-instruct',
  'google/gemini-flash-1.5'
];

/**
 * Service to communicate with the LLM API (via Edge Function eventually, using local env for now)
 */
export const aiService = {
  generateKanban: async (
    _projectId: string, 
    mode: AIGenerationMode,
    text: string,
    _files: File[]
  ): Promise<AIKanbanBoard> => {
    // O texto agora já chega concatenado com a extração de PDFs ou arquivos de texto
    const promptText = text.trim() ? text : 'Gere um kanban padrão baseado nestes arquivos.';
    
    const prompt = buildKanbanPrompt(mode, promptText);
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('Chave da OpenRouter (VITE_OPENROUTER_API_KEY) não encontrada. Verifique seu arquivo .env.local.');
    }

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
                content: prompt
              }
            ],
            response_format: { type: 'json_object' } // Força o retorno em JSON em alguns provedores
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Erro na API (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        // Limpa formatação markdown caso a IA ignore a instrução
        const cleanJsonString = rawContent.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
        
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
