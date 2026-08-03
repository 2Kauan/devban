import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { code, user_id, email, scopes } = await req.json();

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-oauth-handler`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokens.refresh_token) {
     return new Response(JSON.stringify({ error: "Failed to get refresh token" }), { status: 400, headers: corsHeaders });
  }

  // Criptografa o refresh token antes de salvar
  const encryptedRefreshToken = await encrypt(tokens.refresh_token, Deno.env.get("ENCRYPTION_KEY") ?? "");

  await supabaseClient.from("google_accounts").upsert({
    id: user_id,
    email: email,
    refresh_token_encrypted: encryptedRefreshToken,
    scopes: scopes.split(" "),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });

  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
