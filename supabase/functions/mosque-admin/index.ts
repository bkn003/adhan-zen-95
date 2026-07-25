import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const SUPER_ADMIN_PASSWORD = Deno.env.get("SUPER_ADMIN_PASSWORD") || "AdhanZen@SuperAdmin2025";

    const { action, username, password, location_id, data } = await req.json();

    // Server-side super admin authentication
    if (action === "super_admin_login") {
      if (password !== SUPER_ADMIN_PASSWORD) {
        return new Response(
          JSON.stringify({ error: "Invalid super admin password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
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
