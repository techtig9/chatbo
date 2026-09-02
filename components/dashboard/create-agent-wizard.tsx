"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Check, BookOpen, Plug, MessageSquareText, Rocket, ExternalLink } from "lucide-react";
import { createBot, setBotPublishStatus } from "@/lib/actions/bots";
import { addTextSourceForWizard } from "@/lib/actions/knowledge";
import { ChatUI, type ChatUIBot } from "@/components/chat-widget/chat-ui";
import { Button } from "@/components/ui/button";

const STEPS = ["Basic Information", "Configure", "Knowledge", "Integrations", "Test", "Deploy"] as const;

const USE_CASES = [
  { value: "customer_support", label: "Customer Support", blurb: "Troubleshooting, orders, how-to questions" },
  { value: "lead_gen", label: "Sales & Leads", blurb: "Qualify visitors, gather info, drive next steps" },
  { value: "faq", label: "Knowledge Assistant", blurb: "Answer questions from trusted business content" },
  { value: "internal_docs", label: "Internal Operations", blurb: "Help your team find and use company knowledge" },
  { value: "sales_assistant", label: "Sales Assistant", blurb: "Guide prospects toward a purchase decision" },
] as const;

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "playful", label: "Playful" },
  { value: "formal", label: "Formal" },
  { value: "empathetic", label: "Empathetic" },
] as const;

const FALLBACKS = [
  { value: "escalate_email", label: "Escalate to a human" },
  { value: "apologize_contact", label: "Apologize and point to support" },
  { value: "say_dont_know", label: "Say clearly that it doesn't know" },
] as const;

const FEATURED_INTEGRATIONS = [
  { key: "slack", name: "Slack", description: "Send messages and automate team workflows." },
  { key: "google_workspace", name: "Google Workspace", description: "Connect Gmail, Drive and Calendar workflows." },
  { key: "notion", name: "Notion", description: "Search and update workspace knowledge." },
  { key: "zendesk", name: "Zendesk", description: "Create and manage customer support tickets." },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isCurrent = stepNum === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  isDone ? "bg-signal text-ink" : isCurrent ? "bg-signal/15 text-ink ring-2 ring-signal" : "bg-elevated text-slate"
                }`}
              >
                {isDone ? <Check size={14} aria-hidden="true" /> : stepNum}
              </span>
              <span className={`hidden text-center text-[10px] font-medium sm:block ${isCurrent ? "text-ink" : "text-slate"}`}>{label}</span>
            </div>
            {stepNum < STEPS.length && <div className={`mx-2 h-px flex-1 ${isDone ? "bg-signal" : "bg-mist"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export function CreateAgentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  // Step 2
  const [useCase, setUseCase] = useState<string>("customer_support");
  const [tone, setTone] = useState<string>("friendly");
  const [fallbackBehavior, setFallbackBehavior] = useState<string>("apologize_contact");

  const [creating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [bot, setBot] = useState<{ id: string; welcomeMessage: string; starterQuestions: string[] } | null>(null);

  // Step 3
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [addingKnowledge, startAddingKnowledge] = useTransition();
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [addedSources, setAddedSources] = useState<string[]>([]);

  // Step 6
  const [publishing, startPublishing] = useTransition();
  const [published, setPublished] = useState(false);

  const step1Valid = name.trim().length > 0 && businessContext.trim().length > 0;

  const chatBot: ChatUIBot | null = useMemo(
    () => (bot ? { id: bot.id, name: name || "Your agent", avatar: null, brandColor: null, welcomeMessage: bot.welcomeMessage, starterQuestions: bot.starterQuestions } : null),
    [bot, name]
  );

  function handleGenerate() {
    setCreateError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("businessContext", businessContext);
    formData.set("useCase", useCase);
    formData.set("tone", tone);
    formData.set("fallbackBehavior", fallbackBehavior);
    startCreating(async () => {
      const result = await createBot(formData);
      if (!result.success || !result.botId) {
        setCreateError(result.error ?? "Something went wrong generating your agent.");
        return;
      }
      setBot({ id: result.botId, welcomeMessage: result.welcomeMessage ?? "", starterQuestions: result.starterQuestions ?? [] });
      setStep(3);
    });
  }

  function handleAddKnowledge() {
    if (!bot || !knowledgeTitle.trim() || !knowledgeContent.trim()) return;
    setKnowledgeError(null);
    startAddingKnowledge(async () => {
      const result = await addTextSourceForWizard(bot.id, knowledgeTitle, knowledgeContent);
      if (!result.success) {
        setKnowledgeError(result.error ?? "Couldn't add that source.");
        return;
      }
      setAddedSources((prev) => [...prev, knowledgeTitle]);
      setKnowledgeTitle("");
      setKnowledgeContent("");
    });
  }

  function handlePublish() {
    if (!bot) return;
    startPublishing(async () => {
      const result = await setBotPublishStatus(bot.id, true);
      if (result.success) setPublished(true);
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <Link href="/dashboard/bots" className="mb-7 inline-flex items-center gap-1.5 text-sm text-slate hover:text-ink">
        <ArrowLeft size={14} /> Back to agents
      </Link>

      <StepIndicator current={step} />

      {step === 1 && (
        <section className="rounded-2xl border border-mist bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Step 1 of 6</p>
              <h1 className="mt-1 font-display text-2xl font-semibold">Basic Information</h1>
              <p className="mt-1 text-xs text-slate">The more context you provide, the better the first draft.</p>
            </div>
            <Sparkles size={18} className="text-ink" aria-hidden="true" />
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-ink">
            Agent name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Acme Support Agent"
              className="rounded-xl border border-mist bg-paper px-3.5 py-3 text-sm text-ink outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/10"
            />
          </label>

          <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-ink">
            What should it do?
            <textarea
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              maxLength={2000}
              rows={7}
              placeholder="Example: Build a customer-support agent for my online clothing store. It should answer product questions, check order status, explain returns, recommend products when appropriate, and hand difficult cases to my support team."
              className="rounded-xl border border-signal bg-paper px-3.5 py-3 text-sm leading-6 text-ink outline-none transition focus:ring-2 focus:ring-signal/10"
            />
            <span className="text-xs font-normal text-slate">Describe the role, customers, tasks, rules, and any important business context.</span>
          </label>

          <div className="mt-6 flex justify-end sticky bottom-16 left-0 right-0 -mx-5 border-t border-mist bg-surface px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-0">
            <Button variant="primary" disabled={!step1Valid} onClick={() => setStep(2)}>
              Next <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-mist bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Step 2 of 6</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Configure</h1>
          <p className="mt-1 text-xs text-slate">These choices help the AI generate a useful first version.</p>

          {createError && (
            <p className="mt-4 rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-ink">{createError}</p>
          )}

          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-medium text-ink">Primary use case</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {USE_CASES.map((uc) => (
                <label key={uc.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${useCase === uc.value ? "border-signal bg-signal/5" : "border-mist"}`}>
                  <input type="radio" name="useCase" value={uc.value} checked={useCase === uc.value} onChange={() => setUseCase(uc.value)} className="mt-1 bg-surface text-ink" />
                  <span><span className="block text-sm font-medium text-ink">{uc.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate">{uc.blurb}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-medium text-ink">Tone</legend>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <label key={t.value} className={`cursor-pointer rounded-full border px-3.5 py-2 text-xs font-medium transition ${tone === t.value ? "border-signal bg-signal-soft text-ink" : "border-mist text-ink"}`}>
                  <input type="radio" name="tone" value={t.value} checked={tone === t.value} onChange={() => setTone(t.value)} className="sr-only" />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-medium text-ink">When it doesn&apos;t know</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {FALLBACKS.map((f) => (
                <label key={f.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs text-ink transition ${fallbackBehavior === f.value ? "border-signal bg-signal/5" : "border-mist"}`}>
                  <input type="radio" name="fallbackBehavior" value={f.value} checked={fallbackBehavior === f.value} onChange={() => setFallbackBehavior(f.value)} />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-7 flex items-center justify-between sticky bottom-16 left-0 right-0 -mx-5 border-t border-mist bg-surface px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-0">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-slate hover:text-ink">Back</button>
            <Button variant="primary" loading={creating} onClick={handleGenerate}>
              {!creating && <Sparkles size={15} aria-hidden="true" />} Generate agent
            </Button>
          </div>
        </section>
      )}

      {step === 3 && bot && (
        <section className="rounded-2xl border border-mist bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-soft text-ink"><BookOpen size={20} aria-hidden="true" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">Step 3 of 6</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Knowledge</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate">
            Give your agent something to ground its answers in. Paste a snippet now — an FAQ, a policy, a product blurb —
            or add files and URLs later from the Knowledge page.
          </p>

          {addedSources.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {addedSources.map((title, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success-ink">
                  <Check size={14} aria-hidden="true" /> {title}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-xl border border-mist bg-paper p-4">
            {knowledgeError && <p className="mb-3 text-xs text-danger">{knowledgeError}</p>}
            <input
              type="text"
              value={knowledgeTitle}
              onChange={(e) => setKnowledgeTitle(e.target.value)}
              placeholder="Title — e.g. Return policy"
              className="w-full rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal"
            />
            <textarea
              value={knowledgeContent}
              onChange={(e) => setKnowledgeContent(e.target.value)}
              rows={4}
              placeholder="Paste the content here..."
              className="mt-2 w-full rounded-lg border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-signal"
            />
            <div className="mt-2 flex justify-end">
              <Button variant="secondary" size="sm" loading={addingKnowledge} disabled={!knowledgeTitle.trim() || !knowledgeContent.trim()} onClick={handleAddKnowledge}>
                Add source
              </Button>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between sticky bottom-16 left-0 right-0 -mx-5 border-t border-mist bg-surface px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-0">
            <button type="button" onClick={() => setStep(2)} className="text-sm text-slate hover:text-ink">Back</button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep(4)} className="text-sm text-slate hover:text-ink">Skip for now</button>
              <Button variant="primary" onClick={() => setStep(4)}>Next <ArrowRight size={15} aria-hidden="true" /></Button>
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-mist bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-soft text-ink"><Plug size={20} aria-hidden="true" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">Step 4 of 6</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Integrations</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate">
            Connect the tools your agent should read from or act on. This opens in a new tab so you don&apos;t lose your place here.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FEATURED_INTEGRATIONS.map((integration) => (
              <a
                key={integration.key}
                href={`/api/integrations/connect?provider=${integration.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-3 rounded-xl border border-mist p-4 transition hover:border-signal/40 hover:bg-elevated"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{integration.name}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate">{integration.description}</p>
                </div>
                <ExternalLink size={14} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
              </a>
            ))}
          </div>
          <Link href="/dashboard/integrations" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-ink hover:underline">
            See all integrations
          </Link>

          <div className="mt-7 flex items-center justify-between sticky bottom-16 left-0 right-0 -mx-5 border-t border-mist bg-surface px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-0">
            <button type="button" onClick={() => setStep(3)} className="text-sm text-slate hover:text-ink">Back</button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep(5)} className="text-sm text-slate hover:text-ink">Skip for now</button>
              <Button variant="primary" onClick={() => setStep(5)}>Next <ArrowRight size={15} aria-hidden="true" /></Button>
            </div>
          </div>
        </section>
      )}

      {step === 5 && chatBot && (
        <section className="rounded-2xl border border-mist bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-soft text-ink"><MessageSquareText size={20} aria-hidden="true" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">Step 5 of 6</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Test</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate">
            Try a real conversation before anyone else can. This works even in draft status.
          </p>

          <div className="mt-5 h-[420px] overflow-hidden rounded-xl border border-mist">
            <ChatUI bot={chatBot} channel="playground" />
          </div>

          <div className="mt-7 flex items-center justify-between sticky bottom-16 left-0 right-0 -mx-5 border-t border-mist bg-surface px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-0">
            <button type="button" onClick={() => setStep(4)} className="text-sm text-slate hover:text-ink">Back</button>
            <Button variant="primary" onClick={() => setStep(6)}>Next <ArrowRight size={15} aria-hidden="true" /></Button>
          </div>
        </section>
      )}

      {step === 6 && bot && (
        <section className="rounded-2xl border border-mist bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-soft text-ink"><Rocket size={20} aria-hidden="true" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">Step 6 of 6</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Deploy</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate">
            {published
              ? "Your agent is live. You can connect more channels, refine its knowledge, or keep testing from its detail page."
              : "Publishing makes this agent reachable wherever you deploy it (widget, API, or a connected channel). You can also stay in draft and publish later."}
          </p>

          {published ? (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm text-success-ink">
              <Check size={16} aria-hidden="true" /> Published
            </div>
          ) : (
            <div className="mt-5">
              <Button variant="primary" loading={publishing} onClick={handlePublish}>
                <Rocket size={15} aria-hidden="true" /> Publish agent
              </Button>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between border-t border-mist pt-5 sticky bottom-16 left-0 right-0 -mx-5 border-t border-mist bg-surface px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-0">
            <button type="button" onClick={() => setStep(5)} className="text-sm text-slate hover:text-ink">Back</button>
            <Button variant="primary" onClick={() => router.push(`/dashboard/bots/${bot.id}/edit`)}>
              Finish setup <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
