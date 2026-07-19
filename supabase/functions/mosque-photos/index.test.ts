// Security regression tests for mosque-photos edge function.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/mosque-photos`;

async function postForm(fd: FormData) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: fd,
  });
  await res.text();
  return res.status;
}

Deno.test("mosque-photos upload without valid admin creds → 403", async () => {
  const fd = new FormData();
  fd.set("action", "upload");
  fd.set("username", "nobody");
  fd.set("password", "nobody");
  fd.set("location_id", "00000000-0000-0000-0000-000000000000");
  fd.set("photo", new Blob([new Uint8Array([1,2,3])], { type: "image/jpeg" }), "x.jpg");
  const status = await postForm(fd);
  assertEquals(status, 403);
});

Deno.test("mosque-photos delete without valid admin creds → 403", async () => {
  const fd = new FormData();
  fd.set("action", "delete");
  fd.set("username", "nobody");
  fd.set("password", "nobody");
  fd.set("location_id", "00000000-0000-0000-0000-000000000000");
  fd.set("photo_id", "00000000-0000-0000-0000-000000000000");
  const status = await postForm(fd);
  assertEquals(status, 403);
});

Deno.test("mosque-photos CORS preflight OK", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS", headers: { apikey: ANON_KEY } });
  await res.text();
  assert(res.status === 200 || res.status === 204);
});
