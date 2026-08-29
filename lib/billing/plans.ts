import type { Plan } from "@/lib/supabase/types";

/**
 * Matches the "Credit Costs" table in
 * chatbo-ai-complete-saas-platform-build-command.md exactly. If you
 * change a number, change it here — every route imports from this file
 * rather than hardcoding a credit cost inline.
 */
export const CREDIT_COSTS = {
  messageExchange: 10,
  knowledgeDocIngested: 40,
  knowledgeUrlIndexed: 40,
  promptRegeneration: 20,
  apiRequest: 10,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export const PLAN_PRICES_USD: Record<Plan, number> = {
  free: 0,
  starter: 15,
  pro: 39,
  business: 89,
};

export const PLAN_LIMITS: Record<
  Plan,
  {
    monthlyCredits: number;
    maxBots: number | null; // null = unlimited
    maxKnowledgeDocsPerBot: number | null;
    maxSeats: number | null;
    features: {
      advancedPromptEditor: boolean;
      workspaceRoles: boolean;
      auditLogs: boolean;
      publicApi: "none" | "read" | "read-write";
      outboundWebhooks: boolean;
      channelIntegrations: boolean;
      mfaOrgEnforceable: boolean;
    };
  }
> = {
  free: {
    monthlyCredits: 2500,
    maxBots: 1,
    maxKnowledgeDocsPerBot: 1,
    maxSeats: 1,
    features: {
      advancedPromptEditor: false,
      workspaceRoles: false,
      auditLogs: false,
      publicApi: "none",
      outboundWebhooks: false,
      channelIntegrations: false,
      mfaOrgEnforceable: false,
    },
  },
  starter: {
    monthlyCredits: 5000,
    maxBots: 5,
    maxKnowledgeDocsPerBot: 30,
    maxSeats: 2,
    features: {
      advancedPromptEditor: true,
      workspaceRoles: false,
      auditLogs: false,
      publicApi: "none",
      outboundWebhooks: false,
      channelIntegrations: false,
      mfaOrgEnforceable: false,
    },
  },
  pro: {
    monthlyCredits: 13000,
    maxBots: 20,
    maxKnowledgeDocsPerBot: 150,
    maxSeats: 5,
    features: {
      advancedPromptEditor: true,
      workspaceRoles: true,
      auditLogs: false,
      publicApi: "read",
      outboundWebhooks: false,
      channelIntegrations: true,
      mfaOrgEnforceable: false,
    },
  },
  business: {
    monthlyCredits: 31000,
    maxBots: null,
    maxKnowledgeDocsPerBot: null,
    maxSeats: null,
    features: {
      advancedPromptEditor: true,
      workspaceRoles: true,
      auditLogs: true,
      publicApi: "read-write",
      outboundWebhooks: true,
      channelIntegrations: true,
      mfaOrgEnforceable: true,
    },
  },
};
