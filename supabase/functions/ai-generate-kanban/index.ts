import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_MODELS = [
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
  'anthropic/claude-3-haiku',
  'meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-r1'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = authHeader ? authHeader.replace('Bearer ', '') : '';

    if (token) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          {
            global: {
              headers: { Authorization: authHeader || '' },
            },
          }
        );
        await supabaseClient.auth.getUser(token);
      } catch (_) {
        // Não bloqueia requisições
      }
    }

    const { prompt, messageContent } = await req.json();

    let openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (openrouterKey) {
      openrouterKey = openrouterKey.replace(/^(sk-or-v1-)+/, 'sk-or-v1-').trim();
    }
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openrouterKey && !geminiKey && !openaiKey) {
      return new Response(JSON.stringify({ 
        error: "Nenhuma chave de IA foi configurada no Supabase. Por favor, execute no terminal: npx supabase secrets set OPENROUTER_API_KEY=sua_chave (ou GEMINI_API_KEY=sua_chave)" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const finalContent = messageContent || prompt;
    let lastError: Error | null = null;

    // 1. Tenta OpenRouter com fallback sequencial entre GPT, Gemini, Claude, Llama e Deepseek
    if (openrouterKey) {
      for (const model of FALLBACK_MODELS) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'https://devban.app',
              'X-Title': 'DevBan',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              temperature: 0.1,
              max_tokens: 4096,
              messages: [
                {
                  role: 'user',
                  content: finalContent
                }
              ]
            })
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Modelo ${model} falhou (${response.status}): ${errorData}`);
          }

          const data = await response.json();
          const rawContent = data.choices[0]?.message?.content;

          if (!rawContent) {
            throw new Error(`Retorno vazio da API para modelo ${model}.`);
          }

          const cleanJsonString = rawContent
            .replace(/```json\n?/gi, '')
            .replace(/```\n?/g, '')
            .trim();
          
          const parsedData = JSON.parse(cleanJsonString);

          if (!parsedData.columns || !Array.isArray(parsedData.columns)) {
            throw new Error(`JSON retornado pelo modelo ${model} é inválido.`);
          }

          return new Response(JSON.stringify(parsedData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });

        } catch (error: any) {
          console.warn(`[Edge Function AI] Modelo ${model} falhou, tentando o próximo...`, error?.message);
          lastError = error;
        }
      }
    }

    // 2. Fallback direto para Google Gemini API (caso GEMINI_API_KEY esteja cadastrado)
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
            contents: [{ parts: [{ text: typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent) }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawContent) {
            const cleanJsonString = rawContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
            const parsedData = JSON.parse(cleanJsonString);
            if (parsedData.columns && Array.isArray(parsedData.columns)) {
              return new Response(JSON.stringify(parsedData), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              });
            }
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    // 3. Fallback direto para OpenAI API (caso OPENAI_API_KEY esteja cadastrado)
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.1,
            max_tokens: 4096,
            messages: [{ role: 'user', content: typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent) }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices?.[0]?.message?.content;
          if (rawContent) {
            const cleanJsonString = rawContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
            const parsedData = JSON.parse(cleanJsonString);
            if (parsedData.columns && Array.isArray(parsedData.columns)) {
              return new Response(JSON.stringify(parsedData), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              });
            }
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    return new Response(JSON.stringify({ error: `Todos os modelos de IA falharam: ${lastError?.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 502,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
