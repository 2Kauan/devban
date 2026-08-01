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
  'meta-llama/llama-3.2-11b-vision-instruct'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${userError?.message || 'No user'}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { prompt, messageContent } = await req.json();

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Chave da OpenRouter (OPENROUTER_API_KEY) não configurada no servidor." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const finalContent = messageContent || prompt;
    let lastError: Error | null = null;

    for (const model of FALLBACK_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://devban.app',
            'X-Title': 'DevBan',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
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
          throw new Error(`Erro na API OpenRouter (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0]?.message?.content;

        if (!rawContent) {
          throw new Error('Retorno vazio da API de IA.');
        }

        const cleanJsonString = rawContent
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const parsedData = JSON.parse(cleanJsonString);

        if (!parsedData.columns || !Array.isArray(parsedData.columns)) {
          throw new Error('A estrutura JSON retornada pela IA é inválida ou não contém colunas.');
        }

        return new Response(JSON.stringify(parsedData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      } catch (error: any) {
        lastError = error;
      }
    }

    return new Response(JSON.stringify({ error: `Todos os modelos falharam no fallback: ${lastError?.message}` }), {
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
