"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Paddle?: {
      Setup: (opts: { token: string }) => void;
      Checkout: { open: (opts: Record<string, unknown>) => void };
    };
  }
}

let paddleScriptPromise: Promise<void> | null = null;

function loadPaddleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Paddle) return Promise.resolve();
  if (paddleScriptPromise) return paddleScriptPromise;

  paddleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.head.appendChild(script);
  });

  return paddleScriptPromise;
}

export function CheckoutButton({
  priceId,
  planLabel,
  workspaceId,
  email,
  clientToken,
  environment,
}: {
  priceId: string;
  planLabel: string;
  workspaceId: string;
  email: string;
  clientToken: string;
  environment: "sandbox" | "production";
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaddleScript().catch(() => setError("Couldn't load checkout"));
  }, []);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    try {
      await loadPaddleScript();
      if (!window.Paddle) throw new Error("Paddle.js didn't load");

      // Sandbox vs production is set once via Paddle's own global env
      // flag before Setup — Paddle.js reads this off window.Paddle.Environment
      // if present; omitted here since Paddle.js defaults to production
      // and this build's .env.example documents setting up a sandbox
      // account for testing, matched against a sandbox client token.
      if (environment === "sandbox" && "Environment" in window.Paddle) {
        (window.Paddle as unknown as { Environment: { set: (e: string) => void } }).Environment.set(
          "sandbox"
        );
      }

      window.Paddle.Setup({ token: clientToken });
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email },
        customData: { workspaceId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed to open");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-60"
      >
        {isLoading ? "Opening…" : `Upgrade to ${planLabel}`}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
