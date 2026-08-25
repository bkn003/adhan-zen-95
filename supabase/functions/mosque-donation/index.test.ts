// Security regression tests for donation banking data exposure.
// Confirms anonymous users cannot reach banking/UPI columns and that the
// location_donation_details table enforces RLS as expected.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/mosque-donation`;

const anon = createClient(SUPABASE_URL, ANON_KEY);

const DONATION_COLUMNS = [
  "donation_enabled",
  "donation_upi_id",
  "donation_account_holder",
  "donation_bank_name",
  "donation_account_number",
  "donation_ifsc",
  "donation_notes",
];

// --- locations table must not expose banking/UPI columns at all ---
for (const col of DONATION_COLUMNS) {
  Deno.test(`anon cannot select locations.${col} (column removed)`, async () => {
    const { error } = await anon.from("locations").select(col).limit(1);
    assert(error, `expected error selecting dropped column locations.${col}`);
  });
}

// --- location_donation_details is locked down ---
Deno.test("anon cannot read location_donation_details", async () => {
  const { data, error } = await anon.from("location_donation_details").select("*").limit(1);
  assert(
    error || (data ?? []).length === 0,
    "expected permission error or zero rows reading location_donation_details as anon"
  );
});

Deno.test("anon cannot insert into location_donation_details", async () => {
  const { error } = await anon.from("location_donation_details").insert({
    location_id: "00000000-0000-0000-0000-000000000000",
    donation_enabled: true,
  } as any);
  assert(error, "expected RLS/grant failure inserting into location_donation_details as anon");
});

Deno.test("anon cannot update location_donation_details", async () => {
  const { data, error } = await anon
    .from("location_donation_details")
    .update({ donation_upi_id: "hacker@upi" } as any)
    .eq("location_id", "00000000-0000-0000-0000-000000000000")
    .select();
  // Either a grant/RLS error, or a silent no-op that modified zero rows.
  assert(
    error || (data ?? []).length === 0,
    "expected error or zero affected rows updating location_donation_details as anon"
  );
});

// --- get_mosque_donation_details RPC is not callable by anon ---
Deno.test("anon cannot call get_mosque_donation_details RPC", async () => {
  const { error } = await anon.rpc("get_mosque_donation_details", {
    p_location_id: "00000000-0000-0000-0000-000000000000",
  });
  assert(error, "expected permission error calling get_mosque_donation_details as anon");
});

// --- edge function input validation + safe responses ---
Deno.test("edge function rejects invalid location_id with 400", async () => {
  const res = await fetch(`${FN_URL}?location_id=not-a-uuid`, { headers: { apikey: ANON_KEY } });
  assertEquals(res.status, 400);
  await res.text();
});

Deno.test("edge function returns donation:null for unknown mosque", async () => {
  const res = await fetch(`${FN_URL}?location_id=00000000-0000-0000-0000-000000000000`, {
    headers: { apikey: ANON_KEY },
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.donation, null);
});

Deno.test("edge function never leaks rows where donation is disabled", async () => {
  // Any mosque without donation_enabled=true must return donation:null.
  const res = await fetch(`${FN_URL}?location_id=00000000-0000-0000-0000-000000000001`, {
    headers: { apikey: ANON_KEY },
  });
  const json = await res.json();
  assert(json.donation === null || json.donation.donation_enabled === true);
});
