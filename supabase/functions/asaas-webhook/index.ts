import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  // O Asaas envia os webhooks via POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    
    // Validar token do webhook (se configurado no Asaas)
    const asaasWebhookSecret = Deno.env.get("ASAAS_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("asaas-access-token");
    
    if (asaasWebhookSecret && receivedSecret !== asaasWebhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const eventType = payload.event;
    const paymentData = payload.payment;

    if (!paymentData || !paymentData.id) {
      return new Response("Invalid payload", { status: 400 });
    }

    // Inicializar cliente Supabase com a Service Role para bypass RLS (já que é um Webhook)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let newStatus = "pending";
    if (eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") {
      newStatus = "confirmed";
    } else if (eventType === "PAYMENT_OVERDUE" || eventType === "PAYMENT_DELETED") {
      newStatus = "failed";
    }

    // Atualizar o status do pagamento no banco
    const { error, data: updatedPayments } = await supabaseAdmin
      .from("payments")
      .update({ status: newStatus })
      .eq("asaas_payment_id", paymentData.id)
      .select();

    if (error) throw error;
    
    // Se foi confirmado, e temos um project_id associado, o projeto já está liberado.
    // (A liberação do projeto ocorre indiretamente: o frontend verifica se o status está 'confirmed')
    // Outra opção seria criar o projeto vazio no momento da compra (is_free=false) e liberar o acesso.

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
