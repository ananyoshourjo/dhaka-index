import { CalendarDays, CheckCircle2, UserRound, XCircle } from "lucide-react";
import { revalidatePath } from "next/cache";

import { DeleteUserButton } from "@/app/delete-user-button";
import { requireAdmin } from "@/app/lib/session";
import {
  deleteRegisteredUser,
  getRegisteredUsers,
} from "@/app/lib/users";

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

async function deleteUserAction(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId || userId === admin.id) {
    throw new Error("Invalid user deletion.");
  }

  const result = deleteRegisteredUser(userId);

  if (result.changes !== 1) {
    throw new Error("User not found.");
  }

  revalidatePath("/");
}

export default async function AdminPortalPage() {
  const admin = await requireAdmin();

  const users = getRegisteredUsers();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-24 pt-5 sm:px-6 sm:py-8">
      <section className="rounded-xl border bg-card text-card-foreground">
        <div>
          {users.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <UserRound className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-semibold">No registered users yet</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Users will appear here as soon as they sign up through the main Dhaka Index app.
              </p>
            </div>
          ) : (
            <>
            <div className="divide-y sm:hidden">
              {users.map((user) => (
                <article className="p-4" key={user.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-foreground">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{user.name}</p>
                        {user.emailVerified ? (
                          <CheckCircle2 className="size-4 shrink-0" aria-label="Verified" />
                        ) : (
                          <XCircle className="size-4 shrink-0 text-muted-foreground" aria-label="Unverified" />
                        )}
                      </div>
                      <a
                        className="block truncate text-sm text-muted-foreground"
                        href={`mailto:${user.email}`}
                      >
                        {user.email}
                      </a>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Saved</dt>
                      <dd className="mt-1 font-semibold">{user.savedJobs}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Archived</dt>
                      <dd className="mt-1 font-semibold">{user.archivedJobs}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Sessions</dt>
                      <dd className="mt-1 font-semibold">{user.sessionCount}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Joined {formatDate(user.createdAt)}
                  </p>
                  <div className="mt-4 border-t pt-3">
                    <DeleteUserButton
                      action={deleteUserAction}
                      disabled={user.id === admin.id}
                      userId={user.id}
                      userName={user.name}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Saved</th>
                  <th className="px-5 py-3 font-medium">Archived</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
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
                    <td className="px-5 py-4">
                      <DeleteUserButton
                        action={deleteUserAction}
                        disabled={user.id === admin.id}
                        userId={user.id}
                        userName={user.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
