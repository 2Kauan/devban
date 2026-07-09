import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
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
      return new Response(JSON.stringify({ error: `Unauthorized - getUser failed: ${userError?.message || 'No user'}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error("paymentId is required");
    }

    const mode = Deno.env.get('ASAAS_MODE') === 'production' ? 'production' : 'sandbox';
    let asaasApiKey = '';
    let asaasBaseUrl = '';

    if (mode === 'production') {
      asaasApiKey = Deno.env.get('ASAAS_PROD_API_KEY') || Deno.env.get('ASAAS_API_KEY') || '';
      asaasBaseUrl = 'https://api.asaas.com/v3';
    } else {
      asaasApiKey = Deno.env.get('ASAAS_SANDBOX_API_KEY') || Deno.env.get('ASAAS_API_KEY') || '';
      asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';
    }

    if (!asaasApiKey) {
      throw new Error(`Chave de API do Asaas não configurada para o ambiente: ${mode}.`);
    }

    // 1. Get payment from Asaas using externalReference
    const paymentsRes = await fetch(`${asaasBaseUrl}/payments?externalReference=${paymentId}`, {
      headers: { 'access_token': asaasApiKey }
    });
    
    const paymentsData = await paymentsRes.json();
    
    // 2. Delete each payment found
    if (paymentsData.data && paymentsData.data.length > 0) {
      for (const asaasPayment of paymentsData.data) {
        // Only delete if it's pending/overdue
        if (['PENDING', 'OVERDUE'].includes(asaasPayment.status)) {
          const deleteRes = await fetch(`${asaasBaseUrl}/payments/${asaasPayment.id}`, {
            method: 'DELETE',
            headers: { 'access_token': asaasApiKey }
          });
          const deleteData = await deleteRes.json();
          if (deleteData.errors) {
            console.error('Error deleting payment in Asaas:', deleteData.errors);
          }
        }
      }
    }

    // 3. Mark payment as cancelled in Supabase
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('id', paymentId)
      .eq('user_id', user.id); // security check

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
