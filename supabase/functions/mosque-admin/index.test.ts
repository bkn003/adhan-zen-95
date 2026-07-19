// Security regression tests for mosque-admin edge function + RLS/storage/SECURITY DEFINER.
// Run: supabase functions test mosque-admin (or via test tool).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/mosque-admin`;

const anon = createClient(SUPABASE_URL, ANON_KEY);

async function post(body: unknown) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text };
}

// --- RLS: admin_password_hash must not be readable by anon ---
Deno.test("anon cannot select admin_password_hash column", async () => {
  const { error } = await anon.from("locations").select("admin_password_hash").limit(1);
  assert(error, "expected permission error selecting admin_password_hash");
});

// --- RLS: protected tables reject anon writes ---
Deno.test("anon cannot insert into locations", async () => {
  const { error } = await anon.from("locations").insert({ mosque_name: "x", district: "x", latitude: 0, longitude: 0 } as any);
  assert(error, "expected RLS/grant failure inserting into locations as anon");
});

Deno.test("anon cannot insert into prayer_times", async () => {
  const { error } = await anon.from("prayer_times").insert({ location_id: "00000000-0000-0000-0000-000000000000", month: "January", date_range: "1-5" } as any);
  assert(error, "expected RLS/grant failure inserting into prayer_times as anon");
});

Deno.test("anon cannot insert into mosque_announcements", async () => {
  const { error } = await anon.from("mosque_announcements").insert({ location_id: "00000000-0000-0000-0000-000000000000", message: "x" } as any);
  assert(error, "expected RLS failure inserting announcement as anon");
});

// --- SECURITY DEFINER functions must not be callable by anon ---
Deno.test("anon cannot call verify_mosque_admin directly", async () => {
  const { error } = await anon.rpc("verify_mosque_admin", { p_username: "x", p_password: "x" });
  assert(error, "expected permission error calling verify_mosque_admin as anon");
});

Deno.test("anon cannot call set_mosque_admin_credentials directly", async () => {
  const { error } = await anon.rpc("set_mosque_admin_credentials", {
    p_location_id: "00000000-0000-0000-0000-000000000000",
    p_username: "x",
    p_password: "x",
  });
  assert(error, "expected permission error calling set_mosque_admin_credentials as anon");
});

// --- Storage: anon cannot upload to mosque-photos / mosque-images ---
Deno.test("anon cannot upload to mosque-photos bucket", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const { error } = await anon.storage.from("mosque-photos").upload(`test/${crypto.randomUUID()}.bin`, bytes);
  assert(error, "expected storage upload to be denied for anon");
});

Deno.test("anon cannot upload to mosque-images bucket", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const { error } = await anon.storage.from("mosque-images").upload(`test/${crypto.randomUUID()}.bin`, bytes);
  assert(error, "expected storage upload to be denied for anon");
});

// --- Edge function: super admin login rejects wrong password ---
Deno.test("mosque-admin rejects bad super admin password", async () => {
  const { status } = await post({ action: "super_admin_login", password: "definitely-wrong-password-xyz" });
  assertEquals(status, 401);
});

// --- Edge function: login rejects bad creds ---
Deno.test("mosque-admin login rejects bad credentials", async () => {
  const { status } = await post({ action: "login", username: "nobody", password: "nobody" });
  assertEquals(status, 401);
});

// --- Edge function: update actions require auth ---
Deno.test("mosque-admin update_location without creds returns 401", async () => {
  const { status } = await post({ action: "update_location", location_id: "00000000-0000-0000-0000-000000000000", data: {} });
  assertEquals(status, 401);
});

Deno.test("mosque-admin update_prayer_times without creds returns 401", async () => {
  const { status } = await post({ action: "update_prayer_times", location_id: "00000000-0000-0000-0000-000000000000", data: {} });
  assertEquals(status, 401);
});

Deno.test("mosque-admin update_location with bad creds returns 403", async () => {
  const { status } = await post({
    action: "update_location",
    username: "nobody", password: "nobody",
    location_id: "00000000-0000-0000-0000-000000000000",
    data: { mosque_name: "hacked" },
  });
  assert(status === 401 || status === 403, `expected 401/403, got ${status}`);
});
