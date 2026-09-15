export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      citas: {
        Row: {
          created_at: string
          customer_id: string
          customer_name: string | null
          estado: string
          fecha: string
          hora: string
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_name?: string | null
          estado?: string
          fecha: string
          hora: string
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          estado?: string
          fecha?: string
          hora?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          fecha_nacimiento: string | null
          id: string
          nombre: string | null
          notas: string | null
          phone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string | null
          notas?: string | null
          phone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string | null
          notas?: string | null
          phone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          customer_name: string | null
          estado: string
          id: string
          phone_from: string
          prioridad: string
          temperatura: string
          temperatura_editada_manualmente: boolean
          temperatura_historial: Json
          tenant_id: string
          updated_at: string
          vendedor_asignado: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          estado?: string
          id?: string
          phone_from: string
          prioridad?: string
          temperatura?: string
          temperatura_editada_manualmente?: boolean
          temperatura_historial?: Json
          tenant_id: string
          updated_at?: string
          vendedor_asignado?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          estado?: string
          id?: string
          phone_from?: string
          prioridad?: string
          temperatura?: string
          temperatura_editada_manualmente?: boolean
          temperatura_historial?: Json
          tenant_id?: string
          updated_at?: string
          vendedor_asignado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tenant_id: string
          tool_called: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tenant_id: string
          tool_called?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          tool_called?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      negocio: {
        Row: {
          access_token: string | null
          catalogo: Json
          color_palette: string
          created_at: string
          dashboard_view: string
          horarios: Json
          id: string
          logo_url: string | null
          meta_connection_status: string
          nombre: string
          phone_number_id: string
          plan_ciclo_facturacion: string
          plan_estado_pago: string
          plan_fecha_alta: string | null
          plan_fecha_vencimiento: string | null
          rubro: string | null
          system_prompt: string | null
          system_prompt_history: Json
          system_prompt_version: number
          tenant_id: string
          tier: string
          tipo_crm: string
          tono_voz: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          catalogo?: Json
          color_palette?: string
          created_at?: string
          dashboard_view?: string
          horarios?: Json
          id?: string
          logo_url?: string | null
          meta_connection_status?: string
          nombre: string
          phone_number_id: string
          plan_ciclo_facturacion?: string
          plan_estado_pago?: string
          plan_fecha_alta?: string | null
          plan_fecha_vencimiento?: string | null
          rubro?: string | null
          system_prompt?: string | null
          system_prompt_history?: Json
          system_prompt_version?: number
          tenant_id?: string
          tier?: string
          tipo_crm?: string
          tono_voz?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          catalogo?: Json
          color_palette?: string
          created_at?: string
          dashboard_view?: string
          horarios?: Json
          id?: string
          logo_url?: string | null
          meta_connection_status?: string
          nombre?: string
          phone_number_id?: string
          plan_ciclo_facturacion?: string
          plan_estado_pago?: string
          plan_fecha_alta?: string | null
          plan_fecha_vencimiento?: string | null
          rubro?: string | null
          system_prompt?: string | null
          system_prompt_history?: Json
          system_prompt_version?: number
          tenant_id?: string
          tier?: string
          tipo_crm?: string
          tono_voz?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      negocio_feature_overrides: {
        Row: {
          created_at: string
          feature_key: string
          habilitado: boolean
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          habilitado: boolean
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          habilitado?: boolean
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_feature_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          tenant_id: string
          updated_at: string
          variantes: Json
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          tenant_id: string
          updated_at?: string
          variantes?: Json
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
          updated_at?: string
          variantes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "productos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
