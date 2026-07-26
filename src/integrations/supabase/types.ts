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
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
        }
        Relationships: []
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
            referencedRelation: "projects"
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
        }
        Relationships: []
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
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          project_id: string
          responsible: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          responsible?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          responsible?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
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
          description: Json | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      diagnostics: {
        Row: {
          action_plan: Json | null
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
          total_questions: number | null
          updated_at: string
        }
        Insert: {
          action_plan?: Json | null
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
          total_questions?: number | null
          updated_at?: string
        }
        Update: {
          action_plan?: Json | null
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
          total_questions?: number | null
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
      documents: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          diagnostic_id: string | null
          evidence_status: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_internal: boolean | null
          meeting_id: string | null
          mime_type: string | null
          name: string
          project_id: string | null
          rejection_reason: string | null
          tags: string[] | null
          task_id: string | null
          type: string | null
          updated_at: string
          uploaded_by: string | null
          url: string | null
          visibility: string | null
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          evidence_status?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_internal?: boolean | null
          meeting_id?: string | null
          mime_type?: string | null
          name: string
          project_id?: string | null
          rejection_reason?: string | null
          tags?: string[] | null
          task_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
          visibility?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          diagnostic_id?: string | null
          evidence_status?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_internal?: boolean | null
          meeting_id?: string | null
          mime_type?: string | null
          name?: string
          project_id?: string | null
          rejection_reason?: string | null
          tags?: string[] | null
          task_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
          visibility?: string | null
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
          status: string | null
          type: string
          updated_at: string
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
          status?: string | null
          type: string
          updated_at?: string
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
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
          value: number | null
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
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          push_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
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
        }
        Relationships: [
          {
            foreignKeyName: "project_audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            referencedRelation: "projects"
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
          project_type?: string | null
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
          project_type?: string | null
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
            referencedRelation: "projects"
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
      tasks: {
        Row: {
          assigned_to: string | null
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
          previous_status: string | null
          priority: string
          project_id: string | null
          responsible: string | null
          source_action_id: string | null
          source_diagnostic_id: string | null
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
        }
        Insert: {
          assigned_to?: string | null
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
          previous_status?: string | null
          priority?: string
          project_id?: string | null
          responsible?: string | null
          source_action_id?: string | null
          source_diagnostic_id?: string | null
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
        }
        Update: {
          assigned_to?: string | null
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
          previous_status?: string | null
          priority?: string
          project_id?: string | null
          responsible?: string | null
          source_action_id?: string | null
          source_diagnostic_id?: string | null
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
            referencedRelation: "projects"
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
      set_financial_record_payment: {
        Args: {
          p_financial_record_id: string
          p_paid: boolean
          p_paid_at?: string | null
          p_payment_method?: string | null
          p_payment_notes?: string | null
        }
        Returns: Database["public"]["Tables"]["financial_records"]["Row"][]
      }
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
