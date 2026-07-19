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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accumulation_goals: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_quantity: number
          deadline: string | null
          id: string
          notes: string | null
          program: string
          target_quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_quantity?: number
          deadline?: string | null
          id?: string
          notes?: string | null
          program: string
          target_quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_quantity?: number
          deadline?: string | null
          id?: string
          notes?: string | null
          program?: string
          target_quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_settings: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          id: string
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          read?: boolean | null
          title: string
          type?: Database["public"]["Enums"]["alert_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          description: string | null
          event_category: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_category?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_category?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string | null
          google_event_id: string
          id: string
          last_synced_at: string | null
          reservation_id: string
          reservation_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          google_event_id: string
          id?: string
          last_synced_at?: string | null
          reservation_id: string
          reservation_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          google_event_id?: string
          id?: string
          last_synced_at?: string | null
          reservation_id?: string
          reservation_type?: string
          user_id?: string
        }
        Relationships: []
      }
      client_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          body: string
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          sent_at: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body: string
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      club_subscriptions: {
        Row: {
          active: boolean | null
          annual_installment_price: number | null
          annual_price: number | null
          billing_day: number | null
          bonus_frequency: string | null
          bonus_type: string | null
          bonus_value: number | null
          created_at: string
          credit_card_id: string | null
          holder_id: string
          id: string
          initial_bonus: number | null
          initial_bonus_applied: boolean | null
          initial_bonus_applied_at: string | null
          last_bonus_generated_at: string | null
          last_points_generated_at: string | null
          modality: string | null
          monthly_fee: number | null
          notes: string | null
          points_per_month: number | null
          program: string
          start_date: string | null
          subscription_name: string | null
          total_amount_paid: number | null
          total_bonuses_received: number | null
          total_points_generated: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          annual_installment_price?: number | null
          annual_price?: number | null
          billing_day?: number | null
          bonus_frequency?: string | null
          bonus_type?: string | null
          bonus_value?: number | null
          created_at?: string
          credit_card_id?: string | null
          holder_id: string
          id?: string
          initial_bonus?: number | null
          initial_bonus_applied?: boolean | null
          initial_bonus_applied_at?: string | null
          last_bonus_generated_at?: string | null
          last_points_generated_at?: string | null
          modality?: string | null
          monthly_fee?: number | null
          notes?: string | null
          points_per_month?: number | null
          program: string
          start_date?: string | null
          subscription_name?: string | null
          total_amount_paid?: number | null
          total_bonuses_received?: number | null
          total_points_generated?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          annual_installment_price?: number | null
          annual_price?: number | null
          billing_day?: number | null
          bonus_frequency?: string | null
          bonus_type?: string | null
          bonus_value?: number | null
          created_at?: string
          credit_card_id?: string | null
          holder_id?: string
          id?: string
          initial_bonus?: number | null
          initial_bonus_applied?: boolean | null
          initial_bonus_applied_at?: string | null
          last_bonus_generated_at?: string | null
          last_points_generated_at?: string | null
          modality?: string | null
          monthly_fee?: number | null
          notes?: string | null
          points_per_month?: number | null
          program?: string
          start_date?: string | null
          subscription_name?: string | null
          total_amount_paid?: number | null
          total_bonuses_received?: number | null
          total_points_generated?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscriptions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscriptions_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_usage_records: {
        Row: {
          cpf_count: number
          created_at: string | null
          emission_date: string
          holder_id: string
          id: string
          locator: string | null
          operation_id: string | null
          passenger_name: string | null
          program_name: string
          user_id: string
        }
        Insert: {
          cpf_count?: number
          created_at?: string | null
          emission_date: string
          holder_id: string
          id?: string
          locator?: string | null
          operation_id?: string | null
          passenger_name?: string | null
          program_name: string
          user_id: string
        }
        Update: {
          cpf_count?: number
          created_at?: string | null
          emission_date?: string
          holder_id?: string
          id?: string
          locator?: string | null
          operation_id?: string | null
          passenger_name?: string | null
          program_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpf_usage_records_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_usage_records_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_type: string | null
          annual_fee: number | null
          billing_day: number | null
          card_name: string
          cardholder_name: string | null
          created_at: string
          credit_limit: number | null
          due_day: number | null
          expiry_date: string | null
          holder_id: string | null
          id: string
          is_active: boolean | null
          issuer_bank: string | null
          last_four_digits: string | null
          linked_program: string | null
          miles_per_dollar: number | null
          notes: string | null
          schedule_points_on_closing: boolean | null
          updated_at: string
          user_id: string
          vip_active: boolean | null
          vip_quota_convidado: number | null
          vip_quota_titular: number | null
        }
        Insert: {
          account_type?: string | null
          annual_fee?: number | null
          billing_day?: number | null
          card_name: string
          cardholder_name?: string | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          expiry_date?: string | null
          holder_id?: string | null
          id?: string
          is_active?: boolean | null
          issuer_bank?: string | null
          last_four_digits?: string | null
          linked_program?: string | null
          miles_per_dollar?: number | null
          notes?: string | null
          schedule_points_on_closing?: boolean | null
          updated_at?: string
          user_id: string
          vip_active?: boolean | null
          vip_quota_convidado?: number | null
          vip_quota_titular?: number | null
        }
        Update: {
          account_type?: string | null
          annual_fee?: number | null
          billing_day?: number | null
          card_name?: string
          cardholder_name?: string | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          expiry_date?: string | null
          holder_id?: string | null
          id?: string
          is_active?: boolean | null
          issuer_bank?: string | null
          last_four_digits?: string | null
          linked_program?: string | null
          miles_per_dollar?: number | null
          notes?: string | null
          schedule_points_on_closing?: boolean | null
          updated_at?: string
          user_id?: string
          vip_active?: boolean | null
          vip_quota_convidado?: number | null
          vip_quota_titular?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_audit: {
        Row: {
          asaas_customer_deleted_at: string | null
          confirmed_at: string
          created_at: string
          deleted_user_id: string
          hard_deleted_at: string
          id: string
          notes: string | null
          posthog_person_deleted_at: string | null
          requested_at: string
          row_counts_deleted: Json
          sentry_user_deleted_at: string | null
        }
        Insert: {
          asaas_customer_deleted_at?: string | null
          confirmed_at: string
          created_at?: string
          deleted_user_id: string
          hard_deleted_at?: string
          id?: string
          notes?: string | null
          posthog_person_deleted_at?: string | null
          requested_at: string
          row_counts_deleted?: Json
          sentry_user_deleted_at?: string | null
        }
        Update: {
          asaas_customer_deleted_at?: string | null
          confirmed_at?: string
          created_at?: string
          deleted_user_id?: string
          hard_deleted_at?: string
          id?: string
          notes?: string | null
          posthog_person_deleted_at?: string | null
          requested_at?: string
          row_counts_deleted?: Json
          sentry_user_deleted_at?: string | null
        }
        Relationships: []
      }
      google_calendar_integrations: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          enabled: boolean | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      holders: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      lgpd_export_log: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          row_counts: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          row_counts?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          row_counts?: Json
          user_id?: string
        }
        Relationships: []
      }
      managed_accounts: {
        Row: {
          created_at: string
          id: string
          label: string
          managed_user_id: string
          owner_user_id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          managed_user_id: string
          owner_user_id: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          managed_user_id?: string
          owner_user_id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          bonus: number | null
          cost_per_thousand: number | null
          created_at: string
          credit_card: string | null
          date: string
          holder_id: string | null
          holder_name: string | null
          id: string
          installments: number | null
          notes: string | null
          program: string
          quantity: number
          status: Database["public"]["Enums"]["operation_status"]
          total_cost: number | null
          type: Database["public"]["Enums"]["operation_type"]
          updated_at: string
          user_id: string
          validity: string | null
        }
        Insert: {
          bonus?: number | null
          cost_per_thousand?: number | null
          created_at?: string
          credit_card?: string | null
          date?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          program: string
          quantity: number
          status?: Database["public"]["Enums"]["operation_status"]
          total_cost?: number | null
          type: Database["public"]["Enums"]["operation_type"]
          updated_at?: string
          user_id: string
          validity?: string | null
        }
        Update: {
          bonus?: number | null
          cost_per_thousand?: number | null
          created_at?: string
          credit_card?: string | null
          date?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          program?: string
          quantity?: number
          status?: Database["public"]["Enums"]["operation_status"]
          total_cost?: number | null
          type?: Database["public"]["Enums"]["operation_type"]
          updated_at?: string
          user_id?: string
          validity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_bonuses: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          expected_date: string
          holder_id: string | null
          holder_name: string | null
          id: string
          loja: string | null
          notes: string | null
          operation_id: string | null
          produto: string | null
          program: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          expected_date: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          loja?: string | null
          notes?: string | null
          operation_id?: string | null
          produto?: string | null
          program?: string
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          expected_date?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          loja?: string | null
          notes?: string | null
          operation_id?: string | null
          produto?: string | null
          program?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_bonuses_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_bonuses_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_entitlements: {
        Row: {
          enabled: boolean
          feature_key: string
          id: number
          limit_count: number | null
          plan_type: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          id?: number
          limit_count?: number | null
          plan_type: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          id?: number
          limit_count?: number | null
          plan_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_type_fkey"
            columns: ["plan_type"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_type"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          is_purchasable: boolean
          monthly_price: number | null
          name: string
          plan_type: string
          sort_order: number
          updated_at: string
          yearly_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_purchasable?: boolean
          monthly_price?: number | null
          name: string
          plan_type: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          is_purchasable?: boolean
          monthly_price?: number | null
          name?: string
          plan_type?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_notified_at: string | null
          program: string
          target_buy_price: number | null
          target_sell_price: number | null
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          program: string
          target_buy_price?: number | null
          target_sell_price?: number | null
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_notified_at?: string | null
          program?: string
          target_buy_price?: number | null
          target_sell_price?: number | null
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asaas_customer_id: string | null
          avatar_url: string | null
          cpf: string | null
          created_at: string
          deletion_confirmed_at: string | null
          deletion_requested_at: string | null
          deletion_token: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          onboarding_progress: Json | null
          product_tier: string
          quick_actions: string[] | null
          sidebar_items_order: Json | null
          sidebar_order: string[] | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          deletion_confirmed_at?: string | null
          deletion_requested_at?: string | null
          deletion_token?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          onboarding_progress?: Json | null
          product_tier?: string
          quick_actions?: string[] | null
          sidebar_items_order?: Json | null
          sidebar_order?: string[] | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          deletion_confirmed_at?: string | null
          deletion_requested_at?: string | null
          deletion_token?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          onboarding_progress?: Json | null
          product_tier?: string
          quick_actions?: string[] | null
          sidebar_items_order?: Json | null
          sidebar_order?: string[] | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_accounts: {
        Row: {
          created_at: string
          holder_id: string | null
          id: string
          login: string
          notes: string | null
          password_encrypted: string | null
          program: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          holder_id?: string | null
          id?: string
          login: string
          notes?: string | null
          password_encrypted?: string | null
          program: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          holder_id?: string | null
          id?: string
          login?: string
          notes?: string | null
          password_encrypted?: string | null
          program?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_accounts_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      program_balances: {
        Row: {
          average_cost: number | null
          balance: number
          created_at: string
          expiring_soon: number | null
          expiry_date: string | null
          holder_id: string | null
          id: string
          program: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_cost?: number | null
          balance?: number
          created_at?: string
          expiring_soon?: number | null
          expiry_date?: string | null
          holder_id?: string | null
          id?: string
          program: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_cost?: number | null
          balance?: number
          created_at?: string
          expiring_soon?: number | null
          expiry_date?: string | null
          holder_id?: string | null
          id?: string
          program?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_balances_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      program_cpf_limits: {
        Row: {
          created_at: string | null
          default_limit: number
          holder_counts: boolean | null
          id: string
          notes: string | null
          program_name: string
          renewal_date: string | null
          renewal_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_limit?: number
          holder_counts?: boolean | null
          id?: string
          notes?: string | null
          program_name: string
          renewal_date?: string | null
          renewal_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_limit?: number
          holder_counts?: boolean | null
          id?: string
          notes?: string | null
          program_name?: string
          renewal_date?: string | null
          renewal_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      program_market_prices: {
        Row: {
          buy_price: number
          created_at: string
          fetched_at: string
          id: string
          program: string
          sell_price: number
          source: string | null
        }
        Insert: {
          buy_price: number
          created_at?: string
          fetched_at?: string
          id?: string
          program: string
          sell_price: number
          source?: string | null
        }
        Update: {
          buy_price?: number
          created_at?: string
          fetched_at?: string
          id?: string
          program?: string
          sell_price?: number
          source?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          link: string | null
          source: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          source?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          source?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      push_alert_dedupe: {
        Row: {
          balance_id: string
          event_type: string
          sent_at: string
          sent_on: string
          user_id: string
        }
        Insert: {
          balance_id: string
          event_type: string
          sent_at?: string
          sent_on: string
          user_id: string
        }
        Update: {
          balance_id?: string
          event_type?: string
          sent_at?: string
          sent_on?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          app_version: string | null
          created_at: string
          device_token: string | null
          id: string
          last_seen_at: string
          platform: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_token?: string | null
          id?: string
          last_seen_at?: string
          platform: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_token?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          amount_paid: number
          bonus_generated: number
          cost_per_thousand: number | null
          created_at: string
          id: string
          month_year: string
          points_generated: number
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          bonus_generated?: number
          cost_per_thousand?: number | null
          created_at?: string
          id?: string
          month_year: string
          points_generated?: number
          subscription_id: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          bonus_generated?: number
          cost_per_thousand?: number | null
          created_at?: string
          id?: string
          month_year?: string
          points_generated?: number
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "club_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_leads: {
        Row: {
          anonymous_id: string | null
          billing_period: string
          converted: boolean
          converted_at: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json
          notes: string | null
          plan_interest: string
          price_label: string | null
          source: string
          total_label: string | null
          updated_at: string
          user_id: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          anonymous_id?: string | null
          billing_period?: string
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          plan_interest: string
          price_label?: string | null
          source?: string
          total_label?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          anonymous_id?: string | null
          billing_period?: string
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          plan_interest?: string
          price_label?: string | null
          source?: string
          total_label?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_attractions: {
        Row: {
          activity_date: string
          attraction_name: string
          attraction_type: string
          cash_price: number | null
          city: string
          client_id: string | null
          confirmation_number: string | null
          cost_brl: number
          country: string
          created_at: string
          holder_id: string | null
          holder_name: string | null
          id: string
          notes: string | null
          participants: number
          provider: string | null
          sale_price: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          attraction_name: string
          attraction_type?: string
          cash_price?: number | null
          city: string
          client_id?: string | null
          confirmation_number?: string | null
          cost_brl?: number
          country?: string
          created_at?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          notes?: string | null
          participants?: number
          provider?: string | null
          sale_price?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          attraction_name?: string
          attraction_type?: string
          cash_price?: number | null
          city?: string
          client_id?: string | null
          confirmation_number?: string | null
          cost_brl?: number
          country?: string
          created_at?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          notes?: string | null
          participants?: number
          provider?: string | null
          sale_price?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_attractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_attractions_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_car_rentals: {
        Row: {
          cash_price: number | null
          client_id: string | null
          confirmation_number: string | null
          created_at: string
          days: number
          dropoff_date: string
          dropoff_location: string
          holder_id: string | null
          holder_name: string | null
          id: string
          miles_program: string | null
          miles_used: number
          notes: string | null
          pickup_date: string
          pickup_location: string
          rental_company: string
          sale_price: number
          status: string
          tax_brl: number
          total_cost_brl: number
          updated_at: string
          user_id: string
          vehicle_category: string
        }
        Insert: {
          cash_price?: number | null
          client_id?: string | null
          confirmation_number?: string | null
          created_at?: string
          days: number
          dropoff_date: string
          dropoff_location: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          miles_program?: string | null
          miles_used: number
          notes?: string | null
          pickup_date: string
          pickup_location: string
          rental_company: string
          sale_price?: number
          status?: string
          tax_brl?: number
          total_cost_brl?: number
          updated_at?: string
          user_id: string
          vehicle_category: string
        }
        Update: {
          cash_price?: number | null
          client_id?: string | null
          confirmation_number?: string | null
          created_at?: string
          days?: number
          dropoff_date?: string
          dropoff_location?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          miles_program?: string | null
          miles_used?: number
          notes?: string | null
          pickup_date?: string
          pickup_location?: string
          rental_company?: string
          sale_price?: number
          status?: string
          tax_brl?: number
          total_cost_brl?: number
          updated_at?: string
          user_id?: string
          vehicle_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_car_rentals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_car_rentals_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_clients: {
        Row: {
          cpf: string
          created_at: string
          email: string | null
          id: string
          miles_balance: number
          name: string
          notes: string | null
          phone: string | null
          status: string
          total_miles_used: number
          total_spent_brl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email?: string | null
          id?: string
          miles_balance?: number
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          total_miles_used?: number
          total_spent_brl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string | null
          id?: string
          miles_balance?: number
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          total_miles_used?: number
          total_spent_brl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_cruises: {
        Row: {
          arrival_port: string
          cabin_type: string
          cash_price: number | null
          client_id: string | null
          confirmation_number: string | null
          created_at: string
          cruise_line: string
          departure_date: string
          departure_port: string
          holder_id: string | null
          holder_name: string | null
          id: string
          miles_program: string | null
          miles_used: number
          nights: number
          notes: string | null
          passengers: number
          return_date: string
          sale_price: number
          ship_name: string
          status: string
          tax_brl: number
          total_cost_brl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_port: string
          cabin_type: string
          cash_price?: number | null
          client_id?: string | null
          confirmation_number?: string | null
          created_at?: string
          cruise_line: string
          departure_date: string
          departure_port: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          miles_program?: string | null
          miles_used?: number
          nights?: number
          notes?: string | null
          passengers?: number
          return_date: string
          sale_price?: number
          ship_name: string
          status?: string
          tax_brl?: number
          total_cost_brl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_port?: string
          cabin_type?: string
          cash_price?: number | null
          client_id?: string | null
          confirmation_number?: string | null
          created_at?: string
          cruise_line?: string
          departure_date?: string
          departure_port?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          miles_program?: string | null
          miles_used?: number
          nights?: number
          notes?: string | null
          passengers?: number
          return_date?: string
          sale_price?: number
          ship_name?: string
          status?: string
          tax_brl?: number
          total_cost_brl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_cruises_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_cruises_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_hotel_reservations: {
        Row: {
          cash_price: number | null
          check_in: string
          check_out: string
          city: string
          client_id: string | null
          confirmation_number: string | null
          created_at: string
          holder_id: string | null
          holder_name: string | null
          hotel_name: string
          hotel_program: string | null
          id: string
          miles_program: string | null
          miles_used: number
          nights: number
          notes: string | null
          rooms: number
          sale_price: number
          status: string
          tax_brl: number
          total_cost_brl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_price?: number | null
          check_in: string
          check_out: string
          city: string
          client_id?: string | null
          confirmation_number?: string | null
          created_at?: string
          holder_id?: string | null
          holder_name?: string | null
          hotel_name: string
          hotel_program?: string | null
          id?: string
          miles_program?: string | null
          miles_used: number
          nights: number
          notes?: string | null
          rooms?: number
          sale_price?: number
          status?: string
          tax_brl?: number
          total_cost_brl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_price?: number | null
          check_in?: string
          check_out?: string
          city?: string
          client_id?: string | null
          confirmation_number?: string | null
          created_at?: string
          holder_id?: string | null
          holder_name?: string | null
          hotel_name?: string
          hotel_program?: string | null
          id?: string
          miles_program?: string | null
          miles_used?: number
          nights?: number
          notes?: string | null
          rooms?: number
          sale_price?: number
          status?: string
          tax_brl?: number
          total_cost_brl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_hotel_reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_hotel_reservations_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_insurances: {
        Row: {
          cash_price: number | null
          client_id: string | null
          cost_brl: number
          coverage_amount: number | null
          coverage_type: string
          created_at: string
          days: number
          destination: string
          end_date: string
          holder_id: string | null
          holder_name: string | null
          id: string
          insurance_company: string
          mile_value_per_thousand: number | null
          miles_earned: number | null
          miles_program: string | null
          notes: string | null
          plan_name: string
          points_per_real: number | null
          policy_number: string | null
          sale_price: number
          start_date: string
          status: string
          travelers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_price?: number | null
          client_id?: string | null
          cost_brl?: number
          coverage_amount?: number | null
          coverage_type?: string
          created_at?: string
          days?: number
          destination: string
          end_date: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          insurance_company: string
          mile_value_per_thousand?: number | null
          miles_earned?: number | null
          miles_program?: string | null
          notes?: string | null
          plan_name: string
          points_per_real?: number | null
          policy_number?: string | null
          sale_price?: number
          start_date: string
          status?: string
          travelers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_price?: number | null
          client_id?: string | null
          cost_brl?: number
          coverage_amount?: number | null
          coverage_type?: string
          created_at?: string
          days?: number
          destination?: string
          end_date?: string
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          insurance_company?: string
          mile_value_per_thousand?: number | null
          miles_earned?: number | null
          miles_program?: string | null
          notes?: string | null
          plan_name?: string
          points_per_real?: number | null
          policy_number?: string | null
          sale_price?: number
          start_date?: string
          status?: string
          travelers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_insurances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_insurances_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_quotes: {
        Row: {
          airline: string | null
          check_in: string | null
          check_out: string | null
          city: string | null
          client_id: string
          converted_at: string | null
          converted_to_id: string | null
          cost_estimate: number
          created_at: string
          days: number | null
          description: string | null
          destination: string | null
          dropoff_date: string | null
          dropoff_location: string | null
          flight_date: string | null
          hotel_name: string | null
          hotel_program: string | null
          id: string
          miles_estimate: number
          miles_program: string | null
          nights: number | null
          notes: string | null
          one_way: boolean | null
          origin: string | null
          passengers: number | null
          pickup_date: string | null
          pickup_location: string | null
          quote_number: string
          quote_type: string
          rental_company: string | null
          return_date: string | null
          rooms: number | null
          sale_price: number
          status: string
          tax_estimate: number
          updated_at: string
          user_id: string
          valid_until: string | null
          vehicle_category: string | null
        }
        Insert: {
          airline?: string | null
          check_in?: string | null
          check_out?: string | null
          city?: string | null
          client_id: string
          converted_at?: string | null
          converted_to_id?: string | null
          cost_estimate?: number
          created_at?: string
          days?: number | null
          description?: string | null
          destination?: string | null
          dropoff_date?: string | null
          dropoff_location?: string | null
          flight_date?: string | null
          hotel_name?: string | null
          hotel_program?: string | null
          id?: string
          miles_estimate?: number
          miles_program?: string | null
          nights?: number | null
          notes?: string | null
          one_way?: boolean | null
          origin?: string | null
          passengers?: number | null
          pickup_date?: string | null
          pickup_location?: string | null
          quote_number: string
          quote_type: string
          rental_company?: string | null
          return_date?: string | null
          rooms?: number | null
          sale_price?: number
          status?: string
          tax_estimate?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          vehicle_category?: string | null
        }
        Update: {
          airline?: string | null
          check_in?: string | null
          check_out?: string | null
          city?: string | null
          client_id?: string
          converted_at?: string | null
          converted_to_id?: string | null
          cost_estimate?: number
          created_at?: string
          days?: number | null
          description?: string | null
          destination?: string | null
          dropoff_date?: string | null
          dropoff_location?: string | null
          flight_date?: string | null
          hotel_name?: string | null
          hotel_program?: string | null
          id?: string
          miles_estimate?: number
          miles_program?: string | null
          nights?: number | null
          notes?: string | null
          one_way?: boolean | null
          origin?: string | null
          passengers?: number | null
          pickup_date?: string | null
          pickup_location?: string | null
          quote_number?: string
          quote_type?: string
          rental_company?: string | null
          return_date?: string | null
          rooms?: number | null
          sale_price?: number
          status?: string
          tax_estimate?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          vehicle_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_receivables: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_tickets: {
        Row: {
          airline: string
          baggage_cost: number | null
          cash_price: number | null
          client_id: string | null
          created_at: string
          destination: string
          extra_services_cost: number | null
          flight_date: string
          flight_number: string | null
          flight_time: string | null
          holder_id: string | null
          holder_name: string | null
          id: string
          locator: string | null
          miles_program: string | null
          miles_used: number
          notes: string | null
          one_way: boolean | null
          origin: string
          passengers: number
          return_date: string | null
          sale_price: number
          status: string
          tax_brl: number
          third_party_cost: number | null
          third_party_miles: boolean | null
          total_cost_brl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          airline: string
          baggage_cost?: number | null
          cash_price?: number | null
          client_id?: string | null
          created_at?: string
          destination: string
          extra_services_cost?: number | null
          flight_date: string
          flight_number?: string | null
          flight_time?: string | null
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          locator?: string | null
          miles_program?: string | null
          miles_used: number
          notes?: string | null
          one_way?: boolean | null
          origin: string
          passengers?: number
          return_date?: string | null
          sale_price?: number
          status?: string
          tax_brl?: number
          third_party_cost?: number | null
          third_party_miles?: boolean | null
          total_cost_brl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string
          baggage_cost?: number | null
          cash_price?: number | null
          client_id?: string | null
          created_at?: string
          destination?: string
          extra_services_cost?: number | null
          flight_date?: string
          flight_number?: string | null
          flight_time?: string | null
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          locator?: string | null
          miles_program?: string | null
          miles_used?: number
          notes?: string | null
          one_way?: boolean | null
          origin?: string
          passengers?: number
          return_date?: string | null
          sale_price?: number
          status?: string
          tax_brl?: number
          third_party_cost?: number | null
          third_party_miles?: boolean | null
          total_cost_brl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_tickets_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_transfers: {
        Row: {
          cash_price: number | null
          client_id: string | null
          confirmation_number: string | null
          cost_brl: number
          created_at: string
          destination: string
          flight_number: string | null
          holder_id: string | null
          holder_name: string | null
          id: string
          locator: string | null
          miles_program: string | null
          miles_used: number | null
          notes: string | null
          origin: string
          passengers: number
          provider: string | null
          sale_price: number
          status: string
          tax_brl: number | null
          third_party_cost: number | null
          third_party_miles: boolean | null
          total_cost_brl: number | null
          transfer_date: string
          transfer_time: string | null
          transfer_type: string
          updated_at: string
          user_id: string
          vehicle_type: string
        }
        Insert: {
          cash_price?: number | null
          client_id?: string | null
          confirmation_number?: string | null
          cost_brl?: number
          created_at?: string
          destination: string
          flight_number?: string | null
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          locator?: string | null
          miles_program?: string | null
          miles_used?: number | null
          notes?: string | null
          origin: string
          passengers?: number
          provider?: string | null
          sale_price?: number
          status?: string
          tax_brl?: number | null
          third_party_cost?: number | null
          third_party_miles?: boolean | null
          total_cost_brl?: number | null
          transfer_date: string
          transfer_time?: string | null
          transfer_type?: string
          updated_at?: string
          user_id: string
          vehicle_type?: string
        }
        Update: {
          cash_price?: number | null
          client_id?: string | null
          confirmation_number?: string | null
          cost_brl?: number
          created_at?: string
          destination?: string
          flight_number?: string | null
          holder_id?: string | null
          holder_name?: string | null
          id?: string
          locator?: string | null
          miles_program?: string | null
          miles_used?: number | null
          notes?: string | null
          origin?: string
          passengers?: number
          provider?: string | null
          sale_price?: number
          status?: string
          tax_brl?: number | null
          third_party_cost?: number | null
          third_party_miles?: boolean | null
          total_cost_brl?: number | null
          transfer_date?: string
          transfer_time?: string | null
          transfer_type?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_transfers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "travel_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_transfers_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alert_settings: {
        Row: {
          alerts_enabled: boolean | null
          created_at: string | null
          enabled_sources: string[] | null
          enabled_types: string[] | null
          fetch_interval: number | null
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_enabled: boolean | null
          source_urls: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean | null
          created_at?: string | null
          enabled_sources?: string[] | null
          enabled_types?: string[] | null
          fetch_interval?: number | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          source_urls?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean | null
          created_at?: string | null
          enabled_sources?: string[] | null
          enabled_types?: string[] | null
          fetch_interval?: number | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          source_urls?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          analytics_opted_in: boolean
          consent_version: string
          created_at: string
          id: string
          ip_address: unknown
          marketing_opted_in: boolean
          privacy_accepted_at: string | null
          terms_accepted_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          analytics_opted_in?: boolean
          consent_version: string
          created_at?: string
          id?: string
          ip_address?: unknown
          marketing_opted_in?: boolean
          privacy_accepted_at?: string | null
          terms_accepted_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          analytics_opted_in?: boolean
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          marketing_opted_in?: boolean
          privacy_accepted_at?: string | null
          terms_accepted_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_cpf_limits: {
        Row: {
          created_at: string | null
          custom_limit: number | null
          holder_id: string
          id: string
          period_start: string | null
          program_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_limit?: number | null
          holder_id: string
          id?: string
          period_start?: string | null
          program_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_limit?: number | null
          holder_id?: string
          id?: string
          period_start?: string | null
          program_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cpf_limits_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_programs: {
        Row: {
          category: string | null
          created_at: string | null
          custom_icon_url: string | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          program_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          custom_icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          program_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          custom_icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          program_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_promo_alerts: {
        Row: {
          balance_in_from: number | null
          bonus_pct: number
          created_at: string
          dismissed_at: string | null
          ends_at: string | null
          from_program: string
          id: string
          promo_id: string
          starts_at: string | null
          to_program: string
          user_id: string
        }
        Insert: {
          balance_in_from?: number | null
          bonus_pct: number
          created_at?: string
          dismissed_at?: string | null
          ends_at?: string | null
          from_program: string
          id?: string
          promo_id: string
          starts_at?: string | null
          to_program: string
          user_id: string
        }
        Update: {
          balance_in_from?: number | null
          bonus_pct?: number
          created_at?: string
          dismissed_at?: string | null
          ends_at?: string | null
          from_program?: string
          id?: string
          promo_id?: string
          starts_at?: string | null
          to_program?: string
          user_id?: string
        }
        Relationships: []
      }
      user_promotion_reads: {
        Row: {
          id: string
          promotion_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promotion_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promotion_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_promotion_reads_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_settings: {
        Row: {
          alert_antecipation_days: number
          created_at: string
          push_pre_prompt_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_antecipation_days?: number
          created_at?: string
          push_pre_prompt_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_antecipation_days?: number
          created_at?: string
          push_pre_prompt_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_period: string | null
          created_at: string
          expires_at: string | null
          features: Json | null
          grace_period_ends_at: string | null
          history_days: number | null
          id: string
          is_active: boolean
          last_paid_at: string | null
          max_operations_per_month: number | null
          max_programs: number | null
          max_users: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          price: number | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_period?: string | null
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          grace_period_ends_at?: string | null
          history_days?: number | null
          id?: string
          is_active?: boolean
          last_paid_at?: string | null
          max_operations_per_month?: number | null
          max_programs?: number | null
          max_users?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_period?: string | null
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          grace_period_ends_at?: string | null
          history_days?: number | null
          id?: string
          is_active?: boolean
          last_paid_at?: string | null
          max_operations_per_month?: number | null
          max_programs?: number | null
          max_users?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_entries: {
        Row: {
          access_date: string
          card_id: string
          created_at: string
          id: string
          location: string
          notes: string | null
          override: boolean | null
          person_name: string
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_date?: string
          card_id: string
          created_at?: string
          id?: string
          location: string
          notes?: string | null
          override?: boolean | null
          person_name: string
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_date?: string
          card_id?: string
          created_at?: string
          id?: string
          location?: string
          notes?: string | null
          override?: boolean | null
          person_name?: string
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_entries_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          retries: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          retries?: number
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          retries?: number
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_market_prices: {
        Row: {
          buy_price: number | null
          fetched_at: string | null
          id: string | null
          program: string | null
          sell_price: number | null
          source: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_account: {
        Args: { _target_id: string; _viewer_id: string }
        Returns: boolean
      }
      can_create_client: { Args: { _user_id: string }; Returns: boolean }
      can_create_operation: { Args: { _user_id: string }; Returns: boolean }
      count_monthly_operations: { Args: { _user_id: string }; Returns: number }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      has_entitlement: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      has_plan: {
        Args: {
          _required_plan: Database["public"]["Enums"]["subscription_plan"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _description?: string
          _event_category?: string
          _event_type: string
          _ip_address?: string
          _metadata?: Json
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      within_entitlement_limit: {
        Args: { _current_count: number; _feature: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_type: "warning" | "promo" | "success" | "info"
      app_role: "admin" | "investor" | "standard"
      operation_status: "confirmado" | "pendente" | "recebido" | "cancelado"
      operation_type:
        | "compra"
        | "venda"
        | "transferencia"
        | "bumerangue"
        | "entrada_manual"
        | "compra_turbinada"
        | "resgate"
      subscription_plan: "free" | "pro" | "vip"
      subscription_status:
        | "pending_first_charge"
        | "trial"
        | "active"
        | "past_due"
        | "canceled"
        | "disputed"
      task_priority: "high" | "medium" | "low"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alert_type: ["warning", "promo", "success", "info"],
      app_role: ["admin", "investor", "standard"],
      operation_status: ["confirmado", "pendente", "recebido", "cancelado"],
      operation_type: [
        "compra",
        "venda",
        "transferencia",
        "bumerangue",
        "entrada_manual",
        "compra_turbinada",
        "resgate",
      ],
      subscription_plan: ["free", "pro", "vip"],
      subscription_status: [
        "pending_first_charge",
        "trial",
        "active",
        "past_due",
        "canceled",
        "disputed",
      ],
      task_priority: ["high", "medium", "low"],
    },
  },
} as const
