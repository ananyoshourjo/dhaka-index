import { getUserDataExport } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = `${JSON.stringify(getUserDataExport(session.user.id), null, 2)}\n`;
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="dhaka-index-data-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
