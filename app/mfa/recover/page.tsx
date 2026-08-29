import Link from "next/link";
import { RecoverForm } from "@/components/mfa/recover-form";

export default function MfaRecoverPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Reset two-factor authentication
      </h1>
      <p className="mb-6 text-sm text-slate">
        Enter one of the recovery codes you saved when you enrolled.
      </p>
      <RecoverForm />
      <p className="mt-6 text-center text-sm text-slate">
        <Link href="/login" className="text-ink hover:underline">
          Back to login
        </Link>
      </p>
    </main>
  );
}
