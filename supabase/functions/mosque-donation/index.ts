import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Server-side failure logging for donation reads/writes.
 * Emits a grep-able `[DONATION_ALERT]` line to the edge function logs and
 * persists the failure in `analytics_events` so issues can be detected and
 * reviewed in production. Logging must never break the request itself.
 */
async function logDonationEvent(
  admin: SupabaseClient,
  eventType: "donation_read_failed" | "donation_lookup_failed" | "donation_unexpected_error",
  locationId: string | null,
  detail: string
) {
  console.error(`[DONATION_ALERT] ${eventType} location=${locationId ?? "unknown"} :: ${detail}`);
  try {
    await admin.from("analytics_events").insert({
      location_id: locationId,
      event_type: eventType,
      metadata: { source: "mosque-donation", message: detail.slice(0, 500) },
    });
  } catch (e) {
    console.error("[DONATION_ALERT] failed to persist analytics event:", e);
  }
}

/**
 * Public read-only endpoint for a mosque's donation details.
 *
 * Banking columns on `public.locations` are not readable by clients and the
 * `get_mosque_donation_details` RPC is restricted to signed-in roles, so this
 * function serves the same (intentionally public) donation info to every
 * visitor — including users without a session — without widening database
 * grants. It only ever returns rows where the mosque enabled donations.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  let locationId: string | null = null;

  try {
    const url = new URL(req.url);
    locationId = url.searchParams.get('location_id') ?? '';
    if (!locationId && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      locationId = String(body?.location_id ?? '');
    }

    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(locationId)) {
      return new Response(JSON.stringify({ error: 'location_id must be a valid uuid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Platform-wide kill switch controlled by the super admin.
    const { data: masterRow, error: masterErr } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'mosque_donations_enabled')
      .maybeSingle();
    if (masterErr) {
      await logDonationEvent(admin, 'donation_lookup_failed', locationId, `app_settings read: ${masterErr.message}`);
    }
    if ((masterRow?.value ?? 'true') !== 'true') {
      return new Response(JSON.stringify({ donation: null, disabled_by_platform: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Banking details live in a locked-down table (no anon/authenticated access).
    const { data: loc, error: locErr } = await admin
      .from('locations')
      .select('is_visible')
      .eq('id', locationId)
      .maybeSingle();
    if (locErr) {
      await logDonationEvent(admin, 'donation_lookup_failed', locationId, `locations read: ${locErr.message}`);
      throw locErr;
    }

    const { data, error } = await admin
      .from('location_donation_details')
      .select(
        'donation_enabled, donation_upi_id, donation_account_holder, donation_bank_name, donation_account_number, donation_ifsc, donation_notes'
      )
      .eq('location_id', locationId)
      .maybeSingle();

    if (error) {
      await logDonationEvent(admin, 'donation_read_failed', locationId, `location_donation_details read: ${error.message}`);
      throw error;
    }

    const visible = !!loc && loc.is_visible !== false && data && data.donation_enabled === true;
    const payload = visible
      ? {
          donation_enabled: true,
          donation_upi_id: data!.donation_upi_id,
          donation_account_holder: data!.donation_account_holder,
          donation_bank_name: data!.donation_bank_name,
          donation_account_number: data!.donation_account_number,
          donation_ifsc: data!.donation_ifsc,
          donation_notes: data!.donation_notes,
        }
      : null;

    return new Response(JSON.stringify({ donation: payload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    await logDonationEvent(admin, 'donation_unexpected_error', locationId, message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
