import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Public read-only endpoint for a mosque's donation details.
 *
 * Banking columns on `public.locations` are not readable by clients and the
 * `get_mosque_donation_details` RPC is restricted to signed-in roles, so this
 * function serves the same (intentionally public) donation info to every
 * visitor — including users without a session — without widening database
 * grants. It only ever returns rows where the mosque enabled donations.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let locationId = url.searchParams.get('location_id') ?? '';
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await admin
      .from('locations')
      .select(
        'donation_enabled, donation_upi_id, donation_account_holder, donation_bank_name, donation_account_number, donation_ifsc, donation_notes, is_visible'
      )
      .eq('id', locationId)
      .maybeSingle();

    if (error) throw error;

    const visible = data && data.donation_enabled === true && data.is_visible !== false;
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
