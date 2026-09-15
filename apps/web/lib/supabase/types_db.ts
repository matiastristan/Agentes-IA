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
          recurso_id: string | null
          sena_metodo: string | null
          sena_pagada: boolean
          sena_requerida: boolean
          servicio_id: string | null
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
          recurso_id?: string | null
          sena_metodo?: string | null
          sena_pagada?: boolean
          sena_requerida?: boolean
          servicio_id?: string | null
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
          recurso_id?: string | null
          sena_metodo?: string | null
          sena_pagada?: boolean
          sena_requerida?: boolean
          servicio_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citas_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
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
      combos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          precio: number
          productos_incluidos: Json
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          precio: number
          productos_incluidos: Json
          tenant_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          precio?: number
          productos_incluidos?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combos_tenant_id_fkey"
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
      lista_espera: {
        Row: {
          created_at: string
          estado: string
          franja_horaria_deseada: Json
          id: string
          phone: string
          recurso_id: string | null
          servicio_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          franja_horaria_deseada: Json
          id?: string
          phone: string
          recurso_id?: string | null
          servicio_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          franja_horaria_deseada?: Json
          id?: string
          phone?: string
          recurso_id?: string | null
          servicio_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lista_espera_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_espera_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_espera_tenant_id_fkey"
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
          plantillas_meta_habilitadas: boolean
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
          plantillas_meta_habilitadas?: boolean
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
          plantillas_meta_habilitadas?: boolean
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
          atributos: Json
          created_at: string
          id: string
          nombre: string
          precio: number | null
          stock: number
          tenant_id: string
          umbral_alerta_stock: number | null
          updated_at: string
          variantes: Json
        }
        Insert: {
          activo?: boolean
          atributos?: Json
          created_at?: string
          id?: string
          nombre: string
          precio?: number | null
          stock?: number
          tenant_id: string
          umbral_alerta_stock?: number | null
          updated_at?: string
          variantes?: Json
        }
        Update: {
          activo?: boolean
          atributos?: Json
          created_at?: string
          id?: string
          nombre?: string
          precio?: number | null
          stock?: number
          tenant_id?: string
          umbral_alerta_stock?: number | null
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
      recordatorios_config: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          mensaje_template: string | null
          minutos_antes: number
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          mensaje_template?: string | null
          minutos_antes: number
          tenant_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          mensaje_template?: string | null
          minutos_antes?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordatorios_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      recursos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          subtipo: string | null
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          subtipo?: string | null
          tenant_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          subtipo?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recursos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      reglas_reprogramacion: {
        Row: {
          created_at: string
          horas_minimas_anticipacion: number
          id: string
          permite_sin_perder_sena: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          horas_minimas_anticipacion?: number
          id?: string
          permite_sin_perder_sena?: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          horas_minimas_anticipacion?: number
          id?: string
          permite_sin_perder_sena?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reglas_reprogramacion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      servicios: {
        Row: {
          activo: boolean
          created_at: string
          duracion_minutos: number
          horario_override: Json | null
          id: string
          nombre: string
          precio: number
          promociones: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          duracion_minutos: number
          horario_override?: Json | null
          id?: string
          nombre: string
          precio: number
          promociones?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          duracion_minutos?: number
          horario_override?: Json | null
          id?: string
          nombre?: string
          precio?: number
          promociones?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      venta_items: {
        Row: {
          cantidad: number
          combo_id: string | null
          es_combo: boolean
          id: string
          precio_unitario: number
          producto_id: string | null
          venta_id: string
        }
        Insert: {
          cantidad: number
          combo_id?: string | null
          es_combo?: boolean
          id?: string
          precio_unitario: number
          producto_id?: string | null
          venta_id: string
        }
        Update: {
          cantidad?: number
          combo_id?: string | null
          es_combo?: boolean
          id?: string
          precio_unitario?: number
          producto_id?: string | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          estado: string
          id: string
          tenant_id: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          estado?: string
          id?: string
          tenant_id: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          estado?: string
          id?: string
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_tenant_id_fkey"
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
