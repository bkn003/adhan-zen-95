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

    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    const body = await req.json();
    const { action, username, password, location_id, data } = body;

    const json = (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ---- Caller identity comes from the real Supabase session JWT ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    let caller: { id: string; email: string } | null = null;
    if (jwt && jwt !== ANON_KEY) {
      // Validate against the auth server with an anon-key client (works with both
      // legacy and new API-key setups); the service client is only used for reads.
      const authClient = createClient(Deno.env.get("SUPABASE_URL")!, ANON_KEY ?? "", {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
      if (userErr) console.error("[mosque-admin] getUser failed:", userErr.message);
      const u = userData?.user as any | undefined;
      if (u && !u.is_anonymous) caller = { id: u.id, email: u.email ?? "" };
    }

    let isSuper = false;
    let adminLocationIds: string[] = [];
    const adminPermissions: Record<string, string[]> = {};
    if (caller) {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);
      if (rolesErr) console.error("[mosque-admin] user_roles read failed:", rolesErr.message);
      isSuper = (roles ?? []).some((r: any) => r.role === "super_admin");

      if (!isSuper && rolesErr) {
        // Service-key read unavailable: ask the DB with the caller's own JWT.
        const userClient = createClient(Deno.env.get("SUPABASE_URL")!, ANON_KEY ?? "", {
          global: { headers: { Authorization: `Bearer ${jwt}` } },
        });
        const { data: hr, error: hrErr } = await userClient.rpc("has_role", {
          _user_id: caller.id,
          _role: "super_admin",
        });
        if (hrErr) console.error("[mosque-admin] has_role fallback failed:", hrErr.message);
        isSuper = hr === true;
      }


      const { data: assigns, error: assignErr } = await supabase
        .from("mosque_admin_users")
        .select("location_id, permissions")
        .eq("user_id", caller.id)
        .eq("is_paused", false);
      if (assignErr) console.error("[mosque-admin] mosque_admin_users read failed:", assignErr.message);
      adminLocationIds = (assigns ?? []).map((a: any) => a.location_id as string);
      for (const a of assigns ?? []) {
        adminPermissions[a.location_id as string] = (a as any).permissions ?? [];
      }
    } else {
      console.error("[mosque-admin] no caller resolved; jwt present:", !!jwt, "action:", action);
    }


    /** Mosque-scoped authorization: the mosque's own admin, or any super admin. */
    const canManage = (loc?: string | null) =>
      !!caller && !!loc && (isSuper || adminLocationIds.includes(loc));

    // ---- Super admin actions ----
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
      "super_set_admin_permissions",
    ]);

    if (SUPER_ACTIONS.has(action) && !isSuper) {
      return json({ error: "Super admin authentication required" }, 401);
    }

    // Who am I? Used by both panels right after signing in.
    if (action === "admin_whoami") {
      if (!caller) return json({ error: "Sign in required" }, 401);
      return json({
        user_id: caller.id,
        email: caller.email,
        is_super_admin: isSuper,
        location_ids: adminLocationIds,
        location_id: adminLocationIds[0] ?? null,
        permissions: adminPermissions,
      });
    }



    // Super admin: read the app-support (donation) configuration
    if (action === "super_get_app_settings") {
      const { data: rows, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "app_donation_enabled",
          "app_donation_upi_id",
          "app_donation_payee",
          "app_donation_note",
          "mosque_donations_enabled",
        ]);
      if (error) return json({ error: error.message }, 500);
      return json({ settings: rows || [] });
    }

    // Super admin: write the app-support (donation) configuration
    if (action === "super_set_app_settings") {
      // Accept settings nested under `data`, under `settings`, or flat on the body.
      const entries = {
        ...(body ?? {}),
        ...((body?.settings ?? {}) as Record<string, unknown>),
        ...((data ?? {}) as Record<string, unknown>),
      } as Record<string, unknown>;
      const allowed = new Set([
        "app_donation_enabled",
        "app_donation_upi_id",
        "app_donation_payee",
        "app_donation_note",
        "mosque_donations_enabled",
      ]);
      const rows = Object.entries(entries)
        .filter(([k, v]) => allowed.has(k) && v !== undefined && v !== null)
        .map(([key, value]) => ({
          key,
          value: String(value).slice(0, 500),
          updated_at: new Date().toISOString(),
        }));
      if (!rows.length) {
        console.error("[mosque-admin] super_set_app_settings got no allowed keys:", Object.keys(entries));
        return json({ error: "No valid settings provided" }, 400);
      }

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

    // Super admin: list mosque admin accounts (location_id -> account email)
    if (action === "super_list_admins") {
      const { data: assigns, error } = await supabase
        .from("mosque_admin_users")
        .select("location_id, user_id, is_paused, permissions");
      if (error) return json({ error: error.message }, 500);

      const emails = new Map<string, string>();
      for (let page = 1; page <= 10; page++) {
        const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        (list?.users ?? []).forEach((u: any) => emails.set(u.id, u.email ?? ""));
        if (!list?.users?.length || list.users.length < 200) break;
      }

      const admins = (assigns ?? []).map((a: any) => ({
        location_id: a.location_id,
        user_id: a.user_id,
        is_paused: a.is_paused,
        username: emails.get(a.user_id) ?? "",
        permissions: a.permissions ?? [],
      }));
      return json({ admins });
    }

    // Super admin: set which panel sections a mosque admin may manage
    if (action === "super_set_admin_permissions") {
      const targetLoc = (data?.location_id ?? location_id) as string | undefined;
      const targetUser = data?.user_id as string | undefined;
      const perms = data?.permissions;
      if (!targetLoc || !targetUser || !Array.isArray(perms)) {
        return json({ error: "Missing location_id, user_id, or permissions" }, 400);
      }
      const ALLOWED_PERMS = new Set([
        "mosque", "filters", "prayer", "photos", "events",
        "khutbah", "reviews", "donations", "attendance", "audit",
      ]);
      const clean = perms.filter((p: unknown) => typeof p === "string" && ALLOWED_PERMS.has(p as string));
      const { error } = await supabase
        .from("mosque_admin_users")
        .update({ permissions: clean })
        .eq("location_id", targetLoc)
        .eq("user_id", targetUser);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, permissions: clean });
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
      // Real authentication happens client-side via Supabase; this only reports scope.
      if (!caller) return json({ error: "Sign in required" }, 401);
      if (!isSuper && adminLocationIds.length === 0) {
        return json({ error: "This account is not linked to any mosque" }, 403);
      }
      return json({ location_id: adminLocationIds[0] ?? null, is_super_admin: isSuper, email: caller.email });
    }

    if (action === "update_location") {
      // Verify the admin is logged in by re-checking credentials
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!canManage(location_id)) return json({ error: "Unauthorized" }, 403);

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
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!canManage(location_id)) return json({ error: "Unauthorized" }, 403);

      // data should be { id, ...fields } for upsert
      const { id: ptId, ...rawFields } = data;

      // Sanitize: convert empty strings to null (PostgreSQL TIME columns reject "")
      const ptFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawFields)) {
        ptFields[key] = (value === "" || value === undefined) ? null : value;
      }

      let beforeRow: Record<string, any> | null = null;
      if (ptId) {
        const { data: existing } = await supabase
          .from("prayer_times")
          .select("*")
          .eq("id", ptId)
          .eq("location_id", location_id)
          .maybeSingle();
        beforeRow = existing ?? null;
      }

      let savedId = ptId as string | undefined;

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
        const { data: inserted, error } = await supabase
          .from("prayer_times")
          .insert({ ...ptFields, location_id })
          .select("id")
          .maybeSingle();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        savedId = inserted?.id;
      }

      // ---- Audit trail: record field-level before/after diffs ----
      try {
        const changes = Object.entries(ptFields)
          .filter(([k]) => !["id", "location_id", "created_at", "month", "date_range"].includes(k))
          .map(([field, newValue]) => ({
            field,
            old_value: beforeRow ? (beforeRow[field] ?? null) : null,
            new_value: newValue ?? null,
          }))
          .filter((c) => String(c.old_value ?? "") !== String(c.new_value ?? ""));

        if (changes.length > 0) {
          await supabase.from("mosque_timing_audit").insert({
            location_id,
            prayer_time_id: savedId ?? null,
            month: ptFields.month ?? beforeRow?.month ?? null,
            date_range: ptFields.date_range ?? beforeRow?.date_range ?? null,
            editor_label: caller?.email ?? "admin",
            actor_role: isSuper ? "super_admin" : "mosque_admin",
            changes,
            status: beforeRow ? "applied" : "created",
          });
        }
      } catch (_e) {
        /* auditing must never block the update */
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_prayer_times") {
      if (!location_id || !data?.id) return json({ error: "Missing prayer time id" }, 400);
      if (!canManage(location_id)) return json({ error: "Unauthorized" }, 403);

      const { data: beforeRow } = await supabase
        .from("prayer_times")
        .select("*")
        .eq("id", data.id)
        .eq("location_id", location_id)
        .maybeSingle();

      if (!beforeRow) return json({ error: "Prayer time not found for this mosque" }, 404);

      const { error } = await supabase
        .from("prayer_times")
        .delete()
        .eq("id", data.id)
        .eq("location_id", location_id);

      if (error) return json({ error: error.message }, 500);

      try {
        const changes = Object.entries(beforeRow)
          .filter(([k, v]) => !["id", "location_id", "created_at", "month", "date_range"].includes(k) && v !== null)
          .map(([field, oldValue]) => ({ field, old_value: oldValue, new_value: null }));
        await supabase.from("mosque_timing_audit").insert({
          location_id,
          prayer_time_id: null,
          month: beforeRow.month,
          date_range: beforeRow.date_range,
          editor_label: caller?.email ?? "admin",
          actor_role: isSuper ? "super_admin" : "mosque_admin",
          changes,
          status: "deleted",
        });
      } catch (_e) {
        /* auditing must never block the delete */
      }

      return json({ success: true });
    }


    if (action === "rollback_timing_audit") {
      if (!location_id || !data?.audit_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!canManage(location_id)) return json({ error: "Unauthorized" }, 403);

      const { data: entry } = await supabase
        .from("mosque_timing_audit")
        .select("*")
        .eq("id", data.audit_id)
        .eq("location_id", location_id)
        .maybeSingle();

      if (!entry || entry.status === "rolled_back" || !entry.prayer_time_id) {
        return new Response(
          JSON.stringify({ error: "This change cannot be rolled back." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const revert: Record<string, any> = {};
      for (const c of (entry.changes as any[]) || []) {
        revert[c.field] = c.old_value ?? null;
      }

      if (Object.keys(revert).length > 0) {
        const { error: revertError } = await supabase
          .from("prayer_times")
          .update(revert)
          .eq("id", entry.prayer_time_id)
          .eq("location_id", location_id);

        if (revertError) {
          return new Response(
            JSON.stringify({ error: revertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await supabase
        .from("mosque_timing_audit")
        .update({ status: "rolled_back", rolled_back_at: new Date().toISOString() })
        .eq("id", entry.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    /** Look up an auth user by email (case-insensitive). */
    const findUserByEmail = async (email: string) => {
      const target = email.trim().toLowerCase();
      for (let page = 1; page <= 10; page++) {
        const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        const found = (list?.users ?? []).find((u: any) => (u.email ?? "").toLowerCase() === target);
        if (found) return found;
        if (!list?.users?.length || list.users.length < 200) break;
      }
      return null;
    };

    // Mosque admin changes their own password (real Supabase account)
    if (action === "set_credentials") {
      if (!caller) return json({ error: "Sign in required" }, 401);
      if (!canManage(location_id)) return json({ error: "Unauthorized" }, 403);
      const newPassword = password || data?.password;
      if (!newPassword || String(newPassword).length < 6) {
        return json({ error: "Password must be at least 6 characters" }, 400);
      }
      const { error } = await supabase.auth.admin.updateUserById(caller.id, {
        password: String(newPassword),
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // Super admin: create or update the mosque admin account (email + password)
    if (action === "super_set_credentials") {
      const email = String(username || data?.username || "").trim();
      const pass = String(password || data?.password || "");
      if (!location_id || !email || !pass) return json({ error: "Missing fields" }, 400);
      if (!email.includes("@")) return json({ error: "Use a valid email address as the login" }, 400);
      if (pass.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

      let user = await findUserByEmail(email);
      if (user) {
        const { error } = await supabase.auth.admin.updateUserById(user.id, { password: pass });
        if (error) return json({ error: error.message }, 500);
      } else {
        const { data: created, error } = await supabase.auth.admin.createUser({
          email,
          password: pass,
          email_confirm: true,
        });
        if (error) return json({ error: error.message }, 500);
        user = created.user;
      }
      if (!user) return json({ error: "Could not create the admin account" }, 500);

      // One admin account per mosque: replace any previous assignment
      await supabase.from("mosque_admin_users").delete().eq("location_id", location_id);
      const { error: assignErr } = await supabase
        .from("mosque_admin_users")
        .insert({ user_id: user.id, location_id });
      if (assignErr) return json({ error: assignErr.message }, 500);

      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "mosque_admin" }, { onConflict: "user_id,role" });

      return json({ success: true, email, user_id: user.id });
    }

    if (action === "super_delete_credentials") {
      if (!location_id) return json({ error: "Missing location_id" }, 400);

      const { data: rows } = await supabase
        .from("mosque_admin_users")
        .select("user_id")
        .eq("location_id", location_id);

      const { error } = await supabase
        .from("mosque_admin_users")
        .delete()
        .eq("location_id", location_id);
      if (error) return json({ error: error.message }, 500);

      // Drop the mosque_admin role when the account no longer manages any mosque
      for (const row of rows ?? []) {
        const { count } = await supabase
          .from("mosque_admin_users")
          .select("*", { count: "exact", head: true })
          .eq("user_id", (row as any).user_id);
        if (!count) {
          await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", (row as any).user_id)
            .eq("role", "mosque_admin");
        }
      }

      return json({ success: true });
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
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!canManage(location_id)) return json({ error: "Unauthorized" }, 403);

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
    const verifyAdmin = async (): Promise<string | null> =>
      canManage(location_id) ? (location_id as string) : null;

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
      // Master kill switch: when a super admin disables mosque donations globally,
      // no mosque admin may turn their own donation option back on.
      const { data: masterRow } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "mosque_donations_enabled")
        .maybeSingle();
      const masterOn = (masterRow?.value ?? "true") === "true";
      if (!masterOn && (data as any)?.donation_enabled === true) {
        return new Response(
          JSON.stringify({ error: "Donations are currently disabled platform-wide by the Adhan Zen team. Contact the super admin to re-enable them." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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
