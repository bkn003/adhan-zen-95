export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string | null
          device_id: string | null
          event_type: string
          id: string
          location_id: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          event_type: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          event_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      custom_filters: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      location_custom_filters: {
        Row: {
          created_at: string | null
          filter_id: string
          id: string
          location_id: string
        }
        Insert: {
          created_at?: string | null
          filter_id: string
          id?: string
          location_id: string
        }
        Update: {
          created_at?: string | null
          filter_id?: string
          id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_custom_filters_filter_id_fkey"
            columns: ["filter_id"]
            isOneToOne: false
            referencedRelation: "custom_filters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_custom_filters_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          ac_available: boolean | null
          created_at: string | null
          district: string
          id: string
          is_paused: boolean | null
          is_visible: boolean | null
          latitude: number
          longitude: number
          mosque_capacity: string | null
          mosque_name: string
          parking_available: boolean | null
          sahar_food_availability: boolean | null
          sahar_food_contact_number: string | null
          sahar_food_time: string | null
          show_month_schedule: boolean | null
          updated_at: string | null
          wheelchair_accessible: boolean | null
          women_prayer_hall: boolean | null
        }
        Insert: {
          ac_available?: boolean | null
          created_at?: string | null
          district: string
          id?: string
          is_paused?: boolean | null
          is_visible?: boolean | null
          latitude: number
          longitude: number
          mosque_capacity?: string | null
          mosque_name: string
          parking_available?: boolean | null
          sahar_food_availability?: boolean | null
          sahar_food_contact_number?: string | null
          sahar_food_time?: string | null
          show_month_schedule?: boolean | null
          updated_at?: string | null
          wheelchair_accessible?: boolean | null
          women_prayer_hall?: boolean | null
        }
        Update: {
          ac_available?: boolean | null
          created_at?: string | null
          district?: string
          id?: string
          is_paused?: boolean | null
          is_visible?: boolean | null
          latitude?: number
          longitude?: number
          mosque_capacity?: string | null
          mosque_name?: string
          parking_available?: boolean | null
          sahar_food_availability?: boolean | null
          sahar_food_contact_number?: string | null
          sahar_food_time?: string | null
          show_month_schedule?: boolean | null
          updated_at?: string | null
          wheelchair_accessible?: boolean | null
          women_prayer_hall?: boolean | null
        }
        Relationships: []
      }
      mosque_admins: {
        Row: {
          created_at: string
          is_paused: boolean
          location_id: string
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          is_paused?: boolean
          location_id: string
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          is_paused?: boolean
          location_id?: string
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_admins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_announcements: {
        Row: {
          body: string
          created_at: string | null
          id: string
          location_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_announcements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          location_id: string
          photo_url: string
          storage_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          location_id: string
          photo_url: string
          storage_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          location_id?: string
          photo_url?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mosque_photos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          device_id: string
          id: string
          location_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          location_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          location_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "mosque_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_times: {
        Row: {
          asr_adhan: string | null
          asr_iqamah: string | null
          created_at: string | null
          date_from: string | null
          date_range: string
          date_to: string | null
          dhuhr_adhan: string | null
          dhuhr_iqamah: string | null
          fajr_adhan: string | null
          fajr_iqamah: string | null
          fajr_ramadan_iqamah: string | null
          id: string
          ifthar_time: string | null
          isha_adhan: string | null
          isha_iqamah: string | null
          isha_ramadan_iqamah: string | null
          ishraq_time: string | null
          jummah_adhan: string | null
          jummah_iqamah: string | null
          location_id: string | null
          maghrib_adhan: string | null
          maghrib_iqamah: string | null
          maghrib_ramadan_adhan: string | null
          maghrib_ramadan_iqamah: string | null
          mid_noon: string | null
          month: string
          sahar_end: string | null
          sun_rise: string | null
          sun_set: string | null
          tahajjud_end: string | null
          tahajjud_start: string | null
          tharaweeh: string | null
        }
        Insert: {
          asr_adhan?: string | null
          asr_iqamah?: string | null
          created_at?: string | null
          date_from?: string | null
          date_range: string
          date_to?: string | null
          dhuhr_adhan?: string | null
          dhuhr_iqamah?: string | null
          fajr_adhan?: string | null
          fajr_iqamah?: string | null
          fajr_ramadan_iqamah?: string | null
          id?: string
          ifthar_time?: string | null
          isha_adhan?: string | null
          isha_iqamah?: string | null
          isha_ramadan_iqamah?: string | null
          ishraq_time?: string | null
          jummah_adhan?: string | null
          jummah_iqamah?: string | null
          location_id?: string | null
          maghrib_adhan?: string | null
          maghrib_iqamah?: string | null
          maghrib_ramadan_adhan?: string | null
          maghrib_ramadan_iqamah?: string | null
          mid_noon?: string | null
          month: string
          sahar_end?: string | null
          sun_rise?: string | null
          sun_set?: string | null
          tahajjud_end?: string | null
          tahajjud_start?: string | null
          tharaweeh?: string | null
        }
        Update: {
          asr_adhan?: string | null
          asr_iqamah?: string | null
          created_at?: string | null
          date_from?: string | null
          date_range?: string
          date_to?: string | null
          dhuhr_adhan?: string | null
          dhuhr_iqamah?: string | null
          fajr_adhan?: string | null
          fajr_iqamah?: string | null
          fajr_ramadan_iqamah?: string | null
          id?: string
          ifthar_time?: string | null
          isha_adhan?: string | null
          isha_iqamah?: string | null
          isha_ramadan_iqamah?: string | null
          ishraq_time?: string | null
          jummah_adhan?: string | null
          jummah_iqamah?: string | null
          location_id?: string | null
          maghrib_adhan?: string | null
          maghrib_iqamah?: string | null
          maghrib_ramadan_adhan?: string | null
          maghrib_ramadan_iqamah?: string | null
          mid_noon?: string | null
          month?: string
          sahar_end?: string | null
          sun_rise?: string | null
          sun_set?: string | null
          tahajjud_end?: string | null
          tahajjud_start?: string | null
          tharaweeh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_times_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string
          expo_push_token: string
          id: string
          location_id: string | null
          platform: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          expo_push_token: string
          id?: string
          location_id?: string | null
          platform?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          expo_push_token?: string
          id?: string
          location_id?: string | null
          platform?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dnd_settings: Json | null
          id: string
          language: string | null
          prayer_tracker: Json | null
          preferred_location_id: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dnd_settings?: Json | null
          id?: string
          language?: string | null
          prayer_tracker?: Json | null
          preferred_location_id?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dnd_settings?: Json | null
          id?: string
          language?: string | null
          prayer_tracker?: Json | null
          preferred_location_id?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_preferred_location_id_fkey"
            columns: ["preferred_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_mosque_admin_credentials: {
        Args: { p_location_id: string; p_password: string; p_username: string }
        Returns: boolean
      }
      verify_mosque_admin: {
        Args: { p_password: string; p_username: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
