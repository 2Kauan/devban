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

    const { method, paymentId } = await req.json();

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY') || Deno.env.get('VITE_ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('Chave de API do Asaas não configurada no servidor (ASAAS_API_KEY).');
    }

    const customUrl = Deno.env.get('ASAAS_API_URL') || Deno.env.get('VITE_ASAAS_API_URL');
    const asaasBaseUrl = customUrl ? customUrl : (asaasApiKey.startsWith('$aact_YTU5') ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3');

    // 1. Check or Create Customer in Asaas
    let customerId = '';
    const customerSearchRes = await fetch(`${asaasBaseUrl}/customers?email=${user.email}`, {
      headers: { 'access_token': asaasApiKey }
    });
    const customerSearch = await customerSearchRes.json();
    
    if (customerSearch.data && customerSearch.data.length > 0) {
      customerId = customerSearch.data[0].id;
    } else {
      const customerCreateRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify({
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
        })
      });
      const customerCreate = await customerCreateRes.json();
      if (customerCreate.errors) throw new Error(customerCreate.errors[0].description);
      customerId = customerCreate.id;
    }

    // 2. Create Payment in Asaas
    const dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // +1 day
    const paymentCreateRes = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: method === 'pix' ? 'PIX' : 'CREDIT_CARD', // Ou 'UNDEFINED'
        value: 5.00,
        dueDate: dueDate,
        description: 'Projeto Adicional - Kanban Premium',
        externalReference: paymentId
      })
    });
    const paymentData = await paymentCreateRes.json();
    if (paymentData.errors) throw new Error(paymentData.errors[0].description);

    let pixQrCode = null;
    let pixEncodedImage = null;

    // 3. Obter o QR Code se for PIX
    if (method === 'pix') {
      const pixRes = await fetch(`${asaasBaseUrl}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': asaasApiKey }
      });
      const pixData = await pixRes.json();
      if (pixData.errors) {
        throw new Error(`Erro ao gerar PIX: ${pixData.errors[0].description}`);
      }
      pixQrCode = pixData.payload; // O Pix Copia e Cola
      pixEncodedImage = pixData.encodedImage; // Base64 da imagem
    }

    const finalResponse = {
      id: paymentData.id,
      status: paymentData.status,
      invoiceUrl: paymentData.invoiceUrl,
      pixQrCode: pixQrCode,
      pixEncodedImage: pixEncodedImage
    };

    // Update payment record in database
    const { error: dbError } = await supabaseClient
      .from("payments")
      .update({
        asaas_payment_id: paymentData.id,
        status: "pending",
        invoice_url: paymentData.invoiceUrl,
        pix_qr_code: pixQrCode,
        pix_copy_paste: pixQrCode // You might have a column for copy paste
      })
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (dbError) throw dbError;

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
