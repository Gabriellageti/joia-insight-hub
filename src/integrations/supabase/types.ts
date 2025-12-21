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
      clients: {
        Row: {
          cnpj: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          money_hypothesis: number | null
          name: string
          segment: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          money_hypothesis?: number | null
          name: string
          segment?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          money_hypothesis?: number | null
          name?: string
          segment?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diagnostics: {
        Row: {
          area: string | null
          client_id: string | null
          created_at: string
          evidence_url: string | null
          findings: string | null
          id: string
          name: string
          opportunities: string | null
          project_id: string | null
          recommendations: string | null
          score: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          client_id?: string | null
          created_at?: string
          evidence_url?: string | null
          findings?: string | null
          id?: string
          name: string
          opportunities?: string | null
          project_id?: string | null
          recommendations?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          client_id?: string | null
          created_at?: string
          evidence_url?: string | null
          findings?: string | null
          id?: string
          name?: string
          opportunities?: string | null
          project_id?: string | null
          recommendations?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          is_internal: boolean | null
          name: string
          project_id: string | null
          type: string | null
          updated_at: string
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_internal?: boolean | null
          name: string
          project_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_internal?: boolean | null
          name?: string
          project_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      template_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          position: number | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          is_internal: boolean | null
          project_id: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          is_internal?: boolean | null
          project_id?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          is_internal?: boolean | null
          project_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string
          current_value: number | null
          frequency: string | null
          id: string
          name: string
          project_id: string | null
          status: string | null
          target_value: number | null
          trend: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          current_value?: number | null
          frequency?: string | null
          id?: string
          name: string
          project_id?: string | null
          status?: string | null
          target_value?: number | null
          trend?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          current_value?: number | null
          frequency?: string | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string | null
          target_value?: number | null
          trend?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda: string | null
          client_id: string | null
          created_at: string
          date: string | null
          decisions: string | null
          duration: string | null
          id: string
          minutes: string | null
          participants: string[] | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          client_id?: string | null
          created_at?: string
          date?: string | null
          decisions?: string | null
          duration?: string | null
          id?: string
          minutes?: string | null
          participants?: string[] | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          client_id?: string | null
          created_at?: string
          date?: string | null
          decisions?: string | null
          duration?: string | null
          id?: string
          minutes?: string | null
          participants?: string[] | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          end_date: string | null
          id: string
          money_hypothesis: number | null
          name: string
          objective: string | null
          phase: string | null
          progress: number | null
          responsible: string | null
          scope: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          money_hypothesis?: number | null
          name: string
          objective?: string | null
          phase?: string | null
          progress?: number | null
          responsible?: string | null
          scope?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          money_hypothesis?: number | null
          name?: string
          objective?: string | null
          phase?: string | null
          progress?: number | null
          responsible?: string | null
          scope?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          evidence_required: boolean | null
          evidence_url: string | null
          how: string | null
          how_much: number | null
          id: string
          priority: string | null
          project_id: string | null
          responsible: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string
          what: string | null
          when_date: string | null
          where_location: string | null
          who: string | null
          why: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_required?: boolean | null
          evidence_url?: string | null
          how?: string | null
          how_much?: number | null
          id?: string
          priority?: string | null
          project_id?: string | null
          responsible?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string
          what?: string | null
          when_date?: string | null
          where_location?: string | null
          who?: string | null
          why?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_required?: boolean | null
          evidence_url?: string | null
          how?: string | null
          how_much?: number | null
          id?: string
          priority?: string | null
          project_id?: string | null
          responsible?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          what?: string | null
          when_date?: string | null
          where_location?: string | null
          who?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_opportunity_rules: {
        Row: {
          actions: Json | null
          created_at: string
          description: string | null
          id: string
          question_id: string | null
          rule_conditions: Json
          section_id: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          question_id?: string | null
          rule_conditions: Json
          section_id?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          question_id?: string | null
          rule_conditions?: Json
          section_id?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_opportunity_rules_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_opportunity_rules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_opportunity_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_questions: {
        Row: {
          conditions: Json | null
          created_at: string
          id: string
          metadata: Json | null
          options: Json | null
          position: number | null
          question: string
          question_type: string
          section_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          options?: Json | null
          position?: number | null
          question: string
          question_type: string
          section_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          options?: Json | null
          position?: number | null
          question?: string
          question_type?: string
          section_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin_joia"
        | "gestor_projetos"
        | "analista"
        | "financeiro_joia"
        | "marketing_joia"
        | "colaborador_onboarding"
        | "cliente_proprietario"
        | "cliente_gestor"
        | "cliente_operacional"
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
        "admin_joia",
        "gestor_projetos",
        "analista",
        "financeiro_joia",
        "marketing_joia",
        "colaborador_onboarding",
        "cliente_proprietario",
        "cliente_gestor",
        "cliente_operacional",
      ],
    },
  },
} as const
