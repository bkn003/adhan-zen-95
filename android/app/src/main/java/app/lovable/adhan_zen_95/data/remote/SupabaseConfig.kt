package app.lovable.adhan_zen_95.data.remote

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

/**
 * Supabase client configuration for Adhan Zen app.
 * Uses the same credentials as the web app.
 */
object SupabaseConfig {
    
    const val SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co"
    const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxodWZxbm9rbWRxa3Z6Y3hxd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTIwMzksImV4cCI6MjA3MzIyODAzOX0.FHokW4gosyE7KuGowCtaGPBO-v7hxlh63lM6kRofwu4"
    
    val client: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = SUPABASE_URL,
            supabaseKey = SUPABASE_KEY
        ) {
            install(Postgrest)
        }
    }
}
