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
    PostgrestVersion: "14.5"
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
      location_donation_details: {
        Row: {
          donation_account_holder: string | null
          donation_account_number: string | null
          donation_bank_name: string | null
          donation_enabled: boolean
          donation_ifsc: string | null
          donation_notes: string | null
          donation_upi_id: string | null
          location_id: string
          updated_at: string
        }
        Insert: {
          donation_account_holder?: string | null
          donation_account_number?: string | null
          donation_bank_name?: string | null
          donation_enabled?: boolean
          donation_ifsc?: string | null
          donation_notes?: string | null
          donation_upi_id?: string | null
          location_id: string
          updated_at?: string
        }
        Update: {
          donation_account_holder?: string | null
          donation_account_number?: string | null
          donation_bank_name?: string | null
          donation_enabled?: boolean
          donation_ifsc?: string | null
          donation_notes?: string | null
          donation_upi_id?: string | null
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_donation_details_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
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
      mosque_admin_users: {
        Row: {
          created_at: string
          id: string
          is_paused: boolean
          location_id: string
          permissions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paused?: boolean
          location_id: string
          permissions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paused?: boolean
          location_id?: string
          permissions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_admin_users_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
          allow_rsvp: boolean
          body: string
          category: string
          created_at: string | null
          end_at: string | null
          event_at: string | null
          id: string
          location_id: string | null
          location_note: string | null
          title: string
          updated_at: string
          visible_from: string | null
          visible_until: string | null
        }
        Insert: {
          allow_rsvp?: boolean
          body: string
          category?: string
          created_at?: string | null
          end_at?: string | null
          event_at?: string | null
          id?: string
          location_id?: string | null
          location_note?: string | null
          title: string
          updated_at?: string
          visible_from?: string | null
          visible_until?: string | null
        }
        Update: {
          allow_rsvp?: boolean
          body?: string
          category?: string
          created_at?: string | null
          end_at?: string | null
          event_at?: string | null
          id?: string
          location_id?: string | null
          location_note?: string | null
          title?: string
          updated_at?: string
          visible_from?: string | null
          visible_until?: string | null
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
      mosque_attendance: {
        Row: {
          attend_date: string
          created_at: string
          id: string
          location_id: string
          prayer: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attend_date?: string
          created_at?: string
          id?: string
          location_id: string
          prayer: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attend_date?: string
          created_at?: string
          id?: string
          location_id?: string
          prayer?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_attendance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_event_rsvps: {
        Row: {
          created_at: string
          device_id: string
          display_name: string | null
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          display_name?: string | null
          event_id: string
          id?: string
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          display_name?: string | null
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mosque_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mosque_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_follows: {
        Row: {
          announcements: boolean
          created_at: string
          id: string
          location_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          created_at?: string
          id?: string
          location_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          created_at?: string
          id?: string
          location_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_follows_location_id_fkey"
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
      mosque_review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "mosque_reviews"
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
          is_hidden: boolean
          location_id: string
          rating: number
          report_count: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          is_hidden?: boolean
          location_id: string
          rating: number
          report_count?: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          is_hidden?: boolean
          location_id?: string
          rating?: number
          report_count?: number
          user_id?: string | null
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
      mosque_timing_audit: {
        Row: {
          actor_role: string
          changes: Json
          created_at: string
          date_range: string | null
          editor_label: string
          id: string
          location_id: string
          month: string | null
          prayer_time_id: string | null
          rolled_back_at: string | null
          section: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_role?: string
          changes?: Json
          created_at?: string
          date_range?: string | null
          editor_label?: string
          id?: string
          location_id: string
          month?: string | null
          prayer_time_id?: string | null
          rolled_back_at?: string | null
          section?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actor_role?: string
          changes?: Json
          created_at?: string
          date_range?: string | null
          editor_label?: string
          id?: string
          location_id?: string
          month?: string | null
          prayer_time_id?: string | null
          rolled_back_at?: string | null
          section?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_timing_audit_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_time_changes: {
        Row: {
          created_at: string
          date_range: string
          detected_at: string
          field: string
          id: string
          label: string
          location_id: string
          month: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          created_at?: string
          date_range: string
          detected_at?: string
          field: string
          id?: string
          label: string
          location_id: string
          month: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          created_at?: string
          date_range?: string
          detected_at?: string
          field?: string
          id?: string
          label?: string
          location_id?: string
          month?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_time_changes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_time_snapshots: {
        Row: {
          created_at: string
          date_range: string
          id: string
          location_id: string
          month: string
          updated_at: string
          values: Json
        }
        Insert: {
          created_at?: string
          date_range: string
          id?: string
          location_id: string
          month: string
          updated_at?: string
          values?: Json
        }
        Update: {
          created_at?: string
          date_range?: string
          id?: string
          location_id?: string
          month?: string
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prayer_time_snapshots_location_id_fkey"
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_id: string
          disabled: boolean
          expo_push_token: string
          id: string
          last_seen_at: string
          location_id: string | null
          mohalla_location_id: string | null
          platform: string | null
          provider: string
          reminder_prefs: Json
          self_scheduled: boolean
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          disabled?: boolean
          expo_push_token: string
          id?: string
          last_seen_at?: string
          location_id?: string | null
          mohalla_location_id?: string | null
          platform?: string | null
          provider?: string
          reminder_prefs?: Json
          self_scheduled?: boolean
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          disabled?: boolean
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          location_id?: string | null
          mohalla_location_id?: string | null
          platform?: string | null
          provider?: string
          reminder_prefs?: Json
          self_scheduled?: boolean
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_mohalla_location_id_fkey"
            columns: ["mohalla_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_sends: {
        Row: {
          created_at: string
          id: string
          send_key: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          send_key: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          send_key?: string
          token?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          description: string
          id: string
          location_id: string | null
          screenshot_paths: string[]
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          location_id?: string | null
          screenshot_paths?: string[]
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          location_id?: string | null
          screenshot_paths?: string[]
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_location_id_fkey"
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
          quran_bookmarks: Json
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
          quran_bookmarks?: Json
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
          quran_bookmarks?: Json
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_attendance_counts: {
        Args: { p_date: string; p_location_id: string }
        Returns: {
          count: number
          prayer: string
        }[]
      }
      get_attendance_trend: {
        Args: { p_from: string; p_location_id: string; p_to: string }
        Returns: {
          attend_date: string
          count: number
          prayer: string
        }[]
      }
      get_event_rsvp_counts: {
        Args: { p_event_ids: string[] }
        Returns: {
          count: number
          event_id: string
          status: string
        }[]
      }
      get_mosque_attendance_roster: {
        Args: { p_date: string; p_location_id: string }
        Returns: {
          display_name: string
          marked_at: string
          phone: string
          prayer: string
          user_id: string
        }[]
      }
      get_mosque_donation_details: {
        Args: { p_location_id: string }
        Returns: {
          donation_account_holder: string
          donation_account_number: string
          donation_bank_name: string
          donation_enabled: boolean
          donation_ifsc: string
          donation_notes: string
          donation_upi_id: string
        }[]
      }
      get_mosque_freshness: {
        Args: { p_location_ids: string[] }
        Returns: {
          last_updated: string
          location_id: string
          verified: boolean
        }[]
      }
      get_verified_mosque_ids: {
        Args: never
        Returns: {
          location_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      report_mosque_review: {
        Args: { p_reason?: string; p_review_id: string }
        Returns: boolean
      }
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
      app_role: "super_admin" | "mosque_admin"
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
    Enums: {
      app_role: ["super_admin", "mosque_admin"],
    },
  },
} as const
