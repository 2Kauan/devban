import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to format clean uuid back to standard 8-4-4-4-12 UUID format
function reconstructUuid(clean: string): string {
  if (clean.length !== 32) return clean;
  return `${clean.substring(0, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}-${clean.substring(16, 20)}-${clean.substring(20)}`;
}

serve(async (req) => {
  // Respect OPTIONS requests for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const channelId = req.headers.get("x-goog-channel-id") ?? "";
  const resourceId = req.headers.get("x-goog-resource-id") ?? "";
  const resourceState = req.headers.get("x-goog-resource-state") ?? "";

  // Google validation/ping request
  if (resourceState === "sync") {
    return new Response(JSON.stringify({ message: "Sync confirmed" }), { status: 200, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Look up the active watch channel
  const { data: channel, error: channelError } = await supabaseClient
    .from("google_calendar_channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (channelError || !channel) {
    console.error("Watch channel not found:", channelId, channelError);
    return new Response(JSON.stringify({ error: "Channel not found" }), { status: 404, headers: corsHeaders });
  }

  // Get refresh token from google_accounts table
  const { data: account, error: accountError } = await supabaseClient
    .from("google_accounts")
    .select("refresh_token_encrypted")
    .eq("id", channel.user_id)
    .single();

  if (accountError || !account) {
    console.error("Account not found:", channel.user_id, accountError);
    return new Response(JSON.stringify({ error: "Linked account not found" }), { status: 404, headers: corsHeaders });
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

    // Call Google Calendar events list API with the stored syncToken
    let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    if (channel.sync_token) {
      url += `?syncToken=${encodeURIComponent(channel.sync_token)}`;
    }

    const eventsResponse = await fetch(url, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    // Handle expired sync tokens gracefully by fetching all changes
    if (eventsResponse.status === 410) {
      console.warn("syncToken expired. Performing full sync...");
      const fullEventsResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      const data = await fullEventsResponse.json();
      await processEvents(data.items || [], supabaseClient);
      
      // Update sync token
      if (data.nextSyncToken) {
        await supabaseClient
          .from("google_calendar_channels")
          .update({ sync_token: data.nextSyncToken })
          .eq("id", channelId);
      }
      return new Response("ok", { headers: corsHeaders });
    }

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      throw new Error(`Google Calendar Fetch failed: ${errorText}`);
    }

    const data = await eventsResponse.json();
    await processEvents(data.items || [], supabaseClient);

    // Save nextSyncToken for subsequent updates
    if (data.nextSyncToken) {
      await supabaseClient
        .from("google_calendar_channels")
        .update({ sync_token: data.nextSyncToken })
        .eq("id", channelId);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

async function processEvents(items: any[], supabaseClient: any) {
  for (const item of items) {
    const eventId = item.id || "";
    let cardId: string | null = null;

    if (eventId.startsWith("devban")) {
      const cleanUuid = eventId.replace("devban", "");
      cardId = reconstructUuid(cleanUuid);
    } else {
      const { data: res } = await supabaseClient
        .from("google_resources")
        .select("devban_entity_id")
        .eq("resource_id", eventId)
        .maybeSingle();
      if (res) cardId = res.devban_entity_id;
    }

    if (cardId) {
      if (item.status === "cancelled") {
        await supabaseClient
          .from("cards")
          .update({ due_date: null })
          .eq("id", cardId);
      } else {
        const dueDate = item.start?.dateTime || item.start?.date || null;
        if (dueDate) {
          await supabaseClient
            .from("cards")
            .update({ due_date: new Date(dueDate).toISOString() })
            .eq("id", cardId);
        }
      }
    }
  }
}
