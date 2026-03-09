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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_levels: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          emoji: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          actor_id: string
          actor_name: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
          target_user_name: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_name: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_name?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          checked_in_at: string
          id: string
          location: string | null
          member_id: string
          notes: string | null
        }
        Insert: {
          checked_in_at?: string
          id?: string
          location?: string | null
          member_id: string
          notes?: string | null
        }
        Update: {
          checked_in_at?: string
          id?: string
          location?: string | null
          member_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          attended: boolean | null
          attended_at: string | null
          cancelled_at: string | null
          class_id: string
          enrolled_at: string
          id: string
          member_id: string
          status: string
        }
        Insert: {
          attended?: boolean | null
          attended_at?: string | null
          cancelled_at?: string | null
          class_id: string
          enrolled_at?: string
          id?: string
          member_id: string
          status?: string
        }
        Update: {
          attended?: boolean | null
          attended_at?: string | null
          cancelled_at?: string | null
          class_id?: string
          enrolled_at?: string
          id?: string
          member_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "gym_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_coach_history: {
        Row: {
          changed_at: string
          changed_by: string
          client_id: string
          id: string
          new_coach_id: string | null
          notes: string | null
          previous_coach_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          client_id: string
          id?: string
          new_coach_id?: string | null
          notes?: string | null
          previous_coach_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          client_id?: string
          id?: string
          new_coach_id?: string | null
          notes?: string | null
          previous_coach_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_coach_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_coach_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_coach_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_coach_history_new_coach_id_fkey"
            columns: ["new_coach_id"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_coach_history_new_coach_id_fkey"
            columns: ["new_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_coach_history_previous_coach_id_fkey"
            columns: ["previous_coach_id"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_coach_history_previous_coach_id_fkey"
            columns: ["previous_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_coach_id: string | null
          carry_over_sessions: number
          created_at: string | null
          expiry_date: string | null
          id: string
          member_id: string | null
          name: string
          package_type: string
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          total_sessions_purchased: number
          updated_at: string | null
        }
        Insert: {
          assigned_coach_id?: string | null
          carry_over_sessions?: number
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          member_id?: string | null
          name: string
          package_type?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          total_sessions_purchased?: number
          updated_at?: string | null
        }
        Update: {
          assigned_coach_id?: string | null
          carry_over_sessions?: number
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          member_id?: string | null
          name?: string
          package_type?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          total_sessions_purchased?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "clients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          gym_closing_hour: number | null
          gym_opening_hour: number | null
          id: string
          logo_url: string | null
          max_email_changes: number
          phone: string | null
          registration_number: string | null
          require_profile_photo: boolean
          session1_end: string | null
          session1_start: string | null
          session2_end: string | null
          session2_start: string | null
          staff_early_minutes: number | null
          tax_id: string | null
          turnstile_device_ip: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          gym_closing_hour?: number | null
          gym_opening_hour?: number | null
          id?: string
          logo_url?: string | null
          max_email_changes?: number
          phone?: string | null
          registration_number?: string | null
          require_profile_photo?: boolean
          session1_end?: string | null
          session1_start?: string | null
          session2_end?: string | null
          session2_start?: string | null
          staff_early_minutes?: number | null
          tax_id?: string | null
          turnstile_device_ip?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          gym_closing_hour?: number | null
          gym_opening_hour?: number | null
          id?: string
          logo_url?: string | null
          max_email_changes?: number
          phone?: string | null
          registration_number?: string | null
          require_profile_photo?: boolean
          session1_end?: string | null
          session1_start?: string | null
          session2_end?: string | null
          session2_start?: string | null
          staff_early_minutes?: number | null
          tax_id?: string | null
          turnstile_device_ip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          require_signature: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          require_signature?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          require_signature?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          equipment: string
          id: string
          is_custom: boolean
          name: string
          training_type: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment?: string
          id?: string
          is_custom?: boolean
          name: string
          training_type: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment?: string
          id?: string
          is_custom?: boolean
          name?: string
          training_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_classes: {
        Row: {
          capacity: number
          class_date: string | null
          created_at: string
          day_of_week: number
          description: string | null
          end_time: string
          id: string
          instructor_id: string | null
          is_recurring: boolean
          name: string
          room: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          class_date?: string | null
          created_at?: string
          day_of_week: number
          description?: string | null
          end_time: string
          id?: string
          instructor_id?: string | null
          is_recurring?: boolean
          name: string
          room?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          class_date?: string | null
          created_at?: string
          day_of_week?: number
          description?: string | null
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_recurring?: boolean
          name?: string
          room?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          instructor_id: string
          is_recurring: boolean
          notes: string | null
          specific_date: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          instructor_id: string
          is_recurring?: boolean
          notes?: string | null
          specific_date?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          instructor_id?: string
          is_recurring?: boolean
          notes?: string | null
          specific_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_availability_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "instructor_availability_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          classification_code: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          unit_price: number
        }
        Insert: {
          classification_code?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total: number
          unit_price: number
        }
        Update: {
          classification_code?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          buyer_address: string | null
          buyer_brn: string | null
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          buyer_tin: string | null
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          member_id: string
          notes: string | null
          seller_address: string | null
          seller_brn: string | null
          seller_email: string | null
          seller_name: string | null
          seller_phone: string | null
          seller_tin: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_address?: string | null
          buyer_brn?: string | null
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          buyer_tin?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          member_id: string
          notes?: string | null
          seller_address?: string | null
          seller_brn?: string | null
          seller_email?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          seller_tin?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_address?: string | null
          buyer_brn?: string | null
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          buyer_tin?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          member_id?: string
          notes?: string | null
          seller_address?: string | null
          seller_brn?: string | null
          seller_email?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          seller_tin?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          id: string
          logged_in_at: string
          role: string
          user_id: string
          user_name: string
        }
        Insert: {
          id?: string
          logged_in_at?: string
          role: string
          user_id: string
          user_name: string
        }
        Update: {
          id?: string
          logged_in_at?: string
          role?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      member_document_signatures: {
        Row: {
          document_id: string
          id: string
          ip_address: string | null
          member_id: string
          signature_data: string | null
          signed_at: string
        }
        Insert: {
          document_id: string
          id?: string
          ip_address?: string | null
          member_id: string
          signature_data?: string | null
          signed_at?: string
        }
        Update: {
          document_id?: string
          id?: string
          ip_address?: string | null
          member_id?: string
          signature_data?: string | null
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      member_id_counter: {
        Row: {
          current_value: number
          id: number
          year: number
        }
        Insert: {
          current_value?: number
          id?: number
          year?: number
        }
        Update: {
          current_value?: number
          id?: number
          year?: number
        }
        Relationships: []
      }
      member_vouchers: {
        Row: {
          assigned_at: string
          id: string
          member_id: string
          status: string
          voucher_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          member_id: string
          status?: string
          voucher_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          member_id?: string
          status?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          access_level: string
          created_at: string
          description: string | null
          display_order: number
          duration_days: number
          duration_months: number
          id: string
          is_active: boolean
          price: number
          sessions: number | null
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_days?: number
          duration_months?: number
          id?: string
          is_active?: boolean
          price?: number
          sessions?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_days?: number
          duration_months?: number
          id?: string
          is_active?: boolean
          price?: number
          sessions?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          plan_type: string
          status: string
          updated_at: string
          user_id: string
          valid_from: string | null
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string
          user_id: string
          valid_from?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_memberships_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_memberships_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          booking_date: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          payer_name: string | null
          payment_date: string | null
          plan_type: string
          receipt_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          payer_name?: string | null
          payment_date?: string | null
          plan_type: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          payer_name?: string | null
          payment_date?: string | null
          plan_type?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_url: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          legacy_id: string | null
          member_id: string | null
          name: string
          nfc_card_id: string | null
          phone_number: string | null
          qr_code_url: string | null
          updated_at: string | null
          waiver_signature_name: string | null
          waiver_signed_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          legacy_id?: string | null
          member_id?: string | null
          name: string
          nfc_card_id?: string | null
          phone_number?: string | null
          qr_code_url?: string | null
          updated_at?: string | null
          waiver_signature_name?: string | null
          waiver_signed_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          legacy_id?: string | null
          member_id?: string | null
          name?: string
          nfc_card_id?: string | null
          phone_number?: string | null
          qr_code_url?: string | null
          updated_at?: string | null
          waiver_signature_name?: string | null
          waiver_signed_at?: string | null
        }
        Relationships: []
      }
      redemption_logs: {
        Row: {
          id: string
          member_id: string | null
          redeemed_at: string
          vendor_id: string
          voucher_id: string
        }
        Insert: {
          id?: string
          member_id?: string | null
          redeemed_at?: string
          vendor_id: string
          voucher_id: string
        }
        Update: {
          id?: string
          member_id?: string | null
          redeemed_at?: string
          vendor_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_logs_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          new_expiry: string
          new_status: string
          notes: string | null
          performed_by: string
          plan_name: string
          previous_expiry: string | null
          previous_status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          new_expiry: string
          new_status?: string
          notes?: string | null
          performed_by: string
          plan_name: string
          previous_expiry?: string | null
          previous_status?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          new_expiry?: string
          new_status?: string
          notes?: string | null
          performed_by?: string
          plan_name?: string
          previous_expiry?: string | null
          previous_status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      training_logs: {
        Row: {
          client_id: string
          coach_id: string | null
          created_at: string | null
          date: string
          exercises: Json | null
          id: string
          notes: string | null
          sessions_used: number
          training_type: Database["public"]["Enums"]["training_type"]
          training_types: string[] | null
          weight_kg: number | null
        }
        Insert: {
          client_id: string
          coach_id?: string | null
          created_at?: string | null
          date?: string
          exercises?: Json | null
          id?: string
          notes?: string | null
          sessions_used?: number
          training_type: Database["public"]["Enums"]["training_type"]
          training_types?: string[] | null
          weight_kg?: number | null
        }
        Update: {
          client_id?: string
          coach_id?: string | null
          created_at?: string | null
          date?: string
          exercises?: Json | null
          id?: string
          notes?: string | null
          sessions_used?: number
          training_type?: Database["public"]["Enums"]["training_type"]
          training_types?: string[] | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          created_at: string
          description: string | null
          duration_weeks: number
          id: string
          is_active: boolean
          level: string
          name: string
          sessions_per_week: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          is_active?: boolean
          level?: string
          name: string
          sessions_per_week?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          sessions_per_week?: number
          updated_at?: string
        }
        Relationships: []
      }
      turnstile_command_queue: {
        Row: {
          command_json: Json
          created_at: string
          device_sn: string
          id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          command_json: Json
          created_at?: string
          device_sn: string
          id?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          command_json?: Json
          created_at?: string
          device_sn?: string
          id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      turnstile_events: {
        Row: {
          cap_time: string | null
          cmd: string | null
          customer_text: string | null
          device_sn: string
          id: string
          is_rejected: boolean | null
          match_failed_reson: number | null
          match_result: number | null
          person_id: string | null
          person_name: string | null
          raw_payload: Json
          received_at: string
          reject_reason: string | null
          sequence_no: number | null
        }
        Insert: {
          cap_time?: string | null
          cmd?: string | null
          customer_text?: string | null
          device_sn: string
          id?: string
          is_rejected?: boolean | null
          match_failed_reson?: number | null
          match_result?: number | null
          person_id?: string | null
          person_name?: string | null
          raw_payload: Json
          received_at?: string
          reject_reason?: string | null
          sequence_no?: number | null
        }
        Update: {
          cap_time?: string | null
          cmd?: string | null
          customer_text?: string | null
          device_sn?: string
          id?: string
          is_rejected?: boolean | null
          match_failed_reson?: number | null
          match_result?: number | null
          person_id?: string | null
          person_name?: string | null
          raw_payload?: Json
          received_at?: string
          reject_reason?: string | null
          sequence_no?: number | null
        }
        Relationships: []
      }
      turnstile_face_devices: {
        Row: {
          addr_name: string | null
          addr_no: string | null
          created_at: string
          device_no: string | null
          device_sn: string
          device_type: string
          id: string
          is_active: boolean
          location: string | null
          name: string
        }
        Insert: {
          addr_name?: string | null
          addr_no?: string | null
          created_at?: string
          device_no?: string | null
          device_sn: string
          device_type?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
        }
        Update: {
          addr_name?: string | null
          addr_no?: string | null
          created_at?: string
          device_no?: string | null
          device_sn?: string
          device_type?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      turnstile_face_enrollments: {
        Row: {
          customer_text: string | null
          device_sn: string
          enrolled_at: string
          id: string
          person_id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          customer_text?: string | null
          device_sn: string
          enrolled_at?: string
          id?: string
          person_id: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          customer_text?: string | null
          device_sn?: string
          enrolled_at?: string
          id?: string
          person_id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnstile_face_enrollments_device_sn_fkey"
            columns: ["device_sn"]
            isOneToOne: false
            referencedRelation: "turnstile_face_devices"
            referencedColumns: ["device_sn"]
          },
        ]
      }
      turnstile_face_logs: {
        Row: {
          cap_time: string
          created_at: string
          decision: string
          device_sn: string
          id: string
          person_id: string | null
          raw_payload: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          cap_time: string
          created_at?: string
          decision: string
          device_sn: string
          id?: string
          person_id?: string | null
          raw_payload?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          cap_time?: string
          created_at?: string
          decision?: string
          device_sn?: string
          id?: string
          person_id?: string | null
          raw_payload?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      turnstile_verifications: {
        Row: {
          decision_code: number
          decision_desc: string | null
          device_sn: string | null
          id: string
          is_rejected: boolean | null
          match_state: number | null
          math_type: number | null
          person_id: string | null
          person_name: string | null
          qrcode: string | null
          raw_payload: Json
          received_at: string | null
          reject_reason: string | null
        }
        Insert: {
          decision_code?: number
          decision_desc?: string | null
          device_sn?: string | null
          id?: string
          is_rejected?: boolean | null
          match_state?: number | null
          math_type?: number | null
          person_id?: string | null
          person_name?: string | null
          qrcode?: string | null
          raw_payload: Json
          received_at?: string | null
          reject_reason?: string | null
        }
        Update: {
          decision_code?: number
          decision_desc?: string | null
          device_sn?: string | null
          id?: string
          is_rejected?: boolean | null
          match_state?: number | null
          math_type?: number | null
          person_id?: string | null
          person_name?: string | null
          qrcode?: string | null
          raw_payload?: Json
          received_at?: string | null
          reject_reason?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          business_name: string
          created_at: string
          id: string
          total_redeemed_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          created_at?: string
          id?: string
          total_redeemed_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          total_redeemed_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendors_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "member_access_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_vendors_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          current_redemptions: number
          description: string | null
          expires_at: string | null
          id: string
          max_redemptions: number | null
          member_id: string | null
          redeemed_at: string | null
          status: string
          title: string
          valid_from: string | null
          value: number
          vendor_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_redemptions?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          member_id?: string | null
          redeemed_at?: string | null
          status?: string
          title: string
          valid_from?: string | null
          value?: number
          vendor_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_redemptions?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          member_id?: string | null
          redeemed_at?: string | null
          status?: string
          title?: string
          valid_from?: string | null
          value?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_access_view: {
        Row: {
          membership_status: string | null
          name: string | null
          person_id: string | null
          plan_type: string | null
          user_id: string | null
          valid_until: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_member_id: { Args: never; Returns: string }
      get_class_enrollment_counts: {
        Args: { class_ids: string[] }
        Returns: {
          class_id: string
          enrolled_count: number
        }[]
      }
      get_last_weight: {
        Args: { p_client_id: string; p_training_type: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_it_admin: { Args: { _user_id: string }; Returns: boolean }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_vendor: { Args: { _user_id: string }; Returns: boolean }
      use_invite_code: { Args: { input_code: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "coach"
        | "it_admin"
        | "member"
        | "vendor"
        | "staff"
        | "day_pass"
        | "studio"
      client_status: "active" | "expired"
      training_type:
        | "chest"
        | "back"
        | "legs"
        | "shoulders"
        | "arms"
        | "core"
        | "cardio"
        | "full_body"
        | "stretching"
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
      app_role: [
        "admin",
        "coach",
        "it_admin",
        "member",
        "vendor",
        "staff",
        "day_pass",
        "studio",
      ],
      client_status: ["active", "expired"],
      training_type: [
        "chest",
        "back",
        "legs",
        "shoulders",
        "arms",
        "core",
        "cardio",
        "full_body",
        "stretching",
      ],
    },
  },
} as const
