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
      activity_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          meeting_id: string | null
          metadata: Json
          project_id: string | null
          task_id: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          meeting_id?: string | null
          metadata?: Json
          project_id?: string | null
          task_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          meeting_id?: string | null
          metadata?: Json
          project_id?: string | null
          task_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "activity_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          answer: string | null
          citations: Json
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number | null
          mode: string
          model: string | null
          output_tokens: number | null
          question: string
          scope: Json
          status: string
          suggested_tasks: Json
          user_id: string
          workspace_id: string
        }
        Insert: {
          answer?: string | null
          citations?: Json
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          mode?: string
          model?: string | null
          output_tokens?: number | null
          question: string
          scope?: Json
          status?: string
          suggested_tasks?: Json
          user_id: string
          workspace_id: string
        }
        Update: {
          answer?: string | null
          citations?: Json
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          mode?: string
          model?: string | null
          output_tokens?: number | null
          question?: string
          scope?: Json
          status?: string
          suggested_tasks?: Json
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          workspace_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_journey_events: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          diagnostic_id: string | null
          document_id: string | null
          event_description: string | null
          event_title: string
          event_type: string
          id: string
          meeting_id: string | null
          metadata: Json | null
          phase: string
          project_id: string | null
          task_id: string | null
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          diagnostic_id?: string | null
          document_id?: string | null
          event_description?: string | null
          event_title: string
          event_type: string
          id?: string
          meeting_id?: string | null
          metadata?: Json | null
          phase?: string
          project_id?: string | null
          task_id?: string | null
          workspace_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          diagnostic_id?: string | null
          document_id?: string | null
          event_description?: string | null
          event_title?: string
          event_type?: string
          id?: string
          meeting_id?: string | null
          metadata?: Json | null
          phase?: string
          project_id?: string | null
          task_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_journey_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_journey_events_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_journey_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          money_hypothesis: number | null
          name: string
          segment: string | null
          state_registration: string | null
          status: string | null
          trade_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          money_hypothesis?: number | null
          name: string
          segment?: string | null
          state_registration?: string | null
          status?: string | null
          trade_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          money_hypothesis?: number | null
          name?: string
          segment?: string | null
          state_registration?: string | null
          status?: string | null
          trade_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_day_plans: {
        Row: {
          created_at: string
          day_number: number
          expected_decisions: string[]
          id: string
          meeting_date: string | null
          objective: string
          project_id: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          expected_decisions?: string[]
          id?: string
          meeting_date?: string | null
          objective: string
          project_id: string
          theme: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          expected_decisions?: string[]
          id?: string
          meeting_date?: string | null
          objective?: string
          project_id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulting_day_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "consulting_day_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_reports: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          period_end: string
          period_start: string
          project_ids: string[]
          sections: Json
          source_snapshot: Json
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version_group_id: string
          version_number: number
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          period_end: string
          period_start: string
          project_ids?: string[]
          sections?: Json
          source_snapshot?: Json
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version_group_id: string
          version_number?: number
          workspace_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          project_ids?: string[]
          sections?: Json
          source_snapshot?: Json
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version_group_id?: string
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulting_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consulting_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "consulting_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          author: string | null
          content: string | null
          created_at: string
          id: string
          platform: string | null
          scheduled_date: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string
          id?: string
          platform?: string | null
          scheduled_date?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string
          id?: string
          platform?: string | null
          scheduled_date?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          billing_type: string | null
          client_id: string | null
          created_at: string
          end_date: string | null
          id: string
          installments: Json | null
          project_id: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          billing_type?: string | null
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          installments?: Json | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Update: {
          billing_type?: string | null
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          installments?: Json | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          end_notes: string | null
          ended_at: string | null
          id: string
          start_notes: string | null
          started_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          end_notes?: string | null
          ended_at?: string | null
          id?: string
          start_notes?: string | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          end_notes?: string | null
          ended_at?: string | null
          id?: string
          start_notes?: string | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_focus_tasks: {
        Row: {
          created_at: string
          focus_date: string
          id: string
          position: number
          task_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          focus_date?: string
          id?: string
          position?: number
          task_id: string
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          focus_date?: string
          id?: string
          position?: number
          task_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_focus_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_focus_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          item_type: string
          project_id: string
          responsible: string | null
          responsible_user_id: string | null
          status: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          item_type?: string
          project_id: string
          responsible?: string | null
          responsible_user_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          item_type?: string
          project_id?: string
          responsible?: string | null
          responsible_user_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_templates: {
        Row: {
          created_at: string
          description: Json | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: Json | null
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          description?: Json | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          action_plan: Json | null
          answers: Json | null
          answered_questions: number | null
          area: string | null
          auto_generate_opportunities: boolean | null
          client_id: string | null
          client_name: string | null
          created_at: string
          due_date: string | null
          evidence_url: string | null
          findings: string | null
          id: string
          name: string
          opportunities: string | null
          opportunities_count: number | null
          progress: number | null
          project_id: string | null
          project_name: string | null
          recommendations: string | null
          report_payload: Json | null
          responsible_id: string | null
          responsible_name: string | null
          score: number | null
          status: string | null
          template_id: string | null
          template_name: string | null
          template_snapshot: Json | null
          total_questions: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_plan?: Json | null
          answers?: Json | null
          answered_questions?: number | null
          area?: string | null
          auto_generate_opportunities?: boolean | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          findings?: string | null
          id?: string
          name: string
          opportunities?: string | null
          opportunities_count?: number | null
          progress?: number | null
          project_id?: string | null
          project_name?: string | null
          recommendations?: string | null
          report_payload?: Json | null
          responsible_id?: string | null
          responsible_name?: string | null
          score?: number | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          template_snapshot?: Json | null
          total_questions?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          action_plan?: Json | null
          answers?: Json | null
          answered_questions?: number | null
          area?: string | null
          auto_generate_opportunities?: boolean | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          findings?: string | null
          id?: string
          name?: string
          opportunities?: string | null
          opportunities_count?: number | null
          progress?: number | null
          project_id?: string | null
          project_name?: string | null
          recommendations?: string | null
          report_payload?: Json | null
          responsible_id?: string | null
          responsible_name?: string | null
          score?: number | null
          status?: string | null
          template_id?: string | null
          template_name?: string | null
          template_snapshot?: Json | null
          total_questions?: number | null
          updated_at?: string
          workspace_id?: string
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
            foreignKeyName: "diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "diagnostics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "diagnostics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_events: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json
          created_at: string
          document_id: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          document_id?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          document_id?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          diagnostic_id: string | null
          display_name: string
          evidence_status: string | null
          external_id: string | null
          external_url: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_current_version: boolean
          is_internal: boolean | null
          meeting_id: string | null
          mime_type: string | null
          name: string
          previous_version_id: string | null
          project_id: string | null
          rejection_reason: string | null
          search_vector: unknown
          source_provider: string
          storage_path: string | null
          tags: string[] | null
          task_id: string | null
          type: string | null
          updated_at: string
          uploaded_by: string | null
          url: string | null
          version_group_id: string
          version_number: number
          visibility: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          display_name: string
          evidence_status?: string | null
          external_id?: string | null
          external_url?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean
          is_internal?: boolean | null
          meeting_id?: string | null
          mime_type?: string | null
          name: string
          previous_version_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          search_vector?: unknown
          source_provider?: string
          storage_path?: string | null
          tags?: string[] | null
          task_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
          version_group_id: string
          version_number?: number
          visibility?: string | null
          workspace_id?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          display_name?: string
          evidence_status?: string | null
          external_id?: string | null
          external_url?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean
          is_internal?: boolean | null
          meeting_id?: string | null
          mime_type?: string | null
          name?: string
          previous_version_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          search_vector?: unknown
          source_provider?: string
          storage_path?: string | null
          tags?: string[] | null
          task_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
          version_group_id?: string
          version_number?: number
          visibility?: string | null
          workspace_id?: string
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
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string
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
          workspace_id?: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_favorites: {
        Row: {
          client_id: string | null
          created_at: string
          entity_type: string
          id: string
          project_id: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          entity_type: string
          id?: string
          project_id?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          entity_type?: string
          id?: string
          project_id?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "entity_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "entity_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_favorites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          contract_id: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          installment_id: string | null
          is_internal: boolean | null
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          project_id: string | null
          recurrence_rule_id: string | null
          status: string | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          installment_id?: string | null
          is_internal?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          project_id?: string | null
          recurrence_rule_id?: string | null
          status?: string | null
          type: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          installment_id?: string | null
          is_internal?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          project_id?: string | null
          recurrence_rule_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          workspace_id?: string
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
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "financial_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "financial_recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_recurring_rules: {
        Row: {
          active: boolean
          amount: number
          category: string
          created_at: string
          created_by: string | null
          day_of_month: number
          description: string
          end_date: string | null
          frequency: string
          id: string
          project_id: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          day_of_month: number
          description: string
          end_date?: string | null
          frequency: string
          id?: string
          project_id?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          project_id?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_recurring_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_recurring_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_history: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          notes: string | null
          recorded_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          notes?: string | null
          recorded_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          notes?: string | null
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_history_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          alert_enabled: boolean | null
          alert_threshold: number | null
          alert_type: string | null
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
          workspace_id: string
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          alert_type?: string | null
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
          workspace_id?: string
        }
        Update: {
          alert_enabled?: boolean | null
          alert_threshold?: number | null
          alert_type?: string | null
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
          workspace_id?: string
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
            foreignKeyName: "indicators_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          client_id: string | null
          created_at: string
          dedupe_key: string
          delivery_channels: Json
          id: string
          meeting_id: string | null
          notification_type: string
          priority: string
          project_id: string | null
          read_at: string | null
          resolved_at: string | null
          task_id: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          dedupe_key: string
          delivery_channels?: Json
          id?: string
          meeting_id?: string | null
          notification_type: string
          priority?: string
          project_id?: string | null
          read_at?: string | null
          resolved_at?: string | null
          task_id?: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          dedupe_key?: string
          delivery_channels?: Json
          id?: string
          meeting_id?: string | null
          notification_type?: string
          priority?: string
          project_id?: string | null
          read_at?: string | null
          resolved_at?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "internal_notifications_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "internal_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_financial_reconciliation_report: {
        Row: {
          candidate_count: number | null
          candidates: Json | null
          financial_record_id: string | null
          generated_at: string | null
          id: string
          review_status: string | null
        }
        Insert: {
          candidate_count?: number | null
          candidates?: Json | null
          financial_record_id?: string | null
          generated_at?: string | null
          id: string
          review_status?: string | null
        }
        Update: {
          candidate_count?: number | null
          candidates?: Json | null
          financial_record_id?: string | null
          generated_at?: string | null
          id?: string
          review_status?: string | null
        }
        Relationships: []
      }
      meeting_agenda_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discussed: boolean
          id: string
          meeting_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discussed?: boolean
          id?: string
          meeting_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discussed?: boolean
          id?: string
          meeting_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          meeting_id: string
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          meeting_id: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          meeting_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_next_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          meeting_id: string
          responsible_name: string | null
          responsible_user_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          meeting_id: string
          responsible_name?: string | null
          responsible_user_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          responsible_name?: string | null
          responsible_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_next_steps_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_next_steps_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          meeting_id: string
          name: string
          participant_type: string
          phone: string | null
          position: string | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          meeting_id: string
          name: string
          participant_type: string
          phone?: string | null
          position?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          meeting_id?: string
          name?: string
          participant_type?: string
          phone?: string | null
          position?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          client_id: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          date: string | null
          decisions: string | null
          duration: string | null
          end_date: string | null
          ended_at: string | null
          id: string
          location: string | null
          meeting_link: string | null
          minutes: string | null
          notes: string | null
          participants: string[] | null
          project_id: string | null
          responsible_user_id: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          agenda?: string | null
          client_id?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          decisions?: string | null
          duration?: string | null
          end_date?: string | null
          ended_at?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          minutes?: string | null
          notes?: string | null
          participants?: string[] | null
          project_id?: string | null
          responsible_user_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Update: {
          agenda?: string | null
          client_id?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          decisions?: string | null
          duration?: string | null
          end_date?: string | null
          ended_at?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          minutes?: string | null
          notes?: string | null
          participants?: string[] | null
          project_id?: string | null
          responsible_user_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
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
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_config: Json
          client_notifications: boolean
          created_at: string
          email_notifications: boolean
          id: string
          in_app_notifications: boolean
          meeting_notifications: boolean
          mention_notifications: boolean
          project_notifications: boolean
          push_notifications: boolean
          task_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_config?: Json
          client_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          in_app_notifications?: boolean
          meeting_notifications?: boolean
          mention_notifications?: boolean
          project_notifications?: boolean
          push_notifications?: boolean
          task_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_config?: Json
          client_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          in_app_notifications?: boolean
          meeting_notifications?: boolean
          mention_notifications?: boolean
          project_notifications?: boolean
          push_notifications?: boolean
          task_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          diagnostic_id: string | null
          effort: string | null
          estimated_value: number | null
          evidence_type: string | null
          id: string
          priority: string | null
          project_id: string | null
          source: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          effort?: string | null
          estimated_value?: number | null
          evidence_type?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          source?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          effort?: string | null
          estimated_value?: number | null
          evidence_type?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          source?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "opportunities_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string
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
          workspace_id?: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      project_audit_logs: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          id: string
          justification: string | null
          new_value: string | null
          old_value: string | null
          project_id: string | null
          user_id: string | null
          user_name: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          id?: string
          justification?: string | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string | null
          user_id?: string | null
          user_name?: string | null
          workspace_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          justification?: string | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string | null
          user_id?: string | null
          user_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_document_links: {
        Row: {
          created_at: string
          document_id: string
          linked_by: string | null
          project_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          linked_by?: string | null
          project_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          linked_by?: string | null
          project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_document_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_document_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_document_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          access_level: string
          created_at: string
          created_by: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          description: string
          id: string
          position: number
          project_id: string
          source_template_stage_id: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          description?: string
          id?: string
          position?: number
          project_id: string
          source_template_stage_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          description?: string
          id?: string
          position?: number
          project_id?: string
          source_template_stage_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_source_template_stage_id_fkey"
            columns: ["source_template_stage_id"]
            isOneToOne: false
            referencedRelation: "project_template_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_documents: {
        Row: {
          document_id: string
          position: number
          template_id: string
        }
        Insert: {
          document_id: string
          position?: number
          template_id: string
        }
        Update: {
          document_id?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_instantiations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          template_id: string | null
          template_snapshot: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          template_id?: string | null
          template_snapshot: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          template_id?: string | null
          template_snapshot?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_instantiations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_template_instantiations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_instantiations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_instantiations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_stages: {
        Row: {
          description: string
          id: string
          position: number
          template_id: string
          title: string
        }
        Insert: {
          description?: string
          id?: string
          position?: number
          template_id: string
          title: string
        }
        Update: {
          description?: string
          id?: string
          position?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_objective: string
          default_phase: string
          default_scope: string
          description: string
          id: string
          is_internal_process: boolean
          name: string
          project_type: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_objective?: string
          default_phase?: string
          default_scope?: string
          description?: string
          id?: string
          is_internal_process?: boolean
          name: string
          project_type?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_objective?: string
          default_phase?: string
          default_scope?: string
          description?: string
          id?: string
          is_internal_process?: boolean
          name?: string
          project_type?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          project_type: string | null
          responsible: string | null
          scope: string | null
          source_template_id: string | null
          start_date: string | null
          status: string | null
          template_snapshot: Json | null
          updated_at: string
          workspace_id: string
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
          project_type?: string | null
          responsible?: string | null
          scope?: string | null
          source_template_id?: string | null
          start_date?: string | null
          status?: string | null
          template_snapshot?: Json | null
          updated_at?: string
          workspace_id?: string
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
          project_type?: string | null
          responsible?: string | null
          scope?: string | null
          source_template_id?: string | null
          start_date?: string | null
          status?: string | null
          template_snapshot?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json
          previous_value: Json | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value: Json
          previous_value?: Json | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json
          previous_value?: Json | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_checklist_items: {
        Row: {
          id: string
          position: number
          task_template_id: string
          text: string
        }
        Insert: {
          id?: string
          position?: number
          task_template_id: string
          text: string
        }
        Update: {
          id?: string
          position?: number
          task_template_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_checklist_items_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_assignee_id: string | null
          default_priority: string
          description: string
          due_offset_days: number
          evidence_required: boolean
          id: string
          initial_status: string
          position: number
          project_template_id: string | null
          stage_id: string | null
          start_offset_days: number
          task_category: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_assignee_id?: string | null
          default_priority?: string
          description?: string
          due_offset_days?: number
          evidence_required?: boolean
          id?: string
          initial_status?: string
          position?: number
          project_template_id?: string | null
          stage_id?: string | null
          start_offset_days?: number
          task_category?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_assignee_id?: string | null
          default_priority?: string
          description?: string
          due_offset_days?: number
          evidence_required?: boolean
          id?: string
          initial_status?: string
          position?: number
          project_template_id?: string | null
          stage_id?: string | null
          start_offset_days?: number
          task_category?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_project_template_id_fkey"
            columns: ["project_template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_template_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          block_reason: string | null
          block_reason_category: string | null
          blocked_at: string | null
          checklist: Json
          client_id: string | null
          completed_at: string | null
          completed_by: string | null
          consulting_day: number | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          evidence_required: boolean | null
          evidence_url: string | null
          how: string | null
          how_much: number | null
          id: string
          observations: string | null
          previous_status: string | null
          priority: string
          project_id: string | null
          responsible: string | null
          source_action_id: string | null
          source_decision_id: string | null
          source_diagnostic_id: string | null
          source_meeting_id: string | null
          source_next_step_id: string | null
          source_task_template_id: string | null
          start_date: string | null
          status: string
          task_type: string
          title: string
          type: string | null
          updated_at: string
          what: string | null
          when_date: string | null
          where_location: string | null
          who: string | null
          why: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          block_reason?: string | null
          block_reason_category?: string | null
          blocked_at?: string | null
          checklist?: Json
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          consulting_day?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          evidence_required?: boolean | null
          evidence_url?: string | null
          how?: string | null
          how_much?: number | null
          id?: string
          observations?: string | null
          previous_status?: string | null
          priority?: string
          project_id?: string | null
          responsible?: string | null
          source_action_id?: string | null
          source_decision_id?: string | null
          source_diagnostic_id?: string | null
          source_meeting_id?: string | null
          source_next_step_id?: string | null
          source_task_template_id?: string | null
          start_date?: string | null
          status?: string
          task_type?: string
          title: string
          type?: string | null
          updated_at?: string
          what?: string | null
          when_date?: string | null
          where_location?: string | null
          who?: string | null
          why?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          block_reason?: string | null
          block_reason_category?: string | null
          blocked_at?: string | null
          checklist?: Json
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          consulting_day?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          evidence_required?: boolean | null
          evidence_url?: string | null
          how?: string | null
          how_much?: number | null
          id?: string
          observations?: string | null
          previous_status?: string | null
          priority?: string
          project_id?: string | null
          responsible?: string | null
          source_action_id?: string | null
          source_decision_id?: string | null
          source_diagnostic_id?: string | null
          source_meeting_id?: string | null
          source_next_step_id?: string | null
          source_task_template_id?: string | null
          start_date?: string | null
          status?: string
          task_type?: string
          title?: string
          type?: string | null
          updated_at?: string
          what?: string | null
          when_date?: string | null
          where_location?: string | null
          who?: string | null
          why?: string | null
          workspace_id?: string | null
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
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_consulting_day_plan_fkey"
            columns: ["project_id", "consulting_day"]
            isOneToOne: false
            referencedRelation: "consulting_day_plans"
            referencedColumns: ["project_id", "day_number"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "operational_project_health"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_decision_id_fkey"
            columns: ["source_decision_id"]
            isOneToOne: false
            referencedRelation: "meeting_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_meeting_id_fkey"
            columns: ["source_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_next_step_id_fkey"
            columns: ["source_next_step_id"]
            isOneToOne: false
            referencedRelation: "meeting_next_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_task_template_id_fkey"
            columns: ["source_task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_opportunity_rules: {
        Row: {
          audit: Json | null
          auto_generate: boolean
          condition: Json
          confidence: string | null
          created_at: string
          description: string | null
          enabled: boolean
          estimated_value: number | null
          evidence_type: string | null
          id: string
          name: string
          question_id: string
          template_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          audit?: Json | null
          auto_generate?: boolean
          condition: Json
          confidence?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          estimated_value?: number | null
          evidence_type?: string | null
          id?: string
          name: string
          question_id: string
          template_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          audit?: Json | null
          auto_generate?: boolean
          condition?: Json
          confidence?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          estimated_value?: number | null
          evidence_type?: string | null
          id?: string
          name?: string
          question_id?: string
          template_id?: string
          type?: string | null
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
          audit: Json | null
          created_at: string
          criticality: string | null
          description: string | null
          helper_text: string | null
          id: string
          max_value: number | null
          min_value: number | null
          options: Json | null
          position: number
          required: boolean
          section_id: string
          template_id: string
          title: string
          type: string
          updated_at: string
          weight: number
        }
        Insert: {
          audit?: Json | null
          created_at?: string
          criticality?: string | null
          description?: string | null
          helper_text?: string | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          position?: number
          required?: boolean
          section_id: string
          template_id: string
          title: string
          type?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          audit?: Json | null
          created_at?: string
          criticality?: string | null
          description?: string | null
          helper_text?: string | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          position?: number
          required?: boolean
          section_id?: string
          template_id?: string
          title?: string
          type?: string
          updated_at?: string
          weight?: number
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
      template_sections: {
        Row: {
          audit: Json | null
          created_at: string
          description: string | null
          id: string
          position: number
          template_id: string
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          audit?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          template_id: string
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          audit?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          template_id?: string
          title?: string
          updated_at?: string
          weight?: number
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
      user_preferences: {
        Row: {
          sidebar_compact: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          sidebar_compact?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          sidebar_compact?: boolean
          updated_at?: string
          user_id?: string
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
      workspace_members: {
        Row: {
          created_at: string
          created_by: string | null
          is_default: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          is_default?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          is_default?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_operational_settings: {
        Row: {
          blocked_stale_days: number
          due_soon_days: number
          inactivity_days: number
          project_stale_days: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          blocked_stale_days?: number
          due_soon_days?: number
          inactivity_days?: number
          project_stale_days?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          blocked_stale_days?: number
          due_soon_days?: number
          inactivity_days?: number
          project_stale_days?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_operational_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      operational_client_health: {
        Row: {
          active_projects: number | null
          blocked_tasks: number | null
          client_id: string | null
          client_name: string | null
          client_status: string | null
          critical_projects: number | null
          health: string | null
          last_activity_at: string | null
          no_follow_up: boolean | null
          open_tasks: number | null
          overdue_tasks: number | null
          risk_projects: number | null
          risk_reasons: Json | null
          risk_score: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_project_health: {
        Row: {
          blocked_tasks: number | null
          client_id: string | null
          client_name: string | null
          done_tasks: number | null
          end_date: string | null
          health: string | null
          last_activity_at: string | null
          open_tasks: number | null
          overdue_next_steps: number | null
          overdue_tasks: number | null
          pending_meetings: number | null
          progress: number | null
          project_id: string | null
          project_name: string | null
          project_status: string | null
          responsible: string | null
          risk_reasons: Json | null
          risk_score: number | null
          total_tasks: number | null
          urgent_tasks: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_client_health"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_project_template: {
        Args: {
          p_fallback_assignee?: string
          p_project_id: string
          p_start_date?: string
          p_template_id: string
        }
        Returns: number
      }
      begin_ai_interaction: {
        Args: { p_question: string; p_scope?: Json }
        Returns: string
      }
      claim_task_comment_notification: {
        Args: { _channel: string; _comment_id: string; _recipient_id: string }
        Returns: boolean
      }
      complete_ai_interaction: {
        Args: {
          p_answer?: string
          p_citations?: Json
          p_error_message?: string
          p_input_tokens?: number
          p_interaction_id: string
          p_mode?: string
          p_model?: string
          p_output_tokens?: number
          p_status: string
          p_suggested_tasks?: Json
        }
        Returns: undefined
      }
      create_consulting_report_version: {
        Args: { p_report_id: string }
        Returns: string
      }
      create_financial_recurring_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_day_of_month?: number
          p_description: string
          p_end_date?: string
          p_frequency: string
          p_project_id: string
          p_start_date: string
        }
        Returns: {
          active: boolean
          amount: number
          category: string
          created_at: string
          created_by: string | null
          day_of_month: number
          description: string
          end_date: string | null
          frequency: string
          id: string
          project_id: string | null
          start_date: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "financial_recurring_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      duplicate_project: {
        Args: {
          p_client_id: string
          p_copy_assignees?: boolean
          p_copy_documents?: boolean
          p_copy_settings?: boolean
          p_copy_stages?: boolean
          p_copy_tasks?: boolean
          p_name: string
          p_source_project_id: string
          p_start_date: string
        }
        Returns: string
      }
      generate_consulting_report: {
        Args: {
          p_client_id: string
          p_period_end: string
          p_period_start: string
          p_project_ids?: string[]
        }
        Returns: string
      }
      get_ai_context: {
        Args: {
          p_client_id?: string
          p_meeting_id?: string
          p_question: string
          p_report_id?: string
        }
        Returns: Json
      }
      get_operations_dashboard: {
        Args: {
          _client_id?: string
          _period_days?: number
          _responsible_id?: string
          _workspace_id?: string
        }
        Returns: Json
      }
      get_operations_dashboard_base: {
        Args: {
          _client_id?: string
          _period_days?: number
          _responsible_id?: string
          _workspace_id?: string
        }
        Returns: Json
      }
      get_team_operations: { Args: { _workspace_id?: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_my_notifications: { Args: never; Returns: number }
      refresh_my_task_notifications: { Args: never; Returns: number }
      release_task_comment_notification: {
        Args: { _channel: string; _comment_id: string; _recipient_id: string }
        Returns: undefined
      }
      save_project_template: {
        Args: {
          p_default_phase: string
          p_description: string
          p_id: string
          p_is_internal_process: boolean
          p_name: string
          p_project_type: string
          p_stages: Json
          p_status: string
          p_tasks: Json
        }
        Returns: string
      }
      save_task_template: {
        Args: {
          p_checklist: Json
          p_default_assignee_id: string
          p_description: string
          p_due_offset_days: number
          p_initial_status: string
          p_priority: string
          p_start_offset_days: number
          p_title: string
        }
        Returns: string
      }
      set_financial_record_payment: {
        Args: {
          p_financial_record_id: string
          p_paid: boolean
          p_paid_at?: string
          p_payment_method?: string
          p_payment_notes?: string
        }
        Returns: {
          amount: number
          category: string | null
          client_id: string | null
          contract_id: string | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          installment_id: string | null
          is_internal: boolean | null
          paid_at: string | null
          payment_method: string | null
          payment_notes: string | null
          project_id: string | null
          recurrence_rule_id: string | null
          status: string | null
          type: string
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "financial_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_financial_recurring_expense_active: {
        Args: { p_active: boolean; p_rule_id: string }
        Returns: undefined
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
      workspace_role: "viewer" | "member" | "manager" | "admin" | "owner"
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
      workspace_role: ["viewer", "member", "manager", "admin", "owner"],
    },
  },
} as const
