import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/crypto.ts";

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

  const authHeader = req.headers.get("Authorization");
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader?.replace("Bearer ", ""));

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const { data: account } = await supabaseClient
    .from("google_accounts")
    .select("refresh_token_encrypted")
    .eq("id", user.id)
    .single();

  if (!account) {
    return new Response(JSON.stringify({ error: "No Google account linked" }), { status: 404, headers: corsHeaders });
  }

  // Descriptografa o refresh token para uso
  const refreshToken = await decrypt(account.refresh_token_encrypted, Deno.env.get("ENCRYPTION_KEY") ?? "");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenResponse.json();

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("target") ?? "";
  
  const googleResponse = await fetch(targetUrl, {
    method: req.method,
    headers: {
      "Authorization": `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: req.body,
  });

  return new Response(googleResponse.body, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
