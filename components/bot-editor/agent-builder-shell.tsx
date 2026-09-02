"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  LayoutGrid, FileText, BookOpen, Wrench, Brain, Shield, Radio,
  FlaskConical, Rocket, History, ArrowRight,
} from "lucide-react";
import { PromptEditor } from "./prompt-editor";
import {
  useAgentConfig, AgentConfigHiddenField, AgentObjectiveFields,
  AgentInstructionsFields, AgentMemoryFields, AgentToolsFields, AgentSecurityFields,
} from "./agent-config-fields";
import { setBotPublishStatus } from "@/lib/actions/bots";
import { checkBrandColorContrast } from "@/lib/a11y/contrast";
import { useToast } from "@/components/ui/toast";
import { ChatUI, type ChatUIBot } from "@/components/chat-widget/chat-ui";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormMessage } from "@/components/form-message";
import type { BotRow } from "@/lib/data/bots";
import type { AgentBuilderSummary } from "@/lib/data/agent-builder-summary";

const TONES = ["professional", "friendly", "playful", "formal", "empathetic"] as const;
const FALLBACKS = [
  { value: "escalate_email", label: "Escalate to email" },
  { value: "apologize_contact", label: "Apologize & point to support" },
  { value: "say_dont_know", label: "Say it doesn't know" },
] as const;

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "instructions", label: "Instructions", icon: FileText },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "security", label: "Security", icon: Shield },
  { id: "channels", label: "Channels", icon: Radio },
  { id: "evaluations", label: "Evaluations", icon: FlaskConical },
  { id: "deployment", label: "Deployment", icon: Rocket },
  { id: "versions", label: "Versions", icon: History },
] as const;

type TabId = (typeof TABS)[number]["id"];
// Tabs whose fields live inside the one shared <form> below — the rest
// are summary cards linking out to their existing full page, per-tab
// forms would mean either duplicating updateBot's logic per tab or
// firing a partial save on every tab switch, both worse than one save
// covering the tabs that are genuinely "editing" this record.
const FORM_TABS = new Set<TabId>(["overview", "instructions", "tools", "memory", "security"]);

function SummaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
      {label} <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

export function AgentBuilderShell({
  bot,
  updateAction,
  deleteAction,
  summary,
  formMessage,
}: {
  bot: BotRow;
  updateAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  summary: AgentBuilderSummary;
  formMessage?: { error?: string; success?: string };
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [systemPrompt, setSystemPrompt] = useState(bot.system_prompt);
  const [isPublished, setIsPublished] = useState(bot.status === "published");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState(bot.brand_color ?? "");
  const [publishing, setPublishing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const contrastWarning = brandColor ? checkBrandColorContrast(brandColor) : null;
  const agentConfigState = useAgentConfig(bot);
  const { showToast } = useToast();

  const latestVersion = summary.versions[0]?.versionNumber ?? null;
  const chatBot: ChatUIBot = {
    id: bot.id,
    name: bot.name,
    avatar: bot.avatar,
    brandColor: null, // builder preview always shows Chatbo's own purple, not a customer brand color still being tuned
    welcomeMessage: bot.welcome_message,
    starterQuestions: bot.starter_questions,
  };

  async function togglePublish() {
    setPublishError(null);
    setPublishing(true);
    const result = await setBotPublishStatus(bot.id, !isPublished);
    if (result.success) {
      setIsPublished(!isPublished);
      showToast("success", !isPublished ? "Agent published" : "Agent unpublished");
    } else {
      setPublishError(result.error ?? "Something went wrong.");
    }
    setPublishing(false);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* LEFT — navigation */}
      <nav aria-label="Agent builder sections" className="w-52 shrink-0 overflow-y-auto border-r border-mist bg-surface p-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                isActive ? "bg-signal text-ink" : "text-slate hover:bg-elevated hover:text-ink"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* CENTER — configuration */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between rounded-lg border border-mist bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">{isPublished ? "Published" : "Draft"}</p>
            <p className="text-xs text-slate">{isPublished ? "Live on the widget and share link." : "Only visible in the playground until published."}</p>
          </div>
          <Button variant={isPublished ? "secondary" : "primary"} size="sm" loading={publishing} onClick={togglePublish}>
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
        {publishError && <p className="-mt-3 mb-4 text-sm text-danger">{publishError}</p>}
        {formMessage && (formMessage.error || formMessage.success) && (
          <div className="mb-4">
            <FormMessage error={formMessage.error} success={formMessage.success} />
          </div>
        )}

        <form action={updateAction}>
          <div className={FORM_TABS.has(activeTab) ? "" : "hidden"}>
            <div className={activeTab === "overview" ? "flex flex-col gap-6" : "hidden"}>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Bot name
                <input type="text" name="name" defaultValue={bot.name} required maxLength={80} className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Welcome message
                <input type="text" name="welcomeMessage" defaultValue={bot.welcome_message ?? ""} required maxLength={200} className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Tone
                  <select name="tone" defaultValue={bot.tone} className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal">
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Widget position
                  <select name="widgetPosition" defaultValue={bot.widget_position} className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal">
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Brand color <span className="text-slate">(hex, optional)</span>
                <input
                  type="text" name="brandColor" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#C3F53C" pattern="^#[0-9a-fA-F]{6}$"
                  aria-invalid={contrastWarning ? "true" : undefined} aria-describedby={contrastWarning ? "brand-color-warning" : undefined}
                  className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal"
                />
                {contrastWarning && <p id="brand-color-warning" role="alert" className="text-xs text-danger">{contrastWarning}</p>}
              </label>
              <div className="border-t border-mist pt-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">What this agent is for</p>
                <AgentObjectiveFields {...agentConfigState} />
              </div>
            </div>

            <div className={activeTab === "instructions" ? "flex flex-col gap-6" : "hidden"}>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">System prompt (advanced editor)</label>
                <PromptEditor value={systemPrompt} onChange={setSystemPrompt} />
                <input type="hidden" name="systemPrompt" value={systemPrompt} />
              </div>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Starter questions <span className="text-slate">(one per line)</span>
                <textarea name="starterQuestions" rows={4} defaultValue={bot.starter_questions.join("\n")} className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Fallback behavior
                <select name="fallbackBehavior" defaultValue={bot.fallback_behavior} className="rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal">
                  {FALLBACKS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              <div className="border-t border-mist pt-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">Language, model, and additional rules</p>
                <AgentInstructionsFields {...agentConfigState} />
              </div>
            </div>

            <div className={activeTab === "tools" ? "" : "hidden"}>
              <AgentToolsFields bot={bot} state={agentConfigState} />
            </div>

            <div className={activeTab === "memory" ? "" : "hidden"}>
              <AgentMemoryFields {...agentConfigState} />
            </div>

            <div className={activeTab === "security" ? "" : "hidden"}>
              <AgentSecurityFields {...agentConfigState} />
            </div>

            <AgentConfigHiddenField config={agentConfigState.config} />
            <SubmitButton variant="primary" className="mt-6">Save changes</SubmitButton>
          </div>
        </form>

        {activeTab === "overview" && (
          <section className="mt-6 rounded-xl border border-danger-border bg-danger/5 p-4">
            <h3 className="mb-1 text-sm font-medium text-ink">Delete this agent</h3>
            <p className="mb-3 text-xs text-slate">
              Permanently deletes the agent, its knowledge base, and its conversation history. This can&rsquo;t be undone.
            </p>
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>Delete agent</Button>
          </section>
        )}

        <ConfirmModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => startDeleting(() => deleteAction(new FormData()))}
          title={`Delete "${bot.name}"?`}
          message="This permanently removes its knowledge base and conversation history and can't be undone."
          confirmLabel="Delete agent"
          pending={deleting}
        />

        {activeTab === "knowledge" && (
          <Card variant="primary">
            <CardEyebrow>Grounding</CardEyebrow>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Knowledge</h2>
            <div className="flex gap-6 text-sm">
              <div><p className="font-display text-2xl font-semibold text-ink">{summary.knowledge.total}</p><p className="text-xs text-slate">Sources</p></div>
              <div><p className="font-display text-2xl font-semibold text-success">{summary.knowledge.ready}</p><p className="text-xs text-slate">Ready</p></div>
              {summary.knowledge.failed > 0 && <div><p className="font-display text-2xl font-semibold text-danger">{summary.knowledge.failed}</p><p className="text-xs text-slate">Failed</p></div>}
            </div>
            <SummaryLink href={`/dashboard/bots/${bot.id}/knowledge`} label="Manage knowledge sources" />
          </Card>
        )}

        {activeTab === "channels" && (
          <Card variant="primary">
            <CardEyebrow>Deployment surfaces</CardEyebrow>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Channels</h2>
            {summary.channels.total === 0 ? (
              <p className="text-sm text-slate">Not connected to any channel yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {summary.channels.names.map((name) => <Badge key={name} tone="info">{name}</Badge>)}
              </div>
            )}
            <SummaryLink href={`/dashboard/bots/${bot.id}/channels`} label="Manage channels" />
          </Card>
        )}

        {activeTab === "evaluations" && (
          <Card variant="primary">
            <CardEyebrow>Quality</CardEyebrow>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Evaluations</h2>
            {summary.evaluations.lastStatus ? (
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-semibold text-ink">{summary.evaluations.lastScore}%</span>
                <Badge tone={summary.evaluations.lastStatus === "passed" ? "success" : "danger"}>{summary.evaluations.lastStatus}</Badge>
              </div>
            ) : (
              <p className="text-sm text-slate">No evaluation runs yet.</p>
            )}
            <SummaryLink href={`/dashboard/bots/${bot.id}/evals`} label="Run evaluations" />
          </Card>
        )}

        {activeTab === "deployment" && (
          <Card variant="primary">
            <CardEyebrow>Live status</CardEyebrow>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Deployment</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-slate">Staging</p><p className="mt-1 font-medium text-ink">{summary.deployment.stagingVersion ? `v${summary.deployment.stagingVersion}` : "Not deployed"}</p></div>
              <div><p className="text-xs text-slate">Production</p><p className="mt-1 font-medium text-ink">{summary.deployment.productionVersion ? `v${summary.deployment.productionVersion}` : "Not deployed"}</p></div>
            </div>
            <SummaryLink href={`/dashboard/bots/${bot.id}/deployment`} label="Manage deployment" />
          </Card>
        )}

        {activeTab === "versions" && (
          <Card variant="primary">
            <CardEyebrow>History</CardEyebrow>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Versions</h2>
            {summary.versions.length === 0 ? (
              <p className="text-sm text-slate">No saved versions yet.</p>
            ) : (
              <ul className="space-y-2">
                {summary.versions.map((v) => (
                  <li key={v.versionNumber} className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm">
                    <span className="font-mono text-ink">v{v.versionNumber}</span>
                    <span className="text-xs text-slate">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
            <SummaryLink href={`/dashboard/bots/${bot.id}/deployment`} label="Full version & rollback history" />
          </Card>
        )}
      </div>

      {/* RIGHT — persistent live preview */}
      <aside className="w-96 shrink-0 border-l border-mist">
        <ChatUI bot={chatBot} channel="playground" showBuilderChrome version={latestVersion} />
      </aside>
    </div>
  );
}
