export const dynamic = "force-static";

export default function HelpCenterPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-ink">
      <h1 className="mb-6 font-display text-2xl font-semibold">chatbo.ai Help Center</h1>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-lg font-semibold">What chatbo.ai is</h2>
        <p>
          chatbo.ai is a chatbot builder. You describe your business and pick a use case,
          tone, and fallback behavior, and chatbo.ai writes a first-draft system prompt for
          your bot. You add your own content — documents, pasted text, or a URL — and your
          bot answers questions using only that content, citing which source it used. If a
          question isn&rsquo;t covered by your content, the bot uses its configured fallback
          instead of guessing.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-lg font-semibold">How credits work</h2>
        <p className="mb-2">
          Every plan includes a monthly credit allotment that resets each billing period.
          Credits are spent per action:
        </p>
        <ul className="mb-2 list-disc pl-5">
          <li>Sending a message (widget, hosted share page, or the public API): 10 credits</li>
          <li>Ingesting a knowledge document or file: 40 credits</li>
          <li>Indexing a URL as a knowledge source: 40 credits</li>
          <li>Regenerating a bot&rsquo;s system prompt with AI assistance: 20 credits</li>
        </ul>
        <p className="mb-2">
          Creating a bot, publishing it, manual system prompt edits, exporting transcripts,
          and connecting a channel integration are all free.
        </p>
        <p>
          Plans: Free (2,500 credits/mo, 1 bot), Starter ($15/mo, 5,000 credits, 5 bots),
          Pro ($39/mo, 13,000 credits, 20 bots, workspace roles, read-only API access),
          Business ($89/mo, 31,000 credits, unlimited bots, audit logs, full API access,
          outbound webhooks, org-enforceable two-factor authentication). You can see your
          exact credit balance any time in the dashboard&rsquo;s top navigation bar, and your
          full usage breakdown on the Billing page.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-lg font-semibold">
          Embedding your bot on your website (including Squarespace)
        </h2>
        <p className="mb-2">
          Once a bot is published, go to its Publish page in the dashboard. You&rsquo;ll see a
          single line of code like:
        </p>
        <pre className="mb-2 overflow-x-auto rounded bg-paper p-3 text-xs">
{`<script src="https://your-domain.com/widget-loader.js" data-bot-id="YOUR_BOT_ID"></script>`}
        </pre>
        <p className="mb-2">
          <strong>On Squarespace specifically:</strong> go to Settings → Advanced → Code
          Injection, and paste the script tag into the Footer field. Save, and the chat
          bubble will appear on every page of your site within a minute or two (Squarespace
          caches pages, so a hard refresh may be needed to see it immediately). The same
          Footer Code Injection approach works for the widget on any Squarespace plan that
          supports code injection (Business plan and above).
        </p>
        <p>
          If you&rsquo;d rather not embed a floating widget, every bot also gets a hosted,
          full-page share link (also on the Publish page) that you can link to directly, plus
          a QR code for print materials.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-lg font-semibold">
          How your bot decides what to answer (grounding)
        </h2>
        <p>
          When someone asks your bot a question, chatbo.ai searches your knowledge base for
          the most relevant content and includes only that content when generating the
          answer — this is called retrieval-augmented generation, or RAG. If nothing in your
          knowledge base is relevant enough to the question, your bot uses its configured
          fallback (apologize and point to contact info, escalate to email, or say plainly
          that it doesn&rsquo;t know) instead of answering from general knowledge. This is
          intentional and can&rsquo;t be turned off — it&rsquo;s what keeps your bot from
          making things up.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-lg font-semibold">Workspace roles</h2>
        <p>
          Every workspace has four roles. <strong>Owner</strong> (the person who signed up)
          can manage billing and delete the workspace. <strong>Admin</strong> can manage
          members, API keys, webhooks, and view audit logs. <strong>Editor</strong> can
          create and edit bots but can&rsquo;t manage members or billing.{" "}
          <strong>Viewer</strong> has read-only access to bots and analytics. You can invite
          teammates and set their role from Settings — note that invites currently only work
          for people who already have a chatbo.ai account.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Billing and plan changes</h2>
        <p>
          Billing is handled through Paddle. You can upgrade your plan any time from the
          Billing page — your credit balance resets to the new plan&rsquo;s full monthly
          allotment immediately on upgrade. Downgrades currently require contacting support.
          If a payment fails, the workspace owner gets an email and an in-app notification;
          update your payment method from the Billing page to avoid any interruption.
        </p>
      </section>
    </main>
  );
}
