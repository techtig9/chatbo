import { Inngest } from "inngest";

/**
 * One client, imported by every function definition and by the serve()
 * route. Without INNGEST_EVENT_KEY/SIGNING_KEY set, this still works
 * for local dev against the Inngest Dev Server (`npx inngest-cli dev`)
 * — those keys are only required for the real Inngest Cloud connection,
 * matching the honest "works locally, needs real credentials for the
 * hosted service" pattern used throughout this build.
 */
export const inngest = new Inngest({ id: "chatbo-ai" });
