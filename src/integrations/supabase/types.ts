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
      locations: {
        Row: {
          created_at: string | null
          district: string
          id: string
          latitude: number
          longitude: number
          mosque_name: string
          sahar_food_availability: boolean | null
          sahar_food_contact_number: string | null
          sahar_food_time: string | null
          updated_at: string | null
          women_prayer_hall: boolean | null
        }
        Insert: {
          created_at?: string | null
          district: string
          id?: string
          latitude: number
          longitude: number
          mosque_name: string
          sahar_food_availability?: boolean | null
          sahar_food_contact_number?: string | null
          sahar_food_time?: string | null
          updated_at?: string | null
          women_prayer_hall?: boolean | null
        }
        Update: {
          created_at?: string | null
          district?: string
          id?: string
          latitude?: number
          longitude?: number
          mosque_name?: string
          sahar_food_availability?: boolean | null
          sahar_food_contact_number?: string | null
          sahar_food_time?: string | null
          updated_at?: string | null
          women_prayer_hall?: boolean | null
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          asr_adhan: string
          asr_iqamah: string
          created_at: string | null
          date_from: string | null
          date_range: string
          date_to: string | null
          dhuhr_adhan: string
          dhuhr_iqamah: string
          fajr_adhan: string
          fajr_iqamah: string
          fajr_ramadan_iqamah: string | null
          id: string
          ifthar_time: string | null
          isha_adhan: string
          isha_iqamah: string
          isha_ramadan_iqamah: string | null
          jummah_adhan: string | null
          jummah_iqamah: string | null
          location_id: string | null
          maghrib_adhan: string
          maghrib_iqamah: string
          maghrib_ramadan_adhan: string | null
          maghrib_ramadan_iqamah: string | null
          mid_noon: string | null
          month: string
          sahar_end: string | null
          sun_rise: string | null
          sun_set: string | null
          tharaweeh: string | null
        }
        Insert: {
          asr_adhan: string
          asr_iqamah: string
          created_at?: string | null
          date_from?: string | null
          date_range: string
          date_to?: string | null
          dhuhr_adhan: string
          dhuhr_iqamah: string
          fajr_adhan: string
          fajr_iqamah: string
          fajr_ramadan_iqamah?: string | null
          id?: string
          ifthar_time?: string | null
          isha_adhan: string
          isha_iqamah: string
          isha_ramadan_iqamah?: string | null
          jummah_adhan?: string | null
          jummah_iqamah?: string | null
          location_id?: string | null
          maghrib_adhan: string
          maghrib_iqamah: string
          maghrib_ramadan_adhan?: string | null
          maghrib_ramadan_iqamah?: string | null
          mid_noon?: string | null
          month: string
          sahar_end?: string | null
          sun_rise?: string | null
          sun_set?: string | null
          tharaweeh?: string | null
        }
        Update: {
          asr_adhan?: string
          asr_iqamah?: string
          created_at?: string | null
          date_from?: string | null
          date_range?: string
          date_to?: string | null
          dhuhr_adhan?: string
          dhuhr_iqamah?: string
          fajr_adhan?: string
          fajr_iqamah?: string
          fajr_ramadan_iqamah?: string | null
          id?: string
          ifthar_time?: string | null
          isha_adhan?: string
          isha_iqamah?: string
          isha_ramadan_iqamah?: string | null
          jummah_adhan?: string | null
          jummah_iqamah?: string | null
          location_id?: string | null
          maghrib_adhan?: string
          maghrib_iqamah?: string
          maghrib_ramadan_adhan?: string | null
          maghrib_ramadan_iqamah?: string | null
          mid_noon?: string | null
          month?: string
          sahar_end?: string | null
          sun_rise?: string | null
          sun_set?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
