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
      addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          landmark: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          region: string
          street: string | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          region: string
          street?: string | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          region?: string
          street?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_locations: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          latitude: number
          longitude: number
          region: string
          town: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          latitude: number
          longitude: number
          region: string
          town: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          latitude?: number
          longitude?: number
          region?: string
          town?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          section: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          section: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          section?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          created_at: string
          full_name: string
          id: string
          latitude: number
          longitude: number
          message: string | null
          phone: string
          region: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          town: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          latitude: number
          longitude: number
          message?: string | null
          phone: string
          region: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          town: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          latitude?: number
          longitude?: number
          message?: string | null
          phone?: string
          region?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          town?: string
          user_id?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          active: boolean
          created_at: string
          cta_text: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          region: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          region?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          region?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          brand_name: string
          id: number
          logo_url: string | null
          primary_color: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string
          id?: number
          logo_url?: string | null
          primary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string
          id?: number
          logo_url?: string | null
          primary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          pinned: boolean
          pinned_at: string | null
          pinned_by: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          pinned?: boolean
          pinned_at?: string | null
          pinned_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      delivery_reports: {
        Row: {
          created_at: string
          id: string
          kind: string
          note: string
          order_id: string
          rider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          note: string
          order_id: string
          rider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          note?: string
          order_id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          est_days: string | null
          fee_xaf: number
          id: string
          region: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          est_days?: string | null
          fee_xaf: number
          id?: string
          region: string
        }
        Update: {
          active?: boolean
          created_at?: string
          est_days?: string | null
          fee_xaf?: number
          id?: string
          region?: string
        }
        Relationships: []
      }
      home_content: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total_xaf: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price_xaf: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_xaf: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price_xaf: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total_xaf?: number
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price_xaf?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          assigned_admin_id: string | null
          cancelled_at: string | null
          cancelled_by_rider_count: number
          city: string
          created_at: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_fee_xaf: number
          delivery_status: string
          id: string
          landmark: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          order_number: string
          origin_accuracy_m: number | null
          origin_latitude: number | null
          origin_longitude: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          region: string
          rider_id: string | null
          route_history: Json
          status: Database["public"]["Enums"]["order_status"]
          street: string | null
          subtotal_xaf: number
          total_xaf: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          assigned_admin_id?: string | null
          cancelled_at?: string | null
          cancelled_by_rider_count?: number
          city: string
          created_at?: string
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_fee_xaf: number
          delivery_status?: string
          id?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_number?: string
          origin_accuracy_m?: number | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          region: string
          rider_id?: string | null
          route_history?: Json
          status?: Database["public"]["Enums"]["order_status"]
          street?: string | null
          subtotal_xaf: number
          total_xaf: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          assigned_admin_id?: string | null
          cancelled_at?: string | null
          cancelled_by_rider_count?: number
          city?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_fee_xaf?: number
          delivery_status?: string
          id?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_number?: string
          origin_accuracy_m?: number | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          region?: string
          rider_id?: string | null
          route_history?: Json
          status?: Database["public"]["Enums"]["order_status"]
          street?: string | null
          subtotal_xaf?: number
          total_xaf?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          account_name: string
          active: boolean
          created_at: string
          display_name: string
          id: string
          instructions: string | null
          provider: string
          transfer_number: string
          updated_at: string
          ussd_template: string | null
        }
        Insert: {
          account_name: string
          active?: boolean
          created_at?: string
          display_name: string
          id?: string
          instructions?: string | null
          provider: string
          transfer_number: string
          updated_at?: string
          ussd_template?: string | null
        }
        Update: {
          account_name?: string
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          instructions?: string | null
          provider?: string
          transfer_number?: string
          updated_at?: string
          ussd_template?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_xaf: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payer_phone: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_xaf: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payer_phone?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_xaf?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          payer_phone?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          name: string
          price_xaf: number
          sector_id: string
          slug: string
          stock: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          price_xaf: number
          sector_id: string
          slug: string
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          price_xaf?: number
          sector_id?: string
          slug?: string
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          avatar_seed: string | null
          body: string
          created_at: string
          featured: boolean
          id: string
          rating: number
          region: string | null
          sector_slug: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          avatar_seed?: string | null
          body: string
          created_at?: string
          featured?: boolean
          id?: string
          rating: number
          region?: string | null
          sector_slug?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          avatar_seed?: string | null
          body?: string
          created_at?: string
          featured?: boolean
          id?: string
          rating?: number
          region?: string | null
          sector_slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rider_cancellations: {
        Row: {
          created_at: string
          id: string
          order_id: string
          reason: string | null
          rider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
          rider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_locations: {
        Row: {
          lat: number
          lng: number
          order_id: string
          rider_id: string
          updated_at: string
        }
        Insert: {
          lat: number
          lng: number
          order_id: string
          rider_id: string
          updated_at?: string
        }
        Update: {
          lat?: number
          lng?: number
          order_id?: string
          rider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_requests: {
        Row: {
          created_at: string
          email: string | null
          face_video_path: string
          full_name: string
          id: string
          id_back_path: string
          id_front_path: string
          id_type: string
          phone: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          face_video_path: string
          full_name: string
          id?: string
          id_back_path: string
          id_front_path: string
          id_type?: string
          phone: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          face_video_path?: string
          full_name?: string
          id?: string
          id_back_path?: string
          id_front_path?: string
          id_type?: string
          phone?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          banned: boolean
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          is_online: boolean
          phone: string
          region: string | null
          town: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banned?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          is_online?: boolean
          phone: string
          region?: string | null
          town?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banned?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          is_online?: boolean
          phone?: string
          region?: string | null
          town?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          accent_color: string | null
          active: boolean
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          tagline: string | null
        }
        Insert: {
          accent_color?: string | null
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
        }
        Update: {
          accent_color?: string | null
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
        }
        Relationships: []
      }
      support_settings: {
        Row: {
          apk_label: string
          apk_url: string
          button_label: string
          id: boolean
          intro_text: string
          subject_prefix: string
          support_email: string
          updated_at: string
        }
        Insert: {
          apk_label?: string
          apk_url?: string
          button_label?: string
          id?: boolean
          intro_text?: string
          subject_prefix?: string
          support_email?: string
          updated_at?: string
        }
        Update: {
          apk_label?: string
          apk_url?: string
          button_label?: string
          id?: boolean
          intro_text?: string
          subject_prefix?: string
          support_email?: string
          updated_at?: string
        }
        Relationships: []
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
      add_admin_by_email: {
        Args: {
          _email: string
          _full_name: string
          _lat: number
          _lng: number
          _make_super?: boolean
          _region: string
          _town: string
        }
        Returns: string
      }
      admin_remove_rider: { Args: { _rider_id: string }; Returns: boolean }
      admin_restore_rider: { Args: { _rider_id: string }; Returns: boolean }
      append_route_point: {
        Args: { _lat: number; _lng: number; _order_id: string }
        Returns: undefined
      }
      approve_admin_request: {
        Args: { _approve: boolean; _req_id: string }
        Returns: boolean
      }
      cancel_rider_order: {
        Args: { _order_id: string; _reason?: string }
        Returns: boolean
      }
      claim_admin: { Args: never; Returns: boolean }
      gen_kf_order_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      is_user_super_admin: { Args: { _uid: string }; Returns: boolean }
      list_admin_permissions: {
        Args: never
        Returns: {
          allowed: boolean
          section: string
          user_id: string
        }[]
      }
      my_admin_sections: {
        Args: never
        Returns: {
          allowed: boolean
          section: string
        }[]
      }
      nearest_admin: {
        Args: {
          _lat: number
          _lng: number
          _radius_km?: number
          _region: string
          _town: string
        }
        Returns: {
          admin_user_id: string
          distance_km: number
          full_name: string
          latitude: number
          longitude: number
          region: string
          town: string
        }[]
      }
      normalize_town: { Args: { _t: string }; Returns: string }
      remove_admin: { Args: { _target: string }; Returns: boolean }
      rider_leaderboard: {
        Args: never
        Returns: {
          active_count: number
          avg_delivery_minutes: number
          banned: boolean
          cancel_rate_pct: number
          cancelled_count: number
          delivered_count: number
          delivery_rate_pct: number
          full_name: string
          overall_rating_pct: number
          phone: string
          region: string
          rider_id: string
          speed_score_pct: number
          total_orders: number
          town: string
        }[]
      }
      set_admin_permission: {
        Args: { _allowed: boolean; _section: string; _target: string }
        Returns: boolean
      }
      set_super_admin: {
        Args: { _make_super: boolean; _target: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      taken_admin_towns: {
        Args: { _region: string }
        Returns: {
          normalized: string
          town: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "customer"
      order_status:
        | "pending_payment"
        | "placed"
        | "confirmed"
        | "preparing"
        | "dispatched"
        | "delivered"
        | "cancelled"
      payment_method: "cash_on_delivery" | "mtn_momo" | "orange_money"
      payment_status:
        | "pending"
        | "submitted"
        | "confirmed"
        | "failed"
        | "refunded"
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
      app_role: ["admin", "rider", "customer"],
      order_status: [
        "pending_payment",
        "placed",
        "confirmed",
        "preparing",
        "dispatched",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cash_on_delivery", "mtn_momo", "orange_money"],
      payment_status: [
        "pending",
        "submitted",
        "confirmed",
        "failed",
        "refunded",
      ],
    },
  },
} as const
