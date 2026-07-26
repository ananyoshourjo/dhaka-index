import { CalendarDays, CheckCircle2, UserRound, XCircle } from "lucide-react";

import { requireAdmin } from "@/app/lib/session";
import { getRegisteredUsers } from "@/app/lib/users";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

export default async function AdminPortalPage() {
  await requireAdmin();

  const users = getRegisteredUsers();
  const verifiedCount = users.filter((user) => user.emailVerified).length;
  const activeSessionCount = users.reduce((total, user) => total + user.sessionCount, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Admin Portal</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Registered users
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            View all accounts registered through the Dhaka Index app.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 text-card-foreground">
            <p className="text-sm text-muted-foreground">Users</p>
            <p className="mt-2 text-2xl font-semibold">{users.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-card-foreground">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="mt-2 text-2xl font-semibold">{verifiedCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-card-foreground">
            <p className="text-sm text-muted-foreground">Active sessions</p>
            <p className="mt-2 text-2xl font-semibold">{activeSessionCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card text-card-foreground">
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <UserRound className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-semibold">No registered users yet</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Users will appear here as soon as they sign up through the main Dhaka Index app.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Saved</th>
                  <th className="px-5 py-3 font-medium">Archived</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-b last:border-b-0" key={user.id}>
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-foreground">
                          {user.avatarUrl ? (
                            <span
                              aria-hidden="true"
                              className="size-full bg-cover bg-center"
                              style={{
                                backgroundImage: `url("${user.avatarUrl}")`,
                              }}
                            />
                          ) : (
                            user.name.trim().charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <a className="font-medium hover:underline" href={`mailto:${user.email}`}>
                        {user.email}
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          <XCircle className="size-3.5" aria-hidden="true" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono">{user.savedJobs}</td>
                    <td className="px-5 py-4 font-mono">{user.archivedJobs}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
