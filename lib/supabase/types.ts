/**
 * Hand-written to match supabase/migrations/0001_init.sql exactly.
 *
 * Once you have a live Supabase project, regenerate this file for real with:
 *   npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/types.ts
 * and re-apply the small amount of hand-written convenience (the Json type,
 * re-exported row/insert helpers below) that the generator doesn't produce.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin";
export type WorkspaceMemberRole = "owner" | "admin" | "editor" | "viewer";
export type Plan = "free" | "starter" | "pro" | "business";
export type BotUseCase =
  | "customer_support"
  | "lead_gen"
  | "faq"
  | "internal_docs"
  | "sales_assistant";
export type BotTone =
  | "professional"
  | "friendly"
  | "playful"
  | "formal"
  | "empathetic";
export type FallbackBehavior =
  | "escalate_email"
  | "apologize_contact"
  | "say_dont_know";
export type WidgetPosition = "bottom-right" | "bottom-left";
export type BotStatus = "draft" | "published";
export type KnowledgeSourceType = "file" | "text" | "url" | "website";
export type KnowledgeSourceStatus = "processing" | "indexing" | "ready" | "failed";
export type ConversationChannel =
  | "widget"
  | "share_link"
  | "api"
  | "playground"
  | "slack"
  | "whatsapp"
  | "teams";
export type MessageRole = "user" | "assistant";
export type MessageFeedback = "up" | "down";
export type IntegrationChannel = "slack" | "whatsapp" | "teams" | "zendesk";
export type IntegrationStatus = "queued" | "connected";
export type ToolPermission = "read" | "write" | "sensitive";
export type ToolExecutionStatus = "started" | "succeeded" | "failed" | "blocked";
export type WebhookStatus = "active" | "disabled";
export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          require_mfa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          require_mfa?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceMemberRole;
          invited_at: string;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceMemberRole;
          invited_at?: string;
          joined_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["workspace_members"]["Insert"]
        >;
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          plan: Plan;
          status: string;
          provider: string | null;
          paddle_subscription_id: string | null;
          paddle_customer_id: string | null;
          credits_remaining: number;
          renews_at: string | null;
          notified_80_at: string | null;
          notified_100_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          plan?: Plan;
          status?: string;
          provider?: string | null;
          paddle_subscription_id?: string | null;
          paddle_customer_id?: string | null;
          credits_remaining?: number;
          renews_at?: string | null;
          notified_80_at?: string | null;
          notified_100_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscriptions"]["Insert"]
        >;
      };
      bots: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          name: string;
          description: string | null;
          use_case: BotUseCase;
          tone: BotTone;
          fallback_behavior: FallbackBehavior;
          system_prompt: string;
          agent_config: Json;
          model: string;
          avatar: string | null;
          brand_color: string | null;
          welcome_message: string | null;
          widget_position: WidgetPosition;
          allowed_domains: string[] | null;
          status: BotStatus;
          starter_questions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          name: string;
          description?: string | null;
          use_case: BotUseCase;
          tone: BotTone;
          fallback_behavior?: FallbackBehavior;
          system_prompt: string;
          agent_config?: Json;
          model?: string;
          avatar?: string | null;
          brand_color?: string | null;
          welcome_message?: string | null;
          widget_position?: WidgetPosition;
          allowed_domains?: string[] | null;
          status?: BotStatus;
          starter_questions?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bots"]["Insert"]>;
      };
      knowledge_sources: {
        Row: {
          id: string;
          bot_id: string;
          type: KnowledgeSourceType;
          title: string;
          storage_path: string | null;
          raw_text: string | null;
          status: KnowledgeSourceStatus;
          auto_resync: boolean;
          mime_type: string | null;
          file_size: number | null;
          chunk_count: number;
          last_indexed_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          type: KnowledgeSourceType;
          title: string;
          storage_path?: string | null;
          raw_text?: string | null;
          status?: KnowledgeSourceStatus;
          auto_resync?: boolean;
          mime_type?: string | null;
          file_size?: number | null;
          chunk_count?: number;
          last_indexed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["knowledge_sources"]["Insert"]
        >;
      };
      knowledge_chunks: {
        Row: {
          id: string;
          source_id: string;
          bot_id: string;
          content: string;
          embedding: number[] | null;
          content_hash: string;
          chunk_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          bot_id: string;
          content: string;
          embedding?: number[] | null;
          content_hash: string;
          chunk_index?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["knowledge_chunks"]["Insert"]
        >;
      };
      conversations: {
        Row: {
          id: string;
          bot_id: string;
          visitor_id: string;
          channel: ConversationChannel;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          bot_id: string;
          visitor_id: string;
          channel?: ConversationChannel;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["conversations"]["Insert"]
        >;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          citations: Json | null;
          feedback: MessageFeedback | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          citations?: Json | null;
          feedback?: MessageFeedback | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      integrations: {
        Row: {
          id: string;
          bot_id: string;
          channel: IntegrationChannel;
          status: IntegrationStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          channel: IntegrationChannel;
          status?: IntegrationStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integrations"]["Insert"]
        >;
      };
      agent_tools: {
        Row: {
          id: string; bot_id: string; tool_key: string; enabled: boolean; permission: ToolPermission; config: Json; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; bot_id: string; tool_key: string; enabled?: boolean; permission?: ToolPermission; config?: Json; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_tools"]["Insert"]>;
      };
      tool_executions: {
        Row: {
          id: string; bot_id: string; conversation_id: string | null; tool_key: string; status: ToolExecutionStatus; input: Json; output: Json | null; error_message: string | null; duration_ms: number | null; provider: string | null; request_id: string | null; created_at: string;
        };
        Insert: {
          id?: string; bot_id: string; conversation_id?: string | null; tool_key: string; status: ToolExecutionStatus; input?: Json; output?: Json | null; error_message?: string | null; duration_ms?: number | null; provider?: string | null; request_id?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tool_executions"]["Insert"]>;
      };
      agent_memories: {
        Row: { id: string; bot_id: string; visitor_id: string; category: string; memory_key: string; memory_value: string; confidence: number; source_conversation_id: string | null; last_confirmed_at: string; created_at: string; updated_at: string; };
        Insert: { id?: string; bot_id: string; visitor_id: string; category: string; memory_key: string; memory_value: string; confidence?: number; source_conversation_id?: string | null; last_confirmed_at?: string; created_at?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["agent_memories"]["Insert"]>;
      };
      conversation_summaries: {
        Row: { conversation_id: string; bot_id: string; summary: string; covered_message_count: number; updated_at: string; };
        Insert: { conversation_id: string; bot_id: string; summary: string; covered_message_count?: number; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["conversation_summaries"]["Insert"]>;
      };
      shares: {
        Row: {
          id: string;
          bot_id: string;
          slug: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          slug: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shares"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          paddle_transaction_id: string | null;
          amount: number | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          paddle_transaction_id?: string | null;
          amount?: number | null;
          status?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_user_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_user_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
      api_idempotency_keys: {
        Row: { id: string; workspace_id: string; api_key_id: string; idempotency_key: string; request_hash: string; response_status: number; response_body: Json; created_at: string };
        Insert: { id?: string; workspace_id: string; api_key_id: string; idempotency_key: string; request_hash: string; response_status: number; response_body: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["api_idempotency_keys"]["Insert"]>;
      };
      api_keys: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          key_hash: string;
          scopes: string[];
          last_used_at: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          key_hash: string;
          scopes?: string[];
          last_used_at?: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Insert"]>;
      };
      webhook_endpoints: {
        Row: {
          id: string;
          workspace_id: string;
          url: string;
          secret: string;
          events: string[];
          status: WebhookStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          url: string;
          secret: string;
          events?: string[];
          status?: WebhookStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["webhook_endpoints"]["Insert"]
        >;
      };
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_endpoint_id: string;
          event: string;
          payload: Json;
          status: WebhookDeliveryStatus;
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_endpoint_id: string;
          event: string;
          payload: Json;
          status?: WebhookDeliveryStatus;
          attempts?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["webhook_deliveries"]["Insert"]
        >;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notifications"]["Insert"]
        >;
      };
      ai_usage_records: {
        Row: {
          id: string; workspace_id: string; bot_id: string; conversation_id: string | null; provider: string; model: string;
          input_tokens: number; output_tokens: number; cached_tokens: number; estimated_cost_usd: number; latency_ms: number;
          success: boolean; error_message: string | null; created_at: string;
        };
        Insert: {
          id?: string; workspace_id: string; bot_id: string; conversation_id?: string | null; provider: string; model: string;
          input_tokens?: number; output_tokens?: number; cached_tokens?: number; estimated_cost_usd?: number; latency_ms?: number;
          success?: boolean; error_message?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage_records"]["Insert"]>;
      };
      ai_provider_health: {
        Row: { provider: string; consecutive_failures: number; last_failure_at: string | null; last_success_at: string | null; disabled_until: string | null; updated_at: string; };
        Insert: { provider: string; consecutive_failures?: number; last_failure_at?: string | null; last_success_at?: string | null; disabled_until?: string | null; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["ai_provider_health"]["Insert"]>;
      };
      integration_connections: {
        Row: { id: string; workspace_id: string; provider: string; status: "pending" | "connected" | "error" | "disconnected"; account_id: string | null; encrypted_access_token: string | null; encrypted_refresh_token: string | null; expires_at: string | null; scopes: string[]; metadata: Record<string, unknown>; last_used_at: string | null; last_error: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; workspace_id: string; provider: string; status?: "pending" | "connected" | "error" | "disconnected"; account_id?: string | null; encrypted_access_token?: string | null; encrypted_refresh_token?: string | null; expires_at?: string | null; scopes?: string[]; metadata?: Record<string, unknown>; last_used_at?: string | null; last_error?: string | null; created_at?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["integration_connections"]["Insert"]>;
      };
      agent_integration_permissions: {
        Row: { id: string; bot_id: string; connection_id: string; enabled: boolean; scopes: string[]; created_at: string; updated_at: string; };
        Insert: { id?: string; bot_id: string; connection_id: string; enabled?: boolean; scopes?: string[]; created_at?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["agent_integration_permissions"]["Insert"]>;
      };
      eval_suites: {
        Row: { id: string; bot_id: string; name: string; description: string | null; created_at: string; updated_at: string; },
        Insert: { id?: string; bot_id: string; name: string; description?: string | null; created_at?: string; updated_at?: string; },
        Update: Partial<Database["public"]["Tables"]["eval_suites"]["Insert"]>;
      };
      eval_test_cases: {
        Row: { id: string; suite_id: string; name: string; input: string; expected: string | null; required_tools: string[]; forbidden_tools: string[]; tags: string[]; created_at: string; },
        Insert: { id?: string; suite_id: string; name: string; input: string; expected?: string | null; required_tools?: string[]; forbidden_tools?: string[]; tags?: string[]; created_at?: string; },
        Update: Partial<Database["public"]["Tables"]["eval_test_cases"]["Insert"]>;
      };
      eval_runs: {
        Row: { id: string; suite_id: string; bot_id: string; status: "queued" | "running" | "passed" | "failed"; score: number | null; summary: Json; started_at: string; completed_at: string | null; },
        Insert: { id?: string; suite_id: string; bot_id: string; status?: "queued" | "running" | "passed" | "failed"; score?: number | null; summary?: Json; started_at?: string; completed_at?: string | null; },
        Update: Partial<Database["public"]["Tables"]["eval_runs"]["Insert"]>;
      };
      eval_results: {
        Row: { id: string; run_id: string; test_case_id: string; score: number; task_score: number; groundedness_score: number; tool_score: number; safety_score: number; efficiency_score: number; provider: string | null; model: string | null; input_tokens: number; output_tokens: number; latency_ms: number; tool_calls: number; final_output: string | null; trace: Json; created_at: string; },
        Insert: { id?: string; run_id: string; test_case_id: string; score: number; task_score?: number; groundedness_score?: number; tool_score?: number; safety_score?: number; efficiency_score?: number; provider?: string | null; model?: string | null; input_tokens?: number; output_tokens?: number; latency_ms?: number; tool_calls?: number; final_output?: string | null; trace?: Json; created_at?: string; },
        Update: Partial<Database["public"]["Tables"]["eval_results"]["Insert"]>;
      };
      agent_runs: {
        Row: { id: string; workspace_id: string; bot_id: string; conversation_id: string | null; request_id: string; channel: string | null; status: "running" | "succeeded" | "failed" | "cancelled"; started_at: string; completed_at: string | null; duration_ms: number | null; total_steps: number; tool_calls: number; model_calls: number; input_tokens: number; output_tokens: number; cached_tokens: number; estimated_cost_usd: number; provider: string | null; model: string | null; quality_score: number | null; feedback: MessageFeedback | null; error_code: string | null; error_message: string | null; metadata: Json; };
        Insert: { id?: string; workspace_id: string; bot_id: string; conversation_id?: string | null; request_id: string; channel?: string | null; status?: "running" | "succeeded" | "failed" | "cancelled"; started_at?: string; completed_at?: string | null; duration_ms?: number | null; total_steps?: number; tool_calls?: number; model_calls?: number; input_tokens?: number; output_tokens?: number; cached_tokens?: number; estimated_cost_usd?: number; provider?: string | null; model?: string | null; quality_score?: number | null; feedback?: MessageFeedback | null; error_code?: string | null; error_message?: string | null; metadata?: Json; };
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Insert"]>;
      };
      agent_trace_events: {
        Row: { id: string; run_id: string; workspace_id: string; bot_id: string; step_index: number; event_type: string; name: string | null; status: string | null; provider: string | null; model: string | null; duration_ms: number | null; input_tokens: number | null; output_tokens: number | null; cost_usd: number | null; payload: Json; created_at: string; };
        Insert: { id?: string; run_id: string; workspace_id: string; bot_id: string; step_index?: number; event_type: string; name?: string | null; status?: string | null; provider?: string | null; model?: string | null; duration_ms?: number | null; input_tokens?: number | null; output_tokens?: number | null; cost_usd?: number | null; payload?: Json; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["agent_trace_events"]["Insert"]>;
      };
      observability_alert_rules: {
        Row: { id: string; workspace_id: string; name: string; metric: string; operator: string; threshold: number; window_minutes: number; enabled: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; workspace_id: string; name: string; metric: string; operator: string; threshold: number; window_minutes?: number; enabled?: boolean; created_at?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["observability_alert_rules"]["Insert"]>;
      };
      observability_alerts: {
        Row: { id: string; workspace_id: string; rule_id: string; status: string; observed_value: number | null; threshold: number | null; message: string; metadata: Json; created_at: string; acknowledged_at: string | null; resolved_at: string | null; };
        Insert: { id?: string; workspace_id: string; rule_id: string; status?: string; observed_value?: number | null; threshold?: number | null; message: string; metadata?: Json; created_at?: string; acknowledged_at?: string | null; resolved_at?: string | null; };
        Update: Partial<Database["public"]["Tables"]["observability_alerts"]["Insert"]>;
      };
      agent_business_events: {
        Row: { id: string; workspace_id: string; bot_id: string; conversation_id: string | null; event_type: string; value: number | null; currency: string | null; metadata: Json; created_at: string; };
        Insert: { id?: string; workspace_id: string; bot_id: string; conversation_id?: string | null; event_type: string; value?: number | null; currency?: string | null; metadata?: Json; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["agent_business_events"]["Insert"]>;
      };
      bot_versions: {
        Row: { id: string; bot_id: string; workspace_id: string; version_number: number; snapshot: Json; created_by: string | null; created_at: string; };
        Insert: { id?: string; bot_id: string; workspace_id: string; version_number: number; snapshot: Json; created_by?: string | null; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["bot_versions"]["Insert"]>;
      };
      bot_deployments: {
        Row: { id: string; bot_id: string; workspace_id: string; environment: string; version_id: string | null; status: string; deployed_by: string | null; deployed_at: string; rolled_back_at: string | null; };
        Insert: { id?: string; bot_id: string; workspace_id: string; environment: string; version_id?: string | null; status?: string; deployed_by?: string | null; deployed_at?: string; rolled_back_at?: string | null; };
        Update: Partial<Database["public"]["Tables"]["bot_deployments"]["Insert"]>;
      };
      bot_domains: {
        Row: { id: string; bot_id: string; workspace_id: string; hostname: string; type: string; status: string; verification_token: string; created_at: string; verified_at: string | null; };
        Insert: { id?: string; bot_id: string; workspace_id: string; hostname: string; type?: string; status?: string; verification_token: string; created_at?: string; verified_at?: string | null; };
        Update: Partial<Database["public"]["Tables"]["bot_domains"]["Insert"]>;
      };
      workflows: {
        Row: { id: string; workspace_id: string; bot_id: string | null; name: string; description: string | null; status: string; trigger_type: string; trigger_config: any; nodes: any; edges: any; version: number; created_by: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; workspace_id: string; bot_id?: string | null; name: string; description?: string | null; status?: string; trigger_type?: string; trigger_config?: any; nodes?: any; edges?: any; version?: number; created_by?: string | null; created_at?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["workflows"]["Insert"]>;
      };
      workflow_runs: {
        Row: { id: string; workflow_id: string; workspace_id: string; trigger_type: string; status: string; input: any; output: any; error: string | null; current_node_id: string | null; started_at: string | null; completed_at: string | null; duration_ms: number | null; created_at: string; };
        Insert: { id?: string; workflow_id: string; workspace_id: string; trigger_type: string; status?: string; input?: any; output?: any; error?: string | null; current_node_id?: string | null; started_at?: string | null; completed_at?: string | null; duration_ms?: number | null; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["workflow_runs"]["Insert"]>;
      };
      workflow_run_steps: {
        Row: { id: string; run_id: string; workflow_id: string; workspace_id: string; node_id: string; node_type: string; status: string; input: any; output: any; error: string | null; duration_ms: number | null; created_at: string; };
        Insert: { id?: string; run_id: string; workflow_id: string; workspace_id: string; node_id: string; node_type: string; status: string; input?: any; output?: any; error?: string | null; duration_ms?: number | null; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["workflow_run_steps"]["Insert"]>;
      };
      organizations: {
        Row: { id: string; name: string; owner_id: string; created_at: string; };
        Insert: { id?: string; name: string; owner_id: string; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      organization_workspaces: {
        Row: { organization_id: string; workspace_id: string; created_at: string; };
        Insert: { organization_id: string; workspace_id: string; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_workspaces"]["Insert"]>;
      };
      organization_members: {
        Row: { id: string; organization_id: string; user_id: string; role: string; created_at: string; };
        Insert: { id?: string; organization_id: string; user_id: string; role?: string; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>;
      };
      teams: {
        Row: { id: string; organization_id: string; name: string; description: string | null; created_at: string; };
        Insert: { id?: string; organization_id: string; name: string; description?: string | null; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      team_members: {
        Row: { team_id: string; user_id: string; role: string; created_at: string; };
        Insert: { team_id: string; user_id: string; role?: string; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      organization_permissions: {
        Row: { organization_id: string; role: string; permission: string; enabled: boolean; };
        Insert: { organization_id: string; role: string; permission: string; enabled?: boolean; };
        Update: Partial<Database["public"]["Tables"]["organization_permissions"]["Insert"]>;
      };
      organization_domains: {
        Row: { id: string; organization_id: string; domain: string; verification_token: string; status: string; enforce_sso: boolean; created_at: string; verified_at: string | null; };
        Insert: { id?: string; organization_id: string; domain: string; verification_token: string; status?: string; enforce_sso?: boolean; created_at?: string; verified_at?: string | null; };
        Update: Partial<Database["public"]["Tables"]["organization_domains"]["Insert"]>;
      };
      organization_sso_configs: {
        Row: { id: string; organization_id: string; provider_type: string; name: string; issuer: string | null; client_id: string | null; client_secret_encrypted: string | null; authorization_url: string | null; token_url: string | null; metadata_url: string | null; entity_id: string | null; sso_url: string | null; certificate: string | null; enabled: boolean; enforce: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; organization_id: string; provider_type: string; name: string; issuer?: string | null; client_id?: string | null; client_secret_encrypted?: string | null; authorization_url?: string | null; token_url?: string | null; metadata_url?: string | null; entity_id?: string | null; sso_url?: string | null; certificate?: string | null; enabled?: boolean; enforce?: boolean; created_at?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_sso_configs"]["Insert"]>;
      };
      organization_scim_tokens: {
        Row: { id: string; organization_id: string; name: string; token_hash: string; last_used_at: string | null; expires_at: string | null; revoked_at: string | null; created_at: string; };
        Insert: { id?: string; organization_id: string; name: string; token_hash: string; last_used_at?: string | null; expires_at?: string | null; revoked_at?: string | null; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_scim_tokens"]["Insert"]>;
      };
      organization_security_settings: {
        Row: { organization_id: string; require_mfa: boolean; enforce_sso: boolean; restrict_to_verified_domains: boolean; ip_allowlist: string[]; session_timeout_minutes: number; updated_at: string; };
        Insert: { organization_id: string; require_mfa?: boolean; enforce_sso?: boolean; restrict_to_verified_domains?: boolean; ip_allowlist?: string[]; session_timeout_minutes?: number; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_security_settings"]["Insert"]>;
      };
      organization_security_events: {
        Row: { id: string; organization_id: string; user_id: string | null; event_type: string; ip_address: string | null; user_agent: string | null; metadata: any; created_at: string; };
        Insert: { id?: string; organization_id: string; user_id?: string | null; event_type: string; ip_address?: string | null; user_agent?: string | null; metadata?: any; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_security_events"]["Insert"]>;
      };
      organization_audit_events: {
        Row: { id: string; organization_id: string; actor_user_id: string | null; event_type: string; action: string; target_type: string | null; target_id: string | null; result: string; ip_address: string | null; user_agent: string | null; metadata: any; created_at: string; };
        Insert: { id?: string; organization_id: string; actor_user_id?: string | null; event_type: string; action: string; target_type?: string | null; target_id?: string | null; result?: string; ip_address?: string | null; user_agent?: string | null; metadata?: any; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_audit_events"]["Insert"]>;
      };
      organization_compliance_settings: {
        Row: { organization_id: string; audit_retention_days: number; data_retention_days: number; export_enabled: boolean; deletion_requests_enabled: boolean; updated_at: string; };
        Insert: { organization_id: string; audit_retention_days?: number; data_retention_days?: number; export_enabled?: boolean; deletion_requests_enabled?: boolean; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_compliance_settings"]["Insert"]>;
      };
      organization_privacy_settings: {
        Row: { organization_id: string; pii_detection_enabled: boolean; redact_sensitive_logs: boolean; consent_required_for_training: boolean; data_residency: string; updated_at: string; };
        Insert: { organization_id: string; pii_detection_enabled?: boolean; redact_sensitive_logs?: boolean; consent_required_for_training?: boolean; data_residency?: string; updated_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_privacy_settings"]["Insert"]>;
      };
      organization_data_subject_requests: {
        Row: { id: string; organization_id: string; requested_by_user_id: string | null; subject_user_id: string | null; request_type: string; status: string; reason: string | null; requested_at: string; due_at: string | null; completed_at: string | null; completed_by_user_id: string | null; result_metadata: any; };
        Insert: { id?: string; organization_id: string; requested_by_user_id?: string | null; subject_user_id?: string | null; request_type: string; status?: string; reason?: string | null; requested_at?: string; due_at?: string | null; completed_at?: string | null; completed_by_user_id?: string | null; result_metadata?: any; };
        Update: Partial<Database["public"]["Tables"]["organization_data_subject_requests"]["Insert"]>;
      };
      organization_consent_records: {
        Row: { id: string; organization_id: string; user_id: string | null; purpose: string; status: string; policy_version: string; source: string; created_at: string; };
        Insert: { id?: string; organization_id: string; user_id?: string | null; purpose: string; status: string; policy_version?: string; source?: string; created_at?: string; };
        Update: Partial<Database["public"]["Tables"]["organization_consent_records"]["Insert"]>;
      };
      organization_retention_runs: {
        Row: { id: string; organization_id: string; status: string; dry_run: boolean; records_eligible: number; records_deleted: number; started_at: string | null; completed_at: string | null; error: string | null; };
        Insert: { id?: string; organization_id: string; status?: string; dry_run?: boolean; records_eligible?: number; records_deleted?: number; started_at?: string | null; completed_at?: string | null; error?: string | null; };
        Update: Partial<Database["public"]["Tables"]["organization_retention_runs"]["Insert"]>;
      };
      templates: {
        Row: {
          id: string;
          name: string;
          use_case: string;
          system_prompt_template: string;
          thumbnail: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          use_case: string;
          system_prompt_template: string;
          thumbnail?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Insert"]>;
      };
      mfa_recovery_codes: {
        Row: {
          id: string;
          user_id: string;
          code_hash: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mfa_recovery_codes"]["Insert"]>;
      };
    };
    Functions: {
      deduct_credits: {
        Args: { p_workspace_id: string; p_amount: number };
        Returns: { success: boolean; new_balance: number; old_balance: number }[];
      };
      reset_monthly_credits: {
        Args: { p_workspace_id: string; p_plan_credits: number };
        Returns: void;
      };
      is_workspace_member: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      match_knowledge_chunks: {
        Args: {
          p_bot_id: string;
          p_query_embedding: number[];
          p_match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          source_id: string;
          source_title: string;
          similarity: number;
        }[];
      };
      find_cached_embedding: {
        Args: { p_content_hash: string };
        Returns: number[] | null;
      };
    };
  };
}
