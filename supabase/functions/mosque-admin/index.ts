import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendFcm } from "../_shared/fcm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const SUPER_ADMIN_PASSWORD = Deno.env.get("SUPER_ADMIN_PASSWORD");

    const body = await req.json();
    const { action, username, password, location_id, data } = body;
    const superToken: string | undefined = body?.super_token;

    const json = (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ---- Super admin session tokens (HMAC-signed, 2h expiry, stateless) ----
    const SUPER_ACTIONS = new Set([
      "super_list_admins",
      "super_add_prayer_times",
      "super_set_credentials",
      "super_delete_credentials",
      "super_add_mosque",
      "super_pause_mosque",
      "super_delete_mosque",
      "super_manage_filter",
      "list_all_filters",
      "super_get_app_settings",
      "super_set_app_settings",
      "super_run_change_watch",
    ]);


    const b64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const sign = async (payload: string) => {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(SUPER_ADMIN_PASSWORD!),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
      return b64url(new Uint8Array(sig));
    };

    const issueSuperToken = async () => {
      const payload = `super.${Date.now() + 2 * 60 * 60 * 1000}`;
      return `${payload}.${await sign(payload)}`;
    };

    const verifySuperToken = async (token?: string) => {
      if (!token) return false;
      const parts = token.split(".");
      if (parts.length !== 3 || parts[0] !== "super") return false;
      const expiry = Number(parts[1]);
      if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
      const expected = await sign(`${parts[0]}.${parts[1]}`);
      if (expected.length !== parts[2].length) return false;
      let diff = 0;
      for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i);
      return diff === 0;
    };

    // Fail closed if the super admin password secret is not configured
    if (
      (SUPER_ACTIONS.has(action) || action === "super_admin_login") && !SUPER_ADMIN_PASSWORD
    ) {
      return json({ error: "Super admin is not configured on this server" }, 500);
    }

    // Every privileged super admin action must present a valid session token
    if (SUPER_ACTIONS.has(action) && !(await verifySuperToken(superToken))) {
      return json({ error: "Super admin authentication required" }, 401);
    }

    // Server-side super admin authentication
    if (action === "super_admin_login") {
      if (typeof password !== "string" || password !== SUPER_ADMIN_PASSWORD) {
        return json({ error: "Invalid super admin password" }, 401);
      }
      return json({ success: true, super_token: await issueSuperToken() });
    }


    // Super admin: read the app-support (donation) configuration
    if (action === "super_get_app_settings") {
      const { data: rows, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .like("key", "app_donation_%");
      if (error) return json({ error: error.message }, 500);
      return json({ settings: rows || [] });
    }

    // Super admin: write the app-support (donation) configuration
    if (action === "super_set_app_settings") {
      const entries = (data ?? {}) as Record<string, unknown>;
      const allowed = new Set([
        "app_donation_enabled",
        "app_donation_upi_id",
        "app_donation_payee",
        "app_donation_note",
      ]);
      const rows = Object.entries(entries)
        .filter(([k]) => allowed.has(k))
        .map(([key, value]) => ({
          key,
          value: String(value ?? "").slice(0, 500),
          updated_at: new Date().toISOString(),
        }));
      if (!rows.length) return json({ error: "No valid settings provided" }, 400);
      const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, saved: rows.length });
    }

    // Super admin: trigger the weekly prayer-time change watcher on demand
    if (action === "super_run_change_watch") {
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/prayer-change-watch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-watch-key": Deno.env.get("WARM_CACHE_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({}),
        },
      );
      const out = await res.json().catch(() => ({}));
      return json({ success: res.ok, result: out }, res.ok ? 200 : 500);
    }

    // Super admin: list which locations have admin credentials (returns location_id -> username)
    if (action === "super_list_admins") {
      const { data: admins, error } = await supabase
        .from("mosque_admins")
        .select("location_id, username");


      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ admins: admins || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Super admin: add prayer times for a mosque (used during mosque creation wizard)
    if (action === "super_add_prayer_times") {
      if (!location_id || !data?.month || !data?.date_range) {
        return new Response(
          JSON.stringify({ error: "Missing location_id, month, or date_range" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { month, date_range, ...rawFields } = data;
      const ptFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawFields)) {
        ptFields[key] = (value === "" || value === undefined) ? null : value;
      }

      const { error } = await supabase
        .from("prayer_times")
        .insert({ ...ptFields, location_id, month, date_range });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "login") {
      // Verify credentials using the DB function
      const { data: result, error } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (error || !result) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a simple session token
      const token = crypto.randomUUID();

      return new Response(
        JSON.stringify({ location_id: result, token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_location") {
      // Verify the admin is logged in by re-checking credentials
      if (!username || !password || !location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (!verifiedId || verifiedId !== location_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update location data
      const { error: updateError } = await supabase
        .from("locations")
        .update(data)
        .eq("id", location_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_prayer_times") {
      if (!username || !password || !location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (!verifiedId || verifiedId !== location_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // data should be { id, ...fields } for upsert
      const { id: ptId, ...rawFields } = data;

      // Sanitize: convert empty strings to null (PostgreSQL TIME columns reject "")
      const ptFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawFields)) {
        ptFields[key] = (value === "" || value === undefined) ? null : value;
      }

      if (ptId) {
        // Update existing
        const { error } = await supabase
          .from("prayer_times")
          .update(ptFields)
          .eq("id", ptId)
          .eq("location_id", location_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from("prayer_times")
          .insert({ ...ptFields, location_id });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set_credentials") {
      // This should only be used initially or by super admin
      // For now, allow setting if no credentials exist yet
      if (!location_id || !username || !password) {
        return new Response(
          JSON.stringify({ error: "Missing fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if credentials already exist
      const { data: existingAdmin } = await supabase
        .from("mosque_admins")
        .select("username")
        .eq("location_id", location_id)
        .maybeSingle();

      if (!existingAdmin?.username && !(await verifySuperToken(superToken))) {
        return json({ error: "Super admin authentication required" }, 401);
      }

      if (existingAdmin?.username) {

        // Credentials already exist, need old credentials to change
        const { old_username, old_password } = data || {};
        if (!old_username || !old_password) {
          return new Response(
            JSON.stringify({ error: "Existing credentials required to change" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
          p_username: old_username,
          p_password: old_password,
        });

        if (!verifiedId || verifiedId !== location_id) {
          return new Response(
            JSON.stringify({ error: "Invalid current credentials" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Set new credentials
      const { data: result } = await supabase.rpc("set_mosque_admin_credentials", {
        p_location_id: location_id,
        p_username: username,
        p_password: password,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "super_set_credentials") {
      if (!location_id || !data?.username || !data?.password) {
        // Accept username/password from top-level or data
        const u = username || data?.username;
        const p = password || data?.password;
        if (!location_id || !u || !p) {
          return new Response(
            JSON.stringify({ error: "Missing fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const u = username || data?.username;
      const p = password || data?.password;

      const { data: result } = await supabase.rpc("set_mosque_admin_credentials", {
        p_location_id: location_id,
        p_username: u,
        p_password: p,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "super_delete_credentials") {
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "Missing location_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("mosque_admins")
        .delete()
        .eq("location_id", location_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "super_add_mosque") {
      const mosqueData = data;
      if (!mosqueData?.mosque_name || !mosqueData?.district || !mosqueData?.latitude || !mosqueData?.longitude) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("locations")
        .insert({
          mosque_name: mosqueData.mosque_name,
          district: mosqueData.district,
          latitude: mosqueData.latitude,
          longitude: mosqueData.longitude,
        });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "super_pause_mosque") {
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "Missing location_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof data?.is_paused !== "boolean") {
        return new Response(
          JSON.stringify({ error: "is_paused boolean required in data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("locations")
        .update({ is_paused: data.is_paused })
        .eq("id", location_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "super_delete_mosque") {
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "Missing location_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First, delete all prayer times for this mosque to maintain referential integrity if not cascading
      await supabase
        .from("prayer_times")
        .delete()
        .eq("location_id", location_id);

      // Delete location filters
      await supabase
        .from("location_custom_filters")
        .delete()
        .eq("location_id", location_id);

      // Finally, delete the location itself
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", location_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // CUSTOM FILTERS ACTIONS
    // ============================================================

    if (action === "list_filters") {
      // Public: fetch all active custom filters
      const { data: filters, error } = await supabase
        .from("custom_filters")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ filters }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list_all_filters") {
      // Super admin: fetch ALL filters including inactive
      const { data: filters, error } = await supabase
        .from("custom_filters")
        .select("*")
        .order("display_order");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ filters }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "super_manage_filter") {
      // Super admin: create/update/delete custom filters
      const { sub_action, filter_id, filter_data } = data || {};

      if (sub_action === "create") {
        if (!filter_data?.name) {
          return new Response(
            JSON.stringify({ error: "Filter name is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newFilter, error } = await supabase
          .from("custom_filters")
          .insert({
            name: filter_data.name,
            icon: filter_data.icon || '🏷️',
            color: filter_data.color || 'gray',
            display_order: filter_data.display_order || 0,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, filter: newFilter }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (sub_action === "update") {
        if (!filter_id) {
          return new Response(
            JSON.stringify({ error: "filter_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from("custom_filters")
          .update(filter_data)
          .eq("id", filter_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (sub_action === "delete") {
        if (!filter_id) {
          return new Response(
            JSON.stringify({ error: "filter_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from("custom_filters")
          .delete()
          .eq("id", filter_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid sub_action. Use create/update/delete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_location_filters") {
      // Public: get all filter IDs for a location
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "location_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: locationFilters, error } = await supabase
        .from("location_custom_filters")
        .select("filter_id")
        .eq("location_id", location_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ filter_ids: locationFilters?.map(lf => lf.filter_id) || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_all_location_filters") {
      // Public: get all location-filter mappings (for NearbyScreen bulk use)
      const { data: allMappings, error } = await supabase
        .from("location_custom_filters")
        .select("location_id, filter_id");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ mappings: allMappings || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set_location_filters") {
      // Admin: set filters for their mosque
      if (!username || !password || !location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (!verifiedId || verifiedId !== location_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // data.filter_ids is the full list of selected filter IDs
      const filterIds: string[] = data?.filter_ids || [];

      // Delete all existing filters for this location
      const { error: deleteError } = await supabase
        .from("location_custom_filters")
        .delete()
        .eq("location_id", location_id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert new filters
      if (filterIds.length > 0) {
        const inserts = filterIds.map(fid => ({
          location_id,
          filter_id: fid,
        }));

        const { error: insertError } = await supabase
          .from("location_custom_filters")
          .insert(inserts);

        if (insertError) {
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Events / Announcements ===
    const verifyAdmin = async (): Promise<string | null> => {
      if (!username || !password || !location_id) return null;
      const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });
      return verifiedId && verifiedId === location_id ? verifiedId : null;
    };

    if (action === "upsert_announcement") {
      const ok = await verifyAdmin();
      if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { id, ...fields } = (data || {}) as any;
      const payload = { ...fields, location_id };
      let resp;
      if (id) {
        resp = await supabase.from("mosque_announcements").update(payload).eq("id", id).eq("location_id", location_id).select().maybeSingle();
      } else {
        resp = await supabase.from("mosque_announcements").insert(payload).select().maybeSingle();
      }
      if (resp.error) return new Response(JSON.stringify({ error: resp.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, event: resp.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_announcement") {
      const ok = await verifyAdmin();
      if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { id } = (data || {}) as any;
      const { error } = await supabase.from("mosque_announcements").delete().eq("id", id).eq("location_id", location_id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_donation") {
      const ok = await verifyAdmin();
      if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const allowed = ["donation_enabled","donation_upi_id","donation_account_holder","donation_bank_name","donation_account_number","donation_ifsc","donation_notes"];
      const patch: Record<string, unknown> = {};
      for (const k of allowed) if (k in (data || {})) patch[k] = (data as any)[k];
      const { error } = await supabase.from("locations").update(patch).eq("id", location_id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // ---- Mosque -> follower push announcements (FCM) ----
    if (action === "send_announcement_push") {
      const ok = await verifyAdmin();
      if (!ok) return json({ error: "Unauthorized" }, 403);

      const { title, body: message, announcement_id } = (data || {}) as any;
      if (!title || !message) return json({ error: "title and body are required" }, 400);

      // Followers who opted in for this mosque
      const { data: follows } = await supabase
        .from("mosque_follows")
        .select("user_id")
        .eq("location_id", location_id)
        .eq("announcements", true);

      const userIds = (follows ?? []).map((f: any) => f.user_id);

      // Plus anyone whose device is set to this mosque (My Mohalla) as a fallback
      let query = supabase
        .from("push_tokens")
        .select("expo_push_token, user_id")
        .eq("disabled", false);
      query = userIds.length
        ? query.or(`user_id.in.(${userIds.join(",")}),location_id.eq.${location_id}`)
        : query.eq("location_id", location_id);

      const { data: tokenRows, error: tokenErr } = await query;
      if (tokenErr) return json({ error: tokenErr.message }, 500);

      const tokens = Array.from(
        new Set((tokenRows ?? []).map((t: any) => t.expo_push_token).filter(Boolean)),
      ) as string[];
      if (tokens.length === 0) return json({ success: true, sent: 0, note: "No registered devices" });

      try {
        const res = await sendFcm(tokens, title, message, {
          type: "announcement",
          location_id: String(location_id),
          announcement_id: String(announcement_id ?? ""),
        });

        // Cleanup: disable tokens FCM reported as gone
        if (res.invalidTokens.length) {
          await supabase
            .from("push_tokens")
            .update({ disabled: true })
            .in("expo_push_token", res.invalidTokens);
        }
        return json({ success: true, sent: res.sent, cleaned: res.invalidTokens.length, errors: res.errors });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "FCM send failed" }, 500);
      }
    }

    // ---- Review moderation ----
    if (action === "list_reviews") {
      const ok = await verifyAdmin();
      if (!ok) return json({ error: "Unauthorized" }, 403);
      const { data: rows, error } = await supabase
        .from("mosque_reviews")
        .select("id, rating, comment, created_at, is_hidden, report_count")
        .eq("location_id", location_id)
        .order("report_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ reviews: rows ?? [] });
    }

    if (action === "moderate_review") {
      const ok = await verifyAdmin();
      if (!ok) return json({ error: "Unauthorized" }, 403);
      const { id, hidden, remove } = (data || {}) as any;
      if (!id) return json({ error: "Review id required" }, 400);

      if (remove) {
        const { error } = await supabase
          .from("mosque_reviews")
          .delete()
          .eq("id", id)
          .eq("location_id", location_id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, deleted: true });
      }

      const { error } = await supabase
        .from("mosque_reviews")
        .update({ is_hidden: !!hidden })
        .eq("id", id)
        .eq("location_id", location_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, hidden: !!hidden });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
