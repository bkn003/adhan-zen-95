// Halal marketplace admin + media edge function.
//
// Handles everything that must not be trusted to the browser:
//  - minting short-lived signed URLs for private shop media
//  - the shop application review queue (approve / reject / pause)
//  - reported-product moderation
//  - granting/revoking "can approve shops" rights (super admin only)
//  - the marketing consent list + CSV export (super admin only)
//
// Authorization is always derived from the caller's validated Supabase JWT.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 60 * 60; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action ?? "");
    if (!action) return json({ error: "action is required" }, 400);

    // ---- Caller identity from the real session JWT ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    let caller: { id: string; email: string } | null = null;
    if (jwt && jwt !== ANON_KEY) {
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userData } = await authClient.auth.getUser(jwt);
      const u = userData?.user as any | undefined;
      if (u && !u.is_anonymous) caller = { id: u.id, email: u.email ?? "" };
    }

    let isSuper = false;
    let approverLocationIds: string[] = [];
    let isGlobalApprover = false;
    if (caller) {
      const [{ data: roles }, { data: grants }, { data: mosqueAdmin }] = await Promise.all([
        admin.from("user_roles").select("role").eq("user_id", caller.id),
        admin.from("shop_approvers").select("location_id").eq("user_id", caller.id),
        admin
          .from("mosque_admin_users")
          .select("location_id")
          .eq("user_id", caller.id)
          .eq("is_paused", false),
      ]);
      isSuper = (roles ?? []).some((r: any) => r.role === "super_admin");
      for (const g of grants ?? []) {
        if (!g.location_id) isGlobalApprover = true;
        else approverLocationIds.push(g.location_id as string);
      }
      void mosqueAdmin; // mosque admins only review where a grant exists
    }

    const canReview = isSuper || isGlobalApprover || approverLocationIds.length > 0;
    const canReviewShop = (nearestLocationId: string | null | undefined) =>
      isSuper ||
      isGlobalApprover ||
      (!!nearestLocationId && approverLocationIds.includes(nearestLocationId));

    // =====================================================================
    // Public: signed URLs for shop media of approved shops (and own shop)
    // =====================================================================
    if (action === "get_media_urls") {
      const paths: string[] = Array.isArray((body as any).paths)
        ? (body as any).paths.filter((p: unknown) => typeof p === "string").slice(0, 100)
        : [];
      if (paths.length === 0) return json({ urls: {} });

      const shopIds = Array.from(
        new Set(paths.map((p) => p.split("/")[0]).filter((s) => /^[0-9a-f-]{36}$/i.test(s))),
      );
      const { data: shops } = await admin
        .from("shops")
        .select("id, status, owner_user_id")
        .in("id", shopIds.length ? shopIds : ["00000000-0000-0000-0000-000000000000"]);
      const allowed = new Set(
        (shops ?? [])
          .filter(
            (s: any) =>
              s.status === "approved" ||
              (caller && s.owner_user_id === caller.id) ||
              canReview,
          )
          .map((s: any) => s.id as string),
      );

      const urls: Record<string, string> = {};
      for (const path of paths) {
        const owner = path.split("/")[0];
        const isApplication = owner === "applications";
        if (!allowed.has(owner) && !(isApplication && canReview)) continue;
        const { data } = await admin.storage
          .from("shop-media")
          .createSignedUrl(path, SIGNED_URL_TTL);
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      return json({ urls });
    }

    if (!caller) return json({ error: "Sign in required" }, 401);

    // =====================================================================
    // Reviewer scope
    // =====================================================================
    if (action === "review_whoami") {
      return json({
        user_id: caller.id,
        email: caller.email,
        is_super_admin: isSuper,
        is_global_approver: isGlobalApprover,
        location_ids: approverLocationIds,
        can_review: canReview,
      });
    }

    if (!canReview) return json({ error: "Not allowed" }, 403);

    // =====================================================================
    // Applications
    // =====================================================================
    if (action === "list_shops") {
      const status = typeof (body as any).status === "string" ? (body as any).status : null;
      let q = admin
        .from("shops")
        .select("*, locations:nearest_location_id(mosque_name, district)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (status && status !== "all") q = q.eq("status", status);
      if (!isSuper && !isGlobalApprover) {
        q = q.in(
          "nearest_location_id",
          approverLocationIds.length
            ? approverLocationIds
            : ["00000000-0000-0000-0000-000000000000"],
        );
      }
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ shops: data ?? [] });
    }

    if (action === "set_shop_status") {
      const shopId = String((body as any).shop_id ?? "");
      const status = String((body as any).status ?? "");
      const reason = String((body as any).reason ?? "").slice(0, 300);
      if (!["approved", "rejected", "paused", "pending"].includes(status)) {
        return json({ error: "Invalid status" }, 400);
      }
      const { data: shop } = await admin
        .from("shops")
        .select("id, nearest_location_id")
        .eq("id", shopId)
        .maybeSingle();
      if (!shop) return json({ error: "Shop not found" }, 404);
      if (!canReviewShop((shop as any).nearest_location_id)) {
        return json({ error: "Not allowed for this area" }, 403);
      }
      const { error } = await admin
        .from("shops")
        .update({
          status,
          rejection_reason: status === "rejected" || status === "paused" ? reason || null : null,
          approved_by: status === "approved" ? caller.id : null,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", shopId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // =====================================================================
    // Reported products
    // =====================================================================
    if (action === "list_reported_products") {
      let shopFilter: string[] | null = null;
      if (!isSuper && !isGlobalApprover) {
        const { data: scoped } = await admin
          .from("shops")
          .select("id")
          .in(
            "nearest_location_id",
            approverLocationIds.length
              ? approverLocationIds
              : ["00000000-0000-0000-0000-000000000000"],
          );
        shopFilter = (scoped ?? []).map((s: any) => s.id as string);
      }
      let q = admin
        .from("shop_products")
        .select("*, shops:shop_id(id, name, status, nearest_location_id)")
        .gt("report_count", 0)
        .order("report_count", { ascending: false })
        .limit(200);
      if (shopFilter) {
        q = q.in("shop_id", shopFilter.length ? shopFilter : ["00000000-0000-0000-0000-000000000000"]);
      }
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);

      const ids = (data ?? []).map((p: any) => p.id as string);
      const reasons: Record<string, string[]> = {};
      if (ids.length) {
        const { data: reps } = await admin
          .from("shop_product_reports")
          .select("product_id, reason")
          .in("product_id", ids);
        for (const r of reps ?? []) {
          const key = r.product_id as string;
          if (!reasons[key]) reasons[key] = [];
          if (r.reason) reasons[key].push(r.reason as string);
        }
      }
      return json({ products: data ?? [], reasons });
    }

    if (action === "set_product_hidden") {
      const productId = String((body as any).product_id ?? "");
      const hidden = !!(body as any).hidden;
      const { data: prod } = await admin
        .from("shop_products")
        .select("id, shop_id, shops:shop_id(nearest_location_id)")
        .eq("id", productId)
        .maybeSingle();
      if (!prod) return json({ error: "Product not found" }, 404);
      if (!canReviewShop((prod as any).shops?.nearest_location_id)) {
        return json({ error: "Not allowed for this area" }, 403);
      }
      const patch: Record<string, unknown> = { is_hidden: hidden };
      if (!hidden) patch.report_count = 0;
      const { error } = await admin.from("shop_products").update(patch).eq("id", productId);
      if (error) return json({ error: error.message }, 400);
      if (!hidden) {
        await admin.from("shop_product_reports").delete().eq("product_id", productId);
      }
      return json({ success: true });
    }

    // =====================================================================
    // Super-admin only
    // =====================================================================
    if (!isSuper) return json({ error: "Super admin required" }, 403);

    if (action === "list_approvers") {
      const { data, error } = await admin
        .from("shop_approvers")
        .select("*, locations:location_id(mosque_name, district)")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      const ids = Array.from(new Set((data ?? []).map((a: any) => a.user_id as string)));
      const emails: Record<string, string> = {};
      for (const id of ids) {
        const { data: u } = await admin.auth.admin.getUserById(id);
        if (u?.user?.email) emails[id] = u.user.email;
      }
      return json({ approvers: data ?? [], emails });
    }

    if (action === "grant_approver") {
      const email = String((body as any).email ?? "").trim().toLowerCase();
      const locationId = (body as any).location_id ?? null;
      if (!email) return json({ error: "Email is required" }, 400);
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = (list?.users ?? []).find(
        (u: any) => (u.email ?? "").toLowerCase() === email,
      );
      if (!match) return json({ error: "No app account found with that email" }, 404);
      const { error } = await admin.from("shop_approvers").insert({
        user_id: match.id,
        location_id: locationId,
        granted_by: caller.id,
      });
      if (error && !/duplicate|unique/i.test(error.message)) {
        return json({ error: error.message }, 400);
      }
      return json({ success: true });
    }

    if (action === "revoke_approver") {
      const id = String((body as any).id ?? "");
      const { error } = await admin.from("shop_approvers").delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "list_marketing_contacts") {
      const { data, error } = await admin
        .from("shop_orders")
        .select(
          "contact_name, contact_phone, contact_email, created_at, shops:shop_id(name, area, nearest_location_id, locations:nearest_location_id(mosque_name, district))",
        )
        .eq("marketing_consent", true)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) return json({ error: error.message }, 400);
      // De-duplicate by phone, keeping the most recent entry.
      const seen = new Set<string>();
      const contacts: any[] = [];
      for (const row of data ?? []) {
        const key = (row as any).contact_phone ?? "";
        if (seen.has(key)) continue;
        seen.add(key);
        contacts.push({
          name: (row as any).contact_name,
          phone: (row as any).contact_phone,
          email: (row as any).contact_email,
          shop: (row as any).shops?.name ?? "",
          mosque: (row as any).shops?.locations?.mosque_name ?? "",
          area: (row as any).shops?.area ?? (row as any).shops?.locations?.district ?? "",
          joined_at: (row as any).created_at,
        });
      }
      return json({ contacts });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("[shop-admin] error", e);
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
