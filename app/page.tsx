import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  Code2,
  GitBranch,
  Headphones,
  KeyRound,
  Lock,
  MessageSquareText,
  Network,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Wrench,
  Workflow,
  Zap,
} from "lucide-react";
import { LogoMark } from "@/components/branding/logo";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import { PLAN_PRICES_USD, PLAN_LIMITS } from "@/lib/billing/plans";

const NAV_LINKS = [
  ["Product", "#product"],
  ["Solutions", "#solutions"],
  ["Integrations", "#integrations"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
] as const;

// "Why Chatbo" — the product's actual value props, distinct from the
// use-case grid below (which is about *who* it's for, not *why* it
// works). Framing kept close to what genuinely differentiates the
// product: grounded answers, real tool access, human oversight, and
// numbers that were tracked from day one rather than bolted on later.
const WHY_CHATBO = [
  { icon: BrainCircuit, title: "Grounded", text: "Answers come from your own knowledge — files, a URL, or a full site crawl — not a guess." },
  { icon: Wrench, title: "Connected", text: "Agents use real tools and OAuth-connected accounts, scoped per agent, never blanket access." },
  { icon: UserCheck, title: "Controlled", text: "Route sensitive actions through human approval before anything actually executes." },
  { icon: TrendingUp, title: "Measurable", text: "Success rate, latency, fallback rate, and cost — tracked per agent from the first conversation." },
];

const USE_CASES = [
  { icon: Headphones, title: "Customer support", text: "Answer questions, resolve issues, and hand complex conversations to your team." },
  { icon: MessageSquareText, title: "Sales & lead qualification", text: "Qualify prospects, recommend next steps, and capture leads automatically." },
  { icon: BrainCircuit, title: "Knowledge assistant", text: "Turn your documents, website, and internal knowledge into an always-available expert." },
  { icon: Workflow, title: "Business automation", text: "Connect tools and let agents complete real tasks instead of only sending replies." },
  { icon: Code2, title: "Developer agents", text: "Build coding, research, documentation, and API-powered assistants." },
  { icon: Sparkles, title: "Something custom", text: "Describe any job or workflow and start with an agent designed around it." },
];

const STEPS = [
  ["01", "Describe it", "Tell chatbo what you want your agent to do in plain language."],
  ["02", "AI builds it", "chatbo turns your description into instructions, capabilities, knowledge needs, and a testable agent."],
  ["03", "Connect & test", "Add your knowledge and tools, then test real conversations before going live."],
  ["04", "Deploy & improve", "Publish anywhere, monitor performance, and continuously improve your agent."],
];

// The 8-capability tour — each links to the exact real page it
// describes, so the claim and the product can never quietly drift
// apart the way a purely illustrative marketing page's claims can.
const CAPABILITIES = [
  { icon: Sparkles, eyebrow: "Describe it", title: "Start from a sentence, not a blank canvas.", text: "Describe the job in plain language and chatbo drafts the instructions, knowledge needs, and tools for a working first version — refine anything afterward.", href: "/signup" },
  { icon: BrainCircuit, eyebrow: "Knowledge & RAG", title: "Answers grounded in what you actually know.", text: "Upload files, paste text, index a URL, or crawl a whole site. Agents answer from your content and cite what they used, not a hallucinated guess.", href: "/dashboard/knowledge" },
  { icon: Wrench, eyebrow: "Tools & integrations", title: "Agents that do things, not just describe them.", text: "Connect Slack, Stripe, HubSpot, Salesforce, and more with OAuth — grant each agent only the specific accounts and scopes it needs.", href: "/dashboard/integrations" },
  { icon: GitBranch, eyebrow: "Visual workflows", title: "Chain steps on a real drag-and-drop canvas.", text: "Combine agents, knowledge lookups, tools, conditions, and human approvals into a workflow you can see and edit visually.", href: "/dashboard/workflows" },
  { icon: Network, eyebrow: "Multi-agent", title: "One supervisor, many specialists.", text: "Connect specialist agents to a supervisor and let it delegate bounded tasks to the right one automatically.", href: "/dashboard/multi-agent" },
  { icon: UserCheck, eyebrow: "Human-in-the-loop", title: "Keep a person in the loop where it matters.", text: "Route sensitive or high-stakes actions through explicit human approval before anything actually executes.", href: "/dashboard/approvals" },
  { icon: Target, eyebrow: "Evaluate & improve", title: "Know what's working before customers tell you.", text: "Score task success, groundedness, tool use, and safety with test suites you control — not a black box.", href: "/dashboard/evaluations" },
  { icon: Radio, eyebrow: "Deploy anywhere", title: "Your site, an API, or a share link.", text: "Publish to a website widget, call it through the public API, or share a link — with usage, cost, and quality tracked from day one.", href: "/dashboard/channels" },
];

const BENEFITS = [
  ["Faster setup", "Minutes to a working agent, not weeks of prompt engineering."],
  ["Better answers", "Grounded in your own content instead of the model's best guess."],
  ["Real actions", "Tools and integrations mean agents finish tasks, not just describe them."],
  ["Safer automation", "Human approval gates the actions that actually need a person."],
  ["More visibility", "Every conversation, cost, and failure is tracked, not invisible."],
  ["More channels", "One agent, deployed to your site, your API, and a share link."],
];

// Product tour — workflow / knowledge / analytics / multi-agent
// previews, each linking to the real page it describes.
const PRODUCT_TOUR = [
  { icon: GitBranch, title: "Visual workflows", text: "Chain agents, knowledge lookups, tools, conditions, and human approvals on a drag-and-drop canvas.", href: "/dashboard/workflows" },
  { icon: BrainCircuit, title: "Grounded knowledge", text: "Upload files, paste text, index a URL, or crawl a whole site — agents answer from your content, not guesses.", href: "/dashboard/knowledge" },
  { icon: TrendingUp, title: "Real analytics", text: "Conversations, users, success rate, latency, fallback rate, and cost — tracked from day one, not bolted on later.", href: "/dashboard/analytics" },
  { icon: Network, title: "Multi-agent orchestration", text: "Connect specialist agents to a supervisor and let them delegate bounded tasks to each other.", href: "/dashboard/multi-agent" },
];

const FEATURES = [
  "Create agents from a plain-language description",
  "Ground answers in your own knowledge",
  "Give agents tools and integrations",
  "Test before publishing",
  "Deploy to your website or through an API",
  "Monitor conversations, usage, and quality",
];

// Only providers actually in the integration catalog — never a wishlist.
const FEATURED_INTEGRATIONS = INTEGRATION_CATALOG.slice(0, 8);

const SECURITY_POINTS = [
  { icon: Lock, title: "Encrypted credentials", text: "OAuth tokens and API keys are encrypted at rest and never sent to the browser." },
  { icon: ShieldCheck, title: "Prompt-injection defenses", text: "Runtime guardrails screen for injection and secret-exfiltration patterns before they reach the model." },
  { icon: KeyRound, title: "Workspace-scoped access", text: "Row-level security keeps every workspace's agents, conversations, and data isolated from every other." },
];

const FAQS = [
  { q: "Do I need to write prompts or know AI to get started?", a: "No — describe the job in plain language and chatbo generates the first version of the instructions, knowledge setup, and tools. You can refine everything afterward in the agent builder." },
  { q: "What happens if I run out of credits?", a: "Each plan includes a monthly credit allowance for AI usage. If you run low, you can upgrade at any time from the Billing page — nothing is charged automatically beyond your plan." },
  { q: "Can I connect the tools my business already uses?", a: "Yes — chatbo supports OAuth connections to Slack, Stripe, HubSpot, Salesforce, and more, with per-agent permissions so you control exactly which agent can use which account." },
  { q: "Can I test an agent before it's live?", a: "Every agent has a built-in playground for testing, and you control publishing separately — nothing is customer-facing until you explicitly publish it." },
  { q: "Is my data used to train models for other customers?", a: "No — your knowledge sources and conversations are scoped to your workspace and used only to power your own agents." },
];

const FOOTER_COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [["Solutions", "#solutions"], ["Integrations", "#integrations"], ["Pricing", "/pricing"], ["Security", "#security"]] },
  { title: "Resources", links: [["Developer docs", "/developers"], ["Help center", "/help"], ["FAQ", "#faq"]] },
  { title: "Company", links: [["Log in", "/login"], ["Get started", "/signup"]] },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-mist/80 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <LogoMark size={24} />
            chat<span className="text-ink">bo</span>.ai
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate md:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a key={label} href={href} className="transition hover:text-ink">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate hover:bg-surface sm:inline-flex">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink shadow-glow-sm transition hover:-translate-y-0.5 hover:brightness-105">
              Get started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_50%_10%,rgba(195,245,60,0.16),transparent_55%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal-soft px-3 py-1.5 text-xs font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              AI AGENT PLATFORM
            </div>
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Build AI agents
              <span className="block">that actually work.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate sm:text-xl">
              Describe the job in plain language. Chatbo builds an agent grounded in your
              own knowledge, connected to your real tools, and ready to test before it
              ever talks to a customer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-ink shadow-glow-sm transition hover:-translate-y-0.5 hover:brightness-105">
                Start Building Free <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="#product" className="inline-flex items-center justify-center gap-2 rounded-xl border border-mist bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:border-signal">
                Explore Agents <ChevronRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate">
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-ink" aria-hidden="true" /> Free to start, no credit card</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-ink" aria-hidden="true" /> Test before publishing</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-ink" aria-hidden="true" /> Deploy on your site</span>
            </div>
          </div>

          {/* Illustrative product preview — a browser-frame mockup of the
             real dashboard shape, not a screenshot; every value shown is
             a plausible example, not a live number. */}
          <div className="relative">
            <div className="rounded-3xl border border-mist bg-surface p-3 shadow-2xl shadow-ink/10">
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <span className="h-2.5 w-2.5 rounded-full bg-mist" /><span className="h-2.5 w-2.5 rounded-full bg-mist" /><span className="h-2.5 w-2.5 rounded-full bg-mist" />
                <span className="ml-2 text-[11px] text-muted">chatbo.ai/dashboard</span>
              </div>
              <div className="grid grid-cols-[auto_1fr] overflow-hidden rounded-2xl border border-mist bg-paper">
                <div className="hidden w-32 shrink-0 space-y-1 border-r border-mist bg-surface p-3 sm:block">
                  {["Home", "Agents", "Knowledge", "Analytics"].map((item, i) => (
                    <div key={item} className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${i === 1 ? "bg-signal text-ink" : "text-slate"}`}>{item}</div>
                  ))}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Customer Support Agent</p>
                      <p className="mt-1 font-display text-base font-semibold">Status: Ready</p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal/15 text-ink"><Bot size={16} aria-hidden="true" /></span>
                  </div>
                  <div className="mt-3 rounded-xl border border-signal bg-surface p-3 text-xs leading-5 text-ink shadow-sm">
                    Answer product questions, check orders, explain returns, and hand difficult cases to my team.
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-mist bg-surface px-2 py-2"><p className="text-[10px] text-slate">Knowledge</p><p className="text-xs font-semibold text-ink">42 sources</p></div>
                    <div className="rounded-lg border border-mist bg-surface px-2 py-2"><p className="text-[10px] text-slate">Tools</p><p className="text-xs font-semibold text-ink">5 connected</p></div>
                    <div className="rounded-lg border border-mist bg-surface px-2 py-2"><p className="text-[10px] text-slate">Quality</p><p className="text-xs font-semibold text-ink">94%</p></div>
                  </div>
                  <div className="mt-3 rounded-xl bg-ink p-3 text-paper">
                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                      <Sparkles size={12} className="text-signal" aria-hidden="true" /> 1,284 conversations this month
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted">Illustrative preview — not live data</p>
            <div className="absolute -bottom-3 -left-4 hidden rounded-xl border border-mist bg-surface px-4 py-3 shadow-xl sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate">Workflow</p>
              <p className="mt-1 text-xs font-semibold">Understand → retrieve → act</p>
            </div>
          </div>
        </div>
      </section>

      {/* "Trusted by" — no fabricated customer logos on a new platform;
         the honest version of this section is the real infrastructure
         actually powering it. */}
      <section className="border-y border-mist bg-surface/50 py-8">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate">Built on a production AI provider stack</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-semibold text-slate/70">
            <span>Groq</span><span>Cerebras</span><span>OpenRouter</span><span>Anthropic Claude</span><span>Google Gemini</span>
          </div>
        </div>
      </section>

      {/* Why Chatbo */}
      <section className="border-b border-mist">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Why chatbo</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Not just another chat window.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CHATBO.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-mist bg-surface p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/15 text-ink">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="border-b border-mist bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">One platform</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              One agent platform. Almost any use case.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate">
              Start from a template or describe a completely custom role. The same
              platform handles knowledge, tools, conversations, deployment, and analytics.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group rounded-2xl border border-mist bg-paper p-6 transition hover:-translate-y-1 hover:border-signal/50 hover:shadow-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/15 text-ink">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">How it works</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                From idea to deployed agent in a few clear steps.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate">
                No need to understand prompts, vector databases, tool schemas, or model
                routing before you can build something useful.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {STEPS.map(([number, title, text]) => (
                <div key={number} className="rounded-2xl border border-mist bg-surface p-6">
                  <span className="font-mono text-xs font-medium text-ink">{number}</span>
                  <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8-capability tour — large alternating sections, each linking to
         the real page it describes. */}
      <section id="product" className="border-y border-mist bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Under the hood</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything a production agent needs, built in.
            </h2>
          </div>
          <div className="space-y-10">
            {CAPABILITIES.map(({ icon: Icon, eyebrow, title, text, href }, i) => (
              <div key={eyebrow} className={`grid items-center gap-8 rounded-2xl border border-mist bg-paper p-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal/15 text-ink">
                    <Icon size={21} aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink">{eyebrow}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate">{text}</p>
                  <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-ink">
                    See it in the product <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-mist bg-surface text-slate">
                  <Icon size={40} aria-hidden="true" className="opacity-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-mist bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal">Built for real work</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Chat is only the interface. Your agent can actually do things.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-paper/65">
              Give agents reliable knowledge, controlled tools, memory, workflows, and
              deployment options. Keep people in the loop when a task needs a human.
            </p>
          </div>
          <div className="grid gap-3">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal/20 text-signal">
                  <Check size={14} aria-hidden="true" />
                </span>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Short benefit cards — the "so what" version of the capability tour above. */}
      <section>
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">The payoff</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">What actually changes for you.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-mist bg-surface p-6">
                <Check size={18} className="text-ink" aria-hidden="true" />
                <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product tour — smaller, focused re-cap linking straight into the real product. */}
      <section className="border-y border-mist bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">See it for yourself</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Open any of these straight from your dashboard.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PRODUCT_TOUR.map(({ icon: Icon, title, text, href }) => (
              <Link key={title} href={href} className="group rounded-2xl border border-mist bg-paper p-6 transition hover:border-signal/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/15 text-ink">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink group-hover:text-ink">Open <ArrowRight size={12} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations — real catalog entries only. */}
      <section id="integrations">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Integrations</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Connect the software your business already uses.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate">
              Grant individual agents only the integrations and scopes they need — never blanket access.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FEATURED_INTEGRATIONS.map((integration) => (
              <div key={integration.key} className="rounded-xl border border-mist bg-surface px-4 py-4 text-center">
                <p className="text-sm font-semibold text-ink">{integration.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-y border-mist bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Security</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built with workspace isolation and least-privilege access.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {SECURITY_POINTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-mist bg-paper p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/15 text-ink">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Start simple</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Build your first agent before you overthink it.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate">
            Free to start — {PLAN_LIMITS.free.monthlyCredits.toLocaleString()} credits/mo, no credit card. Paid plans start at ${PLAN_PRICES_USD.starter}/month.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-semibold text-ink shadow-glow-sm hover:brightness-105">
              Get started free <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-mist bg-surface px-6 py-3 text-sm font-semibold text-ink hover:border-signal">
              See full pricing
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-mist bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Questions</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-mist bg-paper p-5 open:border-signal/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-ink">
                  {q}
                  <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — distinct from the pricing section above. */}
      <section className="relative overflow-hidden border-t border-mist bg-ink text-paper">
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_50%_0%,rgba(195,245,60,0.16),transparent_60%)]" />
        <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <Zap size={28} className="mx-auto text-signal" aria-hidden="true" />
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ready to build your first agent?</h2>
          <p className="mx-auto mt-4 max-w-xl text-paper/65">Describe the job, and chatbo builds the first version for you — free to start, no credit card required.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-semibold text-ink shadow-glow-sm transition hover:brightness-105">
              Get Started Free <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a href="mailto:sales@chatbo.ai?subject=Demo%20Request" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-paper hover:bg-white/5">
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      {/* Multi-column footer */}
      <footer className="border-t border-mist bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="flex items-center gap-2 font-display font-semibold text-ink">
                <LogoMark size={20} /> chat<span className="text-ink">bo</span>.ai
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate">Build useful AI, not just another chat window.</p>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}><Link href={href} className="text-sm text-slate hover:text-ink">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-mist pt-6 text-xs text-slate">
            © {new Date().getFullYear()} chatbo.ai
          </div>
        </div>
      </footer>
    </main>
  );
}
