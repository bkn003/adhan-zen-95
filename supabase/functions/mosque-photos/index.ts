import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "mosque-photos";
const SIGN_TTL = 60 * 60; // 1 hour

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Extract storage path from either an explicit storage_path or a legacy public/signed photo_url.
function derivePath(row: { storage_path: string | null; photo_url: string | null }): string | null {
  if (row.storage_path) return row.storage_path;
  if (!row.photo_url) return null;
  const marker = `/${BUCKET}/`;
  const idx = row.photo_url.indexOf(marker);
  if (idx === -1) return null;
  // Strip any query string
  return row.photo_url.slice(idx + marker.length).split("?")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Public JSON action: sign URLs for a set of photo ids (no auth required) ---
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body?.action === "get_signed_urls") {
        const ids: string[] = Array.isArray(body.photo_ids) ? body.photo_ids.filter((x: unknown) => typeof x === "string") : [];
        if (ids.length === 0) return json({ urls: {} });
        if (ids.length > 60) return json({ error: "Too many ids" }, 400);

        const { data: rows, error } = await supabase
          .from("mosque_photos")
          .select("id, storage_path, photo_url")
          .in("id", ids);
        if (error) return json({ error: error.message }, 500);

        const urls: Record<string, string> = {};
        const paths = (rows || [])
          .map((r) => ({ id: r.id as string, path: derivePath(r as any) }))
          .filter((r): r is { id: string; path: string } => !!r.path);

        if (paths.length > 0) {
          const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrls(paths.map((p) => p.path), SIGN_TTL);
          if (signErr) return json({ error: signErr.message }, 500);
          signed?.forEach((s, i) => {
            if (s.signedUrl) urls[paths[i].id] = s.signedUrl;
          });
        }
        return json({ urls, expires_in: SIGN_TTL });
      }
      return json({ error: "Unknown action" }, 400);
    }

    // --- Admin actions (multipart) ---
    const formData = await req.formData();
    const action = formData.get("action") as string;
    const locationId = formData.get("location_id") as string;

    // Authorize from the real Supabase session JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let callerId: string | null = null;
    if (jwt && jwt !== anonKey) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      const u = userData?.user as any;
      if (u && !u.is_anonymous) callerId = u.id;
    }
    if (!callerId) return json({ error: "Sign in required" }, 401);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isSuper = (roleRows ?? []).some((r: any) => r.role === "super_admin");

    if (!isSuper) {
      const { data: assign } = await supabase
        .from("mosque_admin_users")
        .select("location_id")
        .eq("user_id", callerId)
        .eq("location_id", locationId)
        .eq("is_paused", false)
        .maybeSingle();
      if (!assign) return json({ error: "Unauthorized" }, 403);
    }

    if (action === "upload") {
      const file = formData.get("photo") as File;
      if (!file) return json({ error: "No photo provided" }, 400);

      const { count } = await supabase
        .from("mosque_photos")
        .select("*", { count: "exact", head: true })
        .eq("location_id", locationId);
      if ((count || 0) >= 6) return json({ error: "Maximum 6 photos allowed per mosque" }, 400);

      const storagePath = `${locationId}/${crypto.randomUUID()}.jpg`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, arrayBuffer, { contentType: "image/jpeg", upsert: false });
      if (uploadError) return json({ error: uploadError.message }, 500);

      const caption = (formData.get("caption") as string) || "";
      // photo_url kept blank/legacy — signed URLs are derived from storage_path on read.
      const { error: dbError } = await supabase
        .from("mosque_photos")
        .insert({ location_id: locationId, storage_path: storagePath, photo_url: "", caption });
      if (dbError) {
        // best-effort cleanup
        await supabase.storage.from(BUCKET).remove([storagePath]);
        return json({ error: dbError.message }, 500);
      }
      return json({ success: true, storage_path: storagePath });
    }

    if (action === "delete") {
      const photoId = formData.get("photo_id") as string;
      const { data: photo } = await supabase
        .from("mosque_photos")
        .select("storage_path, photo_url")
        .eq("id", photoId)
        .eq("location_id", locationId)
        .maybeSingle();

      if (photo) {
        const path = derivePath(photo as any);
        if (path) await supabase.storage.from(BUCKET).remove([path]);
        await supabase
          .from("mosque_photos")
          .delete()
          .eq("id", photoId)
          .eq("location_id", locationId);
      }
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
