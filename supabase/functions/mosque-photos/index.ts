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

    const formData = await req.formData();
    const action = formData.get("action") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const locationId = formData.get("location_id") as string;

    // Verify admin
    const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
      p_username: username,
      p_password: password,
    });

    if (!verifiedId || verifiedId !== locationId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "upload") {
      const file = formData.get("photo") as File;
      if (!file) {
        return new Response(
          JSON.stringify({ error: "No photo provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing photo count
      const { count } = await supabase
        .from("mosque_photos")
        .select("*", { count: "exact", head: true })
        .eq("location_id", locationId);

      if ((count || 0) >= 6) {
        return new Response(
          JSON.stringify({ error: "Maximum 6 photos allowed per mosque" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upload to storage
      const fileName = `${locationId}/${crypto.randomUUID()}.jpg`;
      const arrayBuffer = await file.arrayBuffer();
      
      const { error: uploadError } = await supabase.storage
        .from("mosque-photos")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage
        .from("mosque-photos")
        .getPublicUrl(fileName);

      // Save to DB
      const caption = formData.get("caption") as string || "";
      const { error: dbError } = await supabase
        .from("mosque_photos")
        .insert({ location_id: locationId, photo_url: urlData.publicUrl, caption });

      if (dbError) {
        return new Response(
          JSON.stringify({ error: dbError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const photoId = formData.get("photo_id") as string;
      
      // Get photo URL to delete from storage
      const { data: photo } = await supabase
        .from("mosque_photos")
        .select("photo_url")
        .eq("id", photoId)
        .eq("location_id", locationId)
        .maybeSingle();

      if (photo) {
        // Extract path from URL
        const url = new URL(photo.photo_url);
        const pathParts = url.pathname.split("/mosque-photos/");
        if (pathParts[1]) {
          await supabase.storage.from("mosque-photos").remove([pathParts[1]]);
        }

        await supabase
          .from("mosque_photos")
          .delete()
          .eq("id", photoId)
          .eq("location_id", locationId);
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
