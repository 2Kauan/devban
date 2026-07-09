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
      return new Response(JSON.stringify({ error: `Unauthorized` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error("paymentId is required");
    }

    // Initialize admin client to update DB securely
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the payment from database
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('asaas_payment_id, status, user_id')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error("Payment not found in database.");
    }

    if (payment.user_id !== user.id) {
       throw new Error("Unauthorized access to this payment.");
    }

    // If already confirmed in DB, just return
    if (payment.status === 'confirmed') {
      return new Response(JSON.stringify({ status: 'confirmed' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!payment.asaas_payment_id) {
       throw new Error("Asaas payment ID not found.");
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

    // Call Asaas to check payment status
    const asaasRes = await fetch(`${asaasBaseUrl}/payments/${payment.asaas_payment_id}`, {
      headers: { 'access_token': asaasApiKey }
    });
    
    if (!asaasRes.ok) {
       throw new Error(`Asaas API responded with status: ${asaasRes.status}`);
    }

    const asaasData = await asaasRes.json();
    
    let newStatus = payment.status;
    if (asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED') {
      newStatus = 'confirmed';
      // Update our DB if Asaas says it's paid
      await supabaseAdmin
        .from('payments')
        .update({ status: 'confirmed' })
        .eq('id', paymentId);
    } else if (asaasData.status === 'OVERDUE') {
      newStatus = 'failed';
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);
    }

    return new Response(JSON.stringify({ status: newStatus }), {
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
