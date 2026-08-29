import { MfaVerifyForm } from "@/components/mfa/verify-form";

export default function MfaVerifyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Two-factor verification
      </h1>
      <p className="mb-6 text-sm text-slate">
        Enter the 6-digit code from your authenticator app.
      </p>
      <MfaVerifyForm />
    </main>
  );
}
