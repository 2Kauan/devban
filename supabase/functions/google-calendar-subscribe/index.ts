import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt, decrypt } from "../_shared/crypto.ts";

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

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    // Body might be empty
  }

  const clientRefreshToken = body.provider_refresh_token;

  if (clientRefreshToken) {
    const encryptedToken = await encrypt(clientRefreshToken, Deno.env.get("ENCRYPTION_KEY") ?? "");
    await supabaseClient.from("google_accounts").upsert({
      id: user.id,
      email: user.email ?? "",
      refresh_token_encrypted: encryptedToken,
      scopes: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"],
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
    });
  }

  // Get refresh token from google_accounts table
  const { data: account } = await supabaseClient
    .from("google_accounts")
    .select("refresh_token_encrypted")
    .eq("id", user.id)
    .single();

  if (!account) {
    return new Response(JSON.stringify({ error: "No Google account linked. Please connect Google Calendar integration." }), { status: 404, headers: corsHeaders });
  }

  try {
    const refreshToken = await decrypt(account.refresh_token_encrypted, Deno.env.get("ENCRYPTION_KEY") ?? "");

    // Exchange refresh token for access token
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
    const accessToken = tokens.access_token;

    if (!accessToken) {
      throw new Error("Could not retrieve access token from Google");
    }

    // Step 1: Fetch initial syncToken by doing a list events query
    const listRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const listData = await listRes.json();
    const nextSyncToken = listData.nextSyncToken || null;

    // Step 2: Register events watch channel with Google Calendar
    const channelId = crypto.randomUUID();
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-webhook`;

    const watchResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events/watch", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        token: `user_id=${user.id}`,
      }),
    });

    if (!watchResponse.ok) {
      const errorText = await watchResponse.text();
      throw new Error(`Google Calendar Watch failed: ${errorText}`);
    }

    const watchData = await watchResponse.json();

    // Step 3: Save channel details to database
    await supabaseClient.from("google_calendar_channels").upsert({
      id: channelId,
      user_id: user.id,
      resource_id: watchData.resourceId,
      expiration: new Date(Number(watchData.expiration)).toISOString(),
      sync_token: nextSyncToken,
    });

    return new Response(JSON.stringify({ success: true, channelId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
