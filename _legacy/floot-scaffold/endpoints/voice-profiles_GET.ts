import superjson from "superjson";
import { db } from "../helpers/db";
import type { OutputType } from "./voice-profiles_GET.schema";

export async function handle(_request: Request) {
  try {
    const rows = await db.selectFrom("voiceProfiles")
      .selectAll()
      .orderBy("createdAt", "desc")
      .execute();
    return new Response(superjson.stringify({ profiles: rows } satisfies OutputType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load voice profiles.";
    return new Response(superjson.stringify({ error: message }), { status: 500 });
  }
}