export interface EmailContent {
  subject: string;
  html: string;
}

// #5C7A0A, not the brand's #1FA6A0 signal teal — the signal color
// measures ~2.99:1 contrast against white (fails WCAG AA even for large
// text; see lib/a11y/contrast.ts's test suite). #5C7A0A is the same hue
// family, darkened to ~6.35:1, comfortably past the 4.5:1 floor for
// normal text. Fixed in Phase 1.22 — flagged but deliberately left
// unfixed in Phase 1.18 since the widget default (much higher-traffic,
// much larger blocks of affected text) was the more urgent fix at the
// time.
function wrapper(bodyHtml: string): string {
  return `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #0C0D09;">
    <p style="font-weight: 600; font-size: 18px; margin-bottom: 16px;">chatbo<span style="color:#5C7A0A">.ai</span></p>
    ${bodyHtml}
  </div>`;
}

export function lowCreditWarningEmail(params: {
  workspaceName: string;
  percentUsed: 80 | 100;
  creditsRemaining: number;
}): EmailContent {
  const isExhausted = params.percentUsed === 100;
  const subject = isExhausted
    ? `${params.workspaceName} has run out of credits`
    : `${params.workspaceName} has used 80% of its credits`;

  const html = wrapper(`
    <p>${
      isExhausted
        ? `Your workspace <strong>${params.workspaceName}</strong> has used all of its credits for this billing period. New messages will be blocked until you upgrade or your credits renew.`
        : `Your workspace <strong>${params.workspaceName}</strong> has used 80% of its monthly credits. ${params.creditsRemaining.toLocaleString()} credits remaining.`
    }</p>
    <p><a href="https://chatbo.ai/dashboard/billing" style="color:#5C7A0A;">Review your plan</a></p>
  `);

  return { subject, html };
}

export function paymentFailedEmail(params: { workspaceName: string }): EmailContent {
  return {
    subject: `Payment failed for ${params.workspaceName}`,
    html: wrapper(`
      <p>We couldn't process the latest payment for <strong>${params.workspaceName}</strong>. Please update your payment method to avoid any interruption.</p>
      <p><a href="https://chatbo.ai/dashboard/billing" style="color:#5C7A0A;">Update payment method</a></p>
    `),
  };
}

export function subscriptionCanceledEmail(params: { workspaceName: string; accessUntil: string | null }): EmailContent {
  return {
    subject: `Your ${params.workspaceName} subscription has been canceled`,
    html: wrapper(`
      <p>The subscription for <strong>${params.workspaceName}</strong> has been canceled.${
        params.accessUntil
          ? ` You'll keep access to your current plan until <strong>${new Date(params.accessUntil).toLocaleDateString()}</strong>, after which the workspace will move to the free plan.`
          : " The workspace will move to the free plan at the end of the current billing period."
      }</p>
      <p><a href="https://chatbo.ai/dashboard/billing" style="color:#5C7A0A;">Resubscribe anytime</a></p>
    `),
  };
}

export function invitationAcceptedEmail(params: { workspaceName: string; memberEmail: string }): EmailContent {
  return {
    subject: `${params.memberEmail} joined ${params.workspaceName}`,
    html: wrapper(`
      <p><strong>${params.memberEmail}</strong> accepted their invitation and is now a member of <strong>${params.workspaceName}</strong>.</p>
      <p><a href="https://chatbo.ai/dashboard/settings" style="color:#5C7A0A;">Manage team</a></p>
    `),
  };
}

export function welcomeEmail(params: { name: string | null; workspaceName: string }): EmailContent {
  return {
    subject: "Welcome to chatbo.ai",
    html: wrapper(`
      <p>Hi${params.name ? ` ${params.name}` : ""}, welcome to chatbo.ai — your workspace <strong>${params.workspaceName}</strong> is ready.</p>
      <p>Create an AI agent, connect a knowledge source, and deploy it to your website or a channel in a few minutes.</p>
      <p><a href="https://chatbo.ai/dashboard/bots/new" style="color:#5C7A0A;">Create your first agent</a></p>
    `),
  };
}

export function teamInviteEmail(params: {
  workspaceName: string;
  inviterName: string;
  role: string;
}): EmailContent {
  return {
    subject: `${params.inviterName} invited you to ${params.workspaceName} on chatbo.ai`,
    html: wrapper(`
      <p><strong>${params.inviterName}</strong> invited you to join <strong>${params.workspaceName}</strong> as ${
      /^[aeiou]/i.test(params.role) ? "an" : "a"
    } <strong>${params.role}</strong>.</p>
      <p><a href="https://chatbo.ai/dashboard/invites" style="color:#5C7A0A;">View invite</a></p>
    `),
  };
}

export function weeklyDigestEmail(params: {
  workspaceName: string;
  conversationCount: number;
  messageCount: number;
  creditsRemaining: number;
}): EmailContent {
  return {
    subject: `Your week on chatbo.ai: ${params.conversationCount} conversation${params.conversationCount === 1 ? "" : "s"}`,
    html: wrapper(`
      <p>Here's what happened in <strong>${params.workspaceName}</strong> this week:</p>
      <ul>
        <li>${params.conversationCount} conversation${params.conversationCount === 1 ? "" : "s"}</li>
        <li>${params.messageCount} message${params.messageCount === 1 ? "" : "s"} exchanged</li>
        <li>${params.creditsRemaining.toLocaleString()} credits remaining</li>
      </ul>
      <p><a href="https://chatbo.ai/dashboard/conversations" style="color:#5C7A0A;">View conversations</a></p>
    `),
  };
}
