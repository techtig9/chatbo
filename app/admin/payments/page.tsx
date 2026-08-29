import { listAllPayments } from "@/lib/data/admin";

export default async function AdminPaymentsPage() {
  const payments = await listAllPayments();

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">Payments</h1>
      <p className="mb-6 text-sm text-slate">Most recent {payments.length}</p>

      <div className="overflow-hidden rounded-2xl border border-mist bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-mist text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-2">Workspace</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Transaction</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate">
                  No payments yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-mist last:border-0">
                  <td className="px-4 py-2 text-ink">{p.workspaceName}</td>
                  <td className="px-4 py-2 font-mono text-ink">
                    {p.amount !== null ? `$${p.amount.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate">{p.status ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate">
                    {p.paddleTransactionId ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
