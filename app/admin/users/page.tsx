import { listAllUsers } from "@/lib/data/admin";

export default async function AdminUsersPage() {
  const users = await listAllUsers();

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">Users</h1>
      <p className="mb-6 text-sm text-slate">{users.length} total</p>

      <div className="overflow-hidden rounded-2xl border border-mist bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-mist text-xs uppercase tracking-wide text-slate">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-mist last:border-0">
                <td className="px-4 py-2 text-ink">{u.name ?? "—"}</td>
                <td className="px-4 py-2 text-ink">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === "admin" ? "bg-ember/10 text-ember" : "bg-mist text-slate"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
